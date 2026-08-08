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
# AWS Lightsail Instance (Docker Deployment from Docker Hub)
# ----------------------------------------------------------------------------

resource "aws_lightsail_instance" "easy_lims" {
  name              = "easy_lims_lightsail"
  availability_zone = "${var.aws_region}a"
  blueprint_id      = "ubuntu_22_04"
  bundle_id         = var.lightsail_bundle_id

  user_data = <<-EOF
              #!/bin/bash
              export DEBIAN_FRONTEND=noninteractive

              # 1. Enable 1GB Swap Memory to prevent OOM
              if [ ! -f /swapfile ]; then
                fallocate -l 1G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=1024
                chmod 600 /swapfile
                mkswap /swapfile
                swapon /swapfile
                echo '/swapfile none swap sw 0 0' >> /etc/fstab
              fi

              # 2. Install Docker & prerequisites
              apt-get update -y
              apt-get install -y ca-certificates curl gnupg lsb-release
              mkdir -p /etc/apt/keyrings
              curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
              echo \
                "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
                $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

              apt-get update -y
              apt-get install -y docker-ce docker-ce-cli containerd.io

              systemctl enable docker
              systemctl start docker
              usermod -aG docker ubuntu

              # 3. Create deploy script to pull Docker Hub image & start container
              cat <<'DEPLOY_SCRIPT' > /home/ubuntu/deploy.sh
              #!/bin/bash
              set -e

              IMAGE="${var.docker_image}"
              PROJECT_ID="${var.supabase_project_id}"
              DB_PASS="${var.supabase_db_pass}"
              DB_URL="${var.database_url}"

              echo "=== Deploying Easy-LIMS Docker Image from Docker Hub: $IMAGE ==="

              docker pull $IMAGE

              echo "Stopping existing container if running..."
              docker rm -f easy-lims 2>/dev/null || true

              echo "Starting Easy-LIMS container..."
              docker run -d \
                --name easy-lims \
                --restart always \
                -p 8000:8000 \
                -e SUPABASE_PROJECT_ID="$PROJECT_ID" \
                -e SUPABASE_DB_PASS="$DB_PASS" \
                -e DATABASE_URL="$DB_URL" \
                $IMAGE

              echo "Deployment from Docker Hub complete!"
              DEPLOY_SCRIPT

              chmod +x /home/ubuntu/deploy.sh
              chown ubuntu:ubuntu /home/ubuntu/deploy.sh

              # 4. Pull image and start container initial run
              /home/ubuntu/deploy.sh || true

              # 5. Configure systemd service for Docker container management
              cat <<'SERVICE' > /etc/systemd/system/easy-lims.service
              [Unit]
              Description=Easy-LIMS Docker Container Service
              After=docker.service
              Requires=docker.service

              [Service]
              TimeoutStartSec=0
              Restart=always
              ExecStartPre=-/usr/bin/docker rm -f easy-lims
              ExecStart=/usr/bin/docker run --name easy-lims -p 8000:8000 -e SUPABASE_PROJECT_ID=${var.supabase_project_id} -e SUPABASE_DB_PASS=${var.supabase_db_pass} -e DATABASE_URL=${var.database_url} ${var.docker_image}
              ExecStop=/usr/bin/docker stop easy-lims

              [Install]
              WantedBy=multi-user.target
              SERVICE

              systemctl daemon-reload
              systemctl enable easy-lims
              systemctl restart easy-lims
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
    from_port = 8000
    to_port   = 8000
  }

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
  description = "Lightsail Bundle ID (nano_3_0: $3.50/mo, micro_3_0: $5/mo)"
  type        = string
  default     = "nano_3_0" # Absolute lowest cost AWS tier: $3.50/month (512 MB RAM, 1 vCPU, 20 GB SSD)
}

variable "docker_image" {
  description = "Docker Hub image to pull and run"
  type        = string
  default     = "edge2engineering/easy-lims:latest"
}

variable "supabase_project_id" {
  description = "Supabase Project ID"
  type        = string
  default     = ""
}

variable "supabase_db_pass" {
  description = "Supabase Database Password"
  type        = string
  sensitive   = true
  default     = ""
}

variable "database_url" {
  description = "PostgreSQL Database Connection String (optional if SUPABASE_PROJECT_ID and SUPABASE_DB_PASS are set)"
  type        = string
  sensitive   = true
  default     = ""
}

output "lightsail_static_ip" {
  description = "Permanent Static IP Address of the Lightsail Instance"
  value       = aws_lightsail_static_ip.easy_lims_ip.ip_address
}

output "application_url" {
  description = "Application URL"
  value       = "http://${aws_lightsail_static_ip.easy_lims_ip.ip_address}:8000"
}
