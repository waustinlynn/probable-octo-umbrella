import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import * as fs from "fs";
import * as path from "path";
import { AudioStreamApp } from "./app";
import { WebSocketServer } from "./websocket/WebSocketServer";
import { config } from "./config/config";

const PROTO_PATH = path.join(__dirname, "../proto/audio.proto");
const AUDIO_DIR = path.join(__dirname, "../audio_files");
const UPLOAD_DIR = path.join(__dirname, "../uploads");

// Ensure directories exist
[AUDIO_DIR, UPLOAD_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Load proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const audioProto: any = grpc.loadPackageDefinition(packageDefinition);

// Store active sessions
const activeSessions: Map<
  string,
  { file: fs.WriteStream; startTime: number }
> = new Map();

// Implement AudioService
const audioServiceImplementation = {
  streamAudio: (call: any) => {
    let sessionId = "";

    call.on("data", (chunk: any) => {
      try {
        sessionId = chunk.session_id;

        // Create or get write stream for this session
        if (!activeSessions.has(sessionId)) {
          const filename = `audio_${sessionId}_${Date.now()}.pcm`;
          const filepath = path.join(AUDIO_DIR, filename);
          const writeStream = fs.createWriteStream(filepath);
          activeSessions.set(sessionId, {
            file: writeStream,
            startTime: Date.now(),
          });
          console.log(`[Session ${sessionId}] Started recording to ${filename}`);
        }

        const session = activeSessions.get(sessionId)!;
        session.file.write(chunk.audio_data);

        // Send acknowledgment
        call.write({
          session_id: sessionId,
          success: true,
          message: `Received ${chunk.audio_data.length} bytes`,
        });
      } catch (error) {
        console.error(`Error processing audio chunk: ${error}`);
        call.write({
          session_id: sessionId,
          success: false,
          message: `Error: ${error}`,
        });
      }
    });

    call.on("end", () => {
      if (sessionId && activeSessions.has(sessionId)) {
        const session = activeSessions.get(sessionId)!;
        session.file.end();
        const duration = ((Date.now() - session.startTime) / 1000).toFixed(2);
        console.log(
          `[Session ${sessionId}] Ended recording. Duration: ${duration}s`
        );
        activeSessions.delete(sessionId);
      }
      call.end();
    });

    call.on("error", (error: any) => {
      console.error(`Stream error: ${error}`);
      if (sessionId && activeSessions.has(sessionId)) {
        const session = activeSessions.get(sessionId)!;
        session.file.destroy();
        activeSessions.delete(sessionId);
      }
    });
  },
};

// Create and start gRPC server
const grpcServer = new grpc.Server();

grpcServer.addService(audioProto.audio.AudioService.service, audioServiceImplementation);

const GRPC_PORT = 50051;
grpcServer.bindAsync(
  `0.0.0.0:${GRPC_PORT}`,
  grpc.ServerCredentials.createInsecure(),
  (error, port) => {
    if (error) {
      console.error("Failed to bind gRPC server:", error);
      process.exit(1);
    }
    console.log(`gRPC Server running at 0.0.0.0:${port}`);
  }
);

// Create and start HTTP server
const audioApp = new AudioStreamApp({ uploadDir: UPLOAD_DIR });
const HTTP_PORT = config.server.http.port;
audioApp.getExpressApp().listen(HTTP_PORT, () => {
  console.log(`HTTP Server running at http://0.0.0.0:${HTTP_PORT}`);
});

// Create and start WebSocket server
const wsServer = new WebSocketServer();
wsServer.start().catch((error) => {
  console.error("Failed to start WebSocket server:", error);
  process.exit(1);
});
