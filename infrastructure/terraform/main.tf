# Resource Group
resource "azurerm_resource_group" "main" {
  name       = var.resource_group_name
  location   = var.azure_region

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      ManagedBy   = "Terraform"
      Project     = var.app_name
    }
  )
}

# Azure Container Registry
resource "azurerm_container_registry" "main" {
  name                = var.container_registry_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Standard"
  admin_enabled       = true

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  )
}

# Virtual Network for Container Apps
resource "azurerm_virtual_network" "main" {
  name                = "${var.app_name}-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  tags = merge(
    var.tags,
    {
      Environment = var.environment
    }
  )
}

# Subnet for Container Apps Environment
resource "azurerm_subnet" "container_apps" {
  name                 = "${var.app_name}-subnet-ca"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}

# Log Analytics Workspace (required for Container Apps)
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.app_name}-logs"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = merge(
    var.tags,
    {
      Environment = var.environment
    }
  )
}

# Container Apps Environment
resource "azurerm_container_app_environment" "main" {
  name                           = "${var.app_name}-${var.environment}-cae"
  location                       = azurerm_resource_group.main.location
  resource_group_name            = azurerm_resource_group.main.name
  log_analytics_workspace_id     = azurerm_log_analytics_workspace.main.id
  infrastructure_subnet_id       = azurerm_subnet.container_apps.id
  internal_load_balancer_enabled = false

  tags = merge(
    var.tags,
    {
      Environment = var.environment
    }
  )
}

# Container App for gRPC Server
resource "azurerm_container_app" "server" {
  name                         = "${var.app_name}-server"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"

  template {
    container {
      name   = "server"
      image  = var.server_image
      cpu    = var.server_cpu
      memory = var.server_memory

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      env {
        name  = "PORT"
        value = var.server_port
      }
    }

    min_replicas = var.server_replicas
    max_replicas = 10
  }

  ingress {
    allow_insecure_connections = true
    external_enabled           = true
    target_port                = var.server_port
    transport                  = "tcp"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      Service     = "grpc-server"
    }
  )
}

# Network Security Group
resource "azurerm_network_security_group" "container_apps" {
  name                = "${var.app_name}-nsg"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  security_rule {
    name                       = "AllowGRPCIngress"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = var.server_port
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "AllowOutbound"
    priority                   = 100
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = merge(
    var.tags,
    {
      Environment = var.environment
    }
  )
}

# Associate NSG with subnet
resource "azurerm_subnet_network_security_group_association" "container_apps" {
  subnet_id                 = azurerm_subnet.container_apps.id
  network_security_group_id = azurerm_network_security_group.container_apps.id
}
