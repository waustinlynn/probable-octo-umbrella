# Azure Container Registry Outputs
output "container_registry_login_server" {
  description = "Container Registry login server"
  value       = azurerm_container_registry.main.login_server
}

output "container_registry_id" {
  description = "Container Registry ID"
  value       = azurerm_container_registry.main.id
}

output "container_registry_admin_username" {
  description = "Container Registry admin username"
  value       = azurerm_container_registry.main.admin_username
  sensitive   = true
}

output "container_registry_admin_password" {
  description = "Container Registry admin password"
  value       = azurerm_container_registry.main.admin_password
  sensitive   = true
}

# Container Apps Environment Outputs
output "container_app_environment_id" {
  description = "Container Apps Environment ID"
  value       = azurerm_container_app_environment.main.id
}

output "container_app_environment_name" {
  description = "Container Apps Environment name"
  value       = azurerm_container_app_environment.main.name
}

# gRPC Server Container App Outputs
output "server_container_app_fqdn" {
  description = "gRPC server fully qualified domain name"
  value       = azurerm_container_app.server.ingress[0].fqdn
}

output "server_container_app_id" {
  description = "gRPC server Container App ID"
  value       = azurerm_container_app.server.id
}

output "server_container_app_name" {
  description = "gRPC server Container App name"
  value       = azurerm_container_app.server.name
}

# Resource Group Outputs
output "resource_group_name" {
  description = "Resource Group name"
  value       = azurerm_resource_group.main.name
}

output "resource_group_id" {
  description = "Resource Group ID"
  value       = azurerm_resource_group.main.id
}

# Virtual Network Outputs
output "virtual_network_id" {
  description = "Virtual Network ID"
  value       = azurerm_virtual_network.main.id
}

output "virtual_network_name" {
  description = "Virtual Network name"
  value       = azurerm_virtual_network.main.name
}

# Environment and region info
output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "azure_region" {
  description = "Azure region"
  value       = var.azure_region
}
