terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  # Configure for remote state management in Azure
  #
  # The 'key' parameter differentiates between state files:
  # - language-dev.tfstate     (dev environment)
  # - language-staging.tfstate (staging environment)
  # - language-prod.tfstate    (production environment)
  #
  # The key is set dynamically via terraform init -backend-config flags:
  #
  # terraform init \
  #   -backend-config="resource_group_name=language-terraform-state" \
  #   -backend-config="storage_account_name=languageterraformstate" \
  #   -backend-config="container_name=terraform-state" \
  #   -backend-config="key=language-{ENVIRONMENT}.tfstate"
  #
  # This allows the same Terraform configuration to target different environments
  # with completely isolated state files and locking.
  #
  # The GitHub Actions workflow automatically sets the correct key:
  # -backend-config="key=language-${{ github.event.inputs.environment }}.tfstate"
  #
  # For local development, always specify the key explicitly:
  # terraform init -backend-config="key=language-dev.tfstate"
  #
  backend "azurerm" {
    # These values are set via terraform init -backend-config flags
    # Do NOT hardcode values here - they are environment-specific
  }
}

provider "azurerm" {
  features {
    container_app {
      block_public_ingress = false
    }
  }

  subscription_id = var.azure_subscription_id
}

terraform {
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}
