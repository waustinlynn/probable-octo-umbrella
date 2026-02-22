output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}

output "aws_account_id" {
  description = "AWS account ID"
  value       = data.aws_caller_identity.current.account_id
}

# When EKS cluster is uncommented, add:
# output "cluster_endpoint" {
#   description = "Kubernetes API endpoint"
#   value       = aws_eks_cluster.main.endpoint
# }

# output "cluster_ca_certificate" {
#   description = "Base64 encoded CA certificate"
#   value       = aws_eks_cluster.main.certificate_authority[0].data
#   sensitive   = true
# }

# output "cluster_name" {
#   description = "EKS cluster name"
#   value       = aws_eks_cluster.main.name
# }

# output "cluster_security_group_id" {
#   description = "Security group ID of the cluster"
#   value       = aws_eks_cluster.main.vpc_config[0].security_group_ids[0]
# }
