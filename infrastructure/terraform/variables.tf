variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "language"
}

variable "cluster_version" {
  description = "Kubernetes cluster version"
  type        = string
  default     = "1.27"
}

variable "cluster_node_count" {
  description = "Number of nodes in cluster"
  type        = number
  default     = 2
  validation {
    condition     = var.cluster_node_count >= 1 && var.cluster_node_count <= 10
    error_message = "Node count must be between 1 and 10."
  }
}

variable "server_image" {
  description = "Docker image for server"
  type        = string
}

variable "client_image" {
  description = "Docker image for client"
  type        = string
}

variable "server_replicas" {
  description = "Number of server replicas"
  type        = number
  default     = 2
}

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}
