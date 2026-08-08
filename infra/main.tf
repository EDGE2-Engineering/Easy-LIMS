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
  #   key    = "all-infra/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region
}

# ----------------------------------------------------------------------------
# AWS Lightsail Instance (Docker & Caddy Setup)
# ----------------------------------------------------------------------------

resource "aws_lightsail_instance" "easy_lims" {
  name              = "easy_lims_lightsail"
  availability_zone = "${var.aws_region}a"
  blueprint_id      = "ubuntu_22_04"
  bundle_id         = var.lightsail_bundle_id

  user_data = <<-EOF
              #!/bin/bash
              export DEBIAN_FRONTEND=noninteractive
              apt-get update -y
              apt-get install -y docker.io docker-compose-v2 git

              # Enable 1GB Swap Memory to prevent OOM
              if [ ! -f /swapfile ]; then
                fallocate -l 1G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=1024
                chmod 600 /swapfile
                mkswap /swapfile
                swapon /swapfile
                echo '/swapfile none swap sw 0 0' >> /etc/fstab
              fi

              # Start & Enable Docker
              systemctl enable docker
              systemctl start docker
              usermod -aG docker ubuntu || true

              # Clone application repository
              mkdir -p /opt/easy-lims
              cd /opt/easy-lims

              if [ ! -d "/opt/easy-lims/app/.git" ]; then
                rm -rf /opt/easy-lims/app
                git clone ${var.git_repo_url} /opt/easy-lims/app
              fi

              cd /opt/easy-lims/app
              git pull origin main || true

              # Environment Setup
              echo "DATABASE_URL='${var.database_url}'" > /opt/easy-lims/app/.env

              # Launch Docker Compose (FastAPI + Caddy)
              docker compose up -d --build || true
              EOF

  tags = {
    Name = "EasyLimsLightsail"
  }
}

# ----------------------------------------------------------------------------
# AWS Lightsail Static IP (Permanent Fixed IP)
# ----------------------------------------------------------------------------

resource "aws_lightsail_static_ip" "easy_lims_ip" {
  name = "easy_lims_static_ip"
}

resource "aws_lightsail_static_ip_attachment" "easy_lims_ip_attach" {
  static_ip_name = aws_lightsail_static_ip.easy_lims_ip.id
  instance_name  = aws_lightsail_instance.easy_lims.id
}

# ----------------------------------------------------------------------------
# AWS Lightsail Public Ports Firewall Rules
# ----------------------------------------------------------------------------

resource "aws_lightsail_instance_public_ports" "easy_lims_ports" {
  instance_name = aws_lightsail_instance.easy_lims.name

  port_info {
    protocol  = "tcp"
    from_port = 80
    to_port   = 80
  }

  port_info {
    protocol  = "tcp"
    from_port = 443
    to_port   = 443
  }

  port_info {
    protocol  = "tcp"
    from_port = 8000
    to_port   = 8000
  }

  port_info {
    protocol  = "tcp"
    from_port = 22
    to_port   = 22
  }
}

# ----------------------------------------------------------------------------
# Variables and Outputs
# ----------------------------------------------------------------------------

variable "aws_region" {
  default = "us-east-1"
}

variable "lightsail_bundle_id" {
  description = "Lightsail Bundle ID (nano_3_0, micro_3_0, small_3_0, medium_3_0)"
  type        = string
  default     = "micro_3_0" # $5/month bundle (1 GB RAM, 1 vCPU, 40 GB SSD)
}

variable "git_repo_url" {
  description = "Git Repository URL to clone application code"
  type        = string
  default     = "https://github.com/EDGE2-Engineering/Easy-LIMS"
}

variable "database_url" {
  description = "PostgreSQL Database Connection String"
  type        = string
  sensitive   = true
  default     = "postgresql://postgres.project_id:password@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"
}

output "lightsail_static_ip" {
  description = "Permanent Static IP Address of the Lightsail Instance"
  value       = aws_lightsail_static_ip.easy_lims_ip.ip_address
}

output "application_url" {
  description = "Application URL"
  value       = "http://${aws_lightsail_static_ip.easy_lims_ip.ip_address}"
}
