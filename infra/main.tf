terraform {

  required_version = ">= 1.5.0"

  required_providers {

    aws = {

      source  = "hashicorp/aws"

      version = "~> 6.0"

    }

    random = {

      source  = "hashicorp/random"

      version = "~> 3.7"

    }

  }

  backend "s3" {
    bucket = "terraform-states"
    key    = "all-infra/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {

  region = var.aws_region

}

resource "random_password" "db_password" {

  length  = 24

  special = false

}

resource "aws_db_instance" "postgres" {

  identifier = "postgres-main"

  engine         = "postgres"

  engine_version = "17.5"

  instance_class = "db.t4g.micro"

  allocated_storage     = 20

  max_allocated_storage = 100

  storage_type          = "gp3"

  db_name  = "postgres"

  username = var.db_username

  password = random_password.db_password.result

  publicly_accessible = true

  multi_az = false

  backup_retention_period = 7

  storage_encrypted = true

  skip_final_snapshot = true

  deletion_protection = false

  auto_minor_version_upgrade = true

  performance_insights_enabled = false

  apply_immediately = true

  tags = {

    Name        = "postgres-main"

    Environment = "dev"

  }

}

variable "aws_region" {

  default = "us-east-2"

}

variable "db_username" {

  default = "postgres"

}

output "endpoint" {

  value = aws_db_instance.postgres.endpoint

}

output "database_name" {

  value = aws_db_instance.postgres.db_name

}

output "username" {

  value = aws_db_instance.postgres.username

}

output "password" {

  value     = random_password.db_password.result

  sensitive = true

}
