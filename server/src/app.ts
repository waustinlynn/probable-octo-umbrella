import express, { Express, Request, Response } from "express";
import multer, { Multer } from "multer";
import * as fs from "fs";
import * as path from "path";

export interface AppConfig {
  uploadDir: string;
}

export class AudioStreamApp {
  private app: Express;
  private upload: Multer;
  private uploadDir: string;

  constructor(config: AppConfig) {
    this.app = express();
    this.uploadDir = config.uploadDir;
    this.upload = multer({ dest: this.uploadDir });

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get("/health", (_req: Request, res: Response) => {
      res.json({ status: "ok" });
    });

    // Audio upload endpoint
    this.app.post(
      "/upload-audio",
      this.upload.single("audioFile"),
      (req: Request, res: Response) => {
        try {
          const { sessionId } = req.body;

          if (!sessionId) {
            return res.status(400).json({ error: "Missing sessionId" });
          }

          if (!req.file) {
            return res.status(400).json({ error: "No audio file provided" });
          }

          // Rename uploaded file
          const filename = `audio_${sessionId}_${Date.now()}.wav`;
          const newPath = path.join(this.uploadDir, filename);
          fs.renameSync(req.file.path, newPath);

          console.log(
            `[Session ${sessionId}] Audio file uploaded: ${filename}`
          );

          res.json({
            success: true,
            message: "Audio uploaded successfully",
            filename,
            sessionId,
          });
        } catch (error) {
          console.error("Upload error:", error);
          res.status(500).json({ error: "Failed to process upload" });
        }
      }
    );
  }

  getExpressApp(): Express {
    return this.app;
  }

  /**
   * List uploaded audio files for a session
   */
  getUploadedFiles(sessionId?: string): string[] {
    try {
      if (!fs.existsSync(this.uploadDir)) {
        return [];
      }

      const files = fs.readdirSync(this.uploadDir);
      if (sessionId) {
        return files.filter((f) => f.includes(sessionId));
      }
      return files;
    } catch (error) {
      console.error("Error reading upload directory:", error);
      return [];
    }
  }

  /**
   * Get file info
   */
  getFileInfo(filename: string): { size: number; mtime: Date } | null {
    try {
      const filepath = path.join(this.uploadDir, filename);
      if (!fs.existsSync(filepath)) {
        return null;
      }
      const stats = fs.statSync(filepath);
      return {
        size: stats.size,
        mtime: stats.mtime,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Clean up uploaded files (useful for testing)
   */
  cleanup(): void {
    try {
      if (fs.existsSync(this.uploadDir)) {
        const files = fs.readdirSync(this.uploadDir);
        for (const file of files) {
          fs.unlinkSync(path.join(this.uploadDir, file));
        }
      }
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }
}
