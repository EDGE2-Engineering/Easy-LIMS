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
# AWS Lightsail Instance (Cheapest $3.50/mo Tier with Node.js 22 LTS)
# ----------------------------------------------------------------------------

resource "aws_lightsail_instance" "easy_lims" {
  name              = "easy_lims_lightsail"
  availability_zone = "${var.aws_region}a"
  blueprint_id      = "ubuntu_22_04"
  bundle_id         = var.lightsail_bundle_id

  user_data = <<-EOF
              #!/bin/bash
              # Build Trigger: Fix attachments.map error & set cheapest tier (Commit 7b6051f)
              export DEBIAN_FRONTEND=noninteractive
              export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"

              # 1. Create /home/ubuntu/deploy.sh with flock process protection
              cat <<'DEPLOY_SCRIPT' > /home/ubuntu/deploy.sh
              #!/bin/bash
              set -e
              export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"

              # File lock to prevent concurrent executions
              exec 200>/tmp/deploy.lock
              flock -n 200 || { echo "Deployment script is already running. Exiting concurrent run."; exit 0; }

              # Wait for system package installation (cloud-init) if npm/node is still installing
              while ! command -v npm &> /dev/null; do
                echo "Waiting for Node.js & npm package installation to finish..."
                sleep 5
              done

              BRANCH="$${1:-lightsail}"
              REPO_URL="${var.git_repo_url}"
              APP_DIR="/home/ubuntu/Easy-LIMS"

              echo "=== Deploying Easy-LIMS (Branch: $BRANCH) ==="

              if [ ! -d "$APP_DIR/.git" ]; then
                echo "Cloning repository from $REPO_URL..."
                git clone $REPO_URL $APP_DIR
              fi

              cd $APP_DIR

              echo "Fetching latest changes for branch: $BRANCH..."
              git fetch origin
              git checkout $BRANCH
              git pull origin $BRANCH

              # Ensure server directory exists and update .env
              mkdir -p server
              echo "DATABASE_URL='${var.database_url}'" > server/.env

              # Clean npm cache safely
              rm -rf ~/.npm/_cacache /tmp/npm-* 2>/dev/null || true

              # Build UI frontend directly inside ui/
              if [ -d "ui" ]; then
                echo "Installing UI dependencies and building React frontend in ui/..."
                cd ui
                npm install --no-audit --no-fund
                npm run build
                cd ..
                mkdir -p server/dist
                cp -r ui/dist/* server/dist/ || true
              fi

              # Install Python dependencies and start FastAPI server
              if [ -d "server" ]; then
                echo "Installing Python dependencies in server/..."
                pip3 install -r server/requirements.txt uvicorn --break-system-packages 2>/dev/null || pip3 install -r server/requirements.txt uvicorn || true

                echo "Stopping existing server on port 8000..."
                lsof -ti:8000 | xargs kill -9 2>/dev/null || true

                echo "Launching FastAPI server on http://0.0.0.0:8000..."
                cd server
                python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
              fi
              DEPLOY_SCRIPT

              chmod +x /home/ubuntu/deploy.sh
              chown ubuntu:ubuntu /home/ubuntu/deploy.sh

              # 2. Enable 1GB Swap Memory to prevent OOM on cheapest instance
              if [ ! -f /swapfile ]; then
                fallocate -l 1G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=1024
                chmod 600 /swapfile
                mkswap /swapfile
                swapon /swapfile
                echo '/swapfile none swap sw 0 0' >> /etc/fstab
              fi

              # 3. Install Node.js 22 LTS (NodeSource) and system tools
              apt-get update -y
              apt-get install -y curl ca-certificates gnupg
              mkdir -p /etc/apt/keyrings
              curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
              echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
              apt-get update -y
              apt-get install -y nodejs python3-pip python3-venv git unzip make lsof

              # 4. Run initial deployment as ubuntu user for lightsail branch
              su - ubuntu -c "/home/ubuntu/deploy.sh lightsail" || true

              # 5. Setup systemd service for automatic startup on boot
              cat <<'SERVICE' > /etc/systemd/system/easy-lims.service
              [Unit]
              Description=Easy-LIMS Application Service
              After=network.target

              [Service]
              User=ubuntu
              WorkingDirectory=/home/ubuntu
              ExecStart=/bin/bash /home/ubuntu/deploy.sh lightsail
              Restart=always
              Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

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

variable "git_repo_url" {
  description = "Git Repository URL to clone application code"
  type        = string
  default     = "https://github.com/EDGE2-Engineering/Easy-LIMS.git"
}

variable "database_url" {
  description = "PostgreSQL Database Connection String"
  type        = string
  sensitive   = true
  default     = "postgresql://postgres.igkdjtmcychevvaldkwf:LimasaEdgea@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"
}

output "lightsail_static_ip" {
  description = "Permanent Static IP Address of the Lightsail Instance"
  value       = aws_lightsail_static_ip.easy_lims_ip.ip_address
}

output "application_url" {
  description = "Application URL"
  value       = "http://${aws_lightsail_static_ip.easy_lims_ip.ip_address}:8000"
}
