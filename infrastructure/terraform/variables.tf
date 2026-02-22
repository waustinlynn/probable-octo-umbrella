variable "azure_subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

variable "azure_region" {
  description = "Azure region"
  type        = string
  default     = "eastus"
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

variable "resource_group_name" {
  description = "Azure Resource Group name"
  type        = string
  default     = "language-rg"
}

variable "container_registry_name" {
  description = "Azure Container Registry name (must be globally unique, alphanumeric only)"
  type        = string
  default     = "languageregistry"
}

variable "server_image" {
  description = "Docker image URI for server (e.g., myregistry.azurecr.io/server:latest)"
  type        = string
}

variable "server_cpu" {
  description = "CPU allocation for server container (in cores)"
  type        = string
  default     = "0.5"
}

variable "server_memory" {
  description = "Memory allocation for server container (in GB)"
  type        = string
  default     = "1.0"
}

variable "server_replicas" {
  description = "Number of server replicas"
  type        = number
  default     = 2
  validation {
    condition     = var.server_replicas >= 1 && var.server_replicas <= 10
    error_message = "Server replicas must be between 1 and 10."
  }
}

variable "server_port" {
  description = "gRPC server port"
  type        = number
  default     = 50051
}

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}
