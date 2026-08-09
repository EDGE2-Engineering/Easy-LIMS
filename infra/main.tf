terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # backend "s3" {
  #   bucket = "edge2-easy-lims-tfstate"
  #   key    = "database/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region
}

# ----------------------------------------------------------------------------
# VPC Data Source & Security Group
# ----------------------------------------------------------------------------

data "aws_vpc" "default" {
  default = true
}

resource "aws_security_group" "rds_sg" {
  name        = "easy_lims_rds_sg"
  description = "Security group for Easy-LIMS PostgreSQL RDS instance"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "PostgreSQL access from public internet / local laptop"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "EasyLimsRdsSecurityGroup"
  }
}

# ----------------------------------------------------------------------------
# AWS RDS PostgreSQL Instance (Graviton2 db.t4g.micro, Single-AZ, gp2)
# ----------------------------------------------------------------------------

resource "aws_db_instance" "postgres" {
  identifier          = "easy-lims-db"
  engine              = "postgres"
  engine_version      = "18.3"
  instance_class      = "db.t4g.micro" # AWS Graviton2 (2 vCPU, 1 GiB RAM)
  allocated_storage   = 20             # 20 GiB
  storage_type        = "gp2"          # General Purpose SSD
  storage_encrypted   = true           # Storage Encryption
  replicate_source_db = null           # Explicitly disable DB replication

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password
  port     = 5432

  multi_az            = false # Single-AZ Deployment
  publicly_accessible = true  # Enable Public Access for local laptop connection
  skip_final_snapshot = true
  deletion_protection = false

  backup_retention_period      = 7     # 7 days automated backups
  performance_insights_enabled = false # Performance Insights: Off
  monitoring_interval          = 0     # Enhanced Monitoring: Off

  vpc_security_group_ids = [aws_security_group.rds_sg.id]

  tags = {
    Name        = "EasyLimsPostgres"
    Environment = "production"
  }
}

# ----------------------------------------------------------------------------
# Variables
# ----------------------------------------------------------------------------

variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "us-east-1"
}

variable "db_name" {
  description = "PostgreSQL Database Name"
  type        = string
  default     = "postgres"
}

variable "db_username" {
  description = "PostgreSQL Master Username"
  type        = string
  default     = "postgres"
}

variable "db_password" {
  description = "PostgreSQL Master Password"
  type        = string
  sensitive   = true
}

# ----------------------------------------------------------------------------
# Outputs
# ----------------------------------------------------------------------------

output "db_instance_endpoint" {
  description = "RDS PostgreSQL Endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "db_instance_address" {
  description = "RDS PostgreSQL Host Address"
  value       = aws_db_instance.postgres.address
}

output "db_instance_port" {
  description = "RDS PostgreSQL Port"
  value       = aws_db_instance.postgres.port
}

output "db_name" {
  description = "RDS Database Name"
  value       = aws_db_instance.postgres.db_name
}

output "database_url" {
  description = "PostgreSQL Connection String"
  value       = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/${var.db_name}"
  sensitive   = true
}
