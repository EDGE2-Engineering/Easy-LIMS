# Makefile for managing infrastructure resources

.PHONY: help init plan apply destroy validate

# Default target
help:
	@echo "Available targets:"
	@echo "  make init     - Initialize Terraform"
	@echo "  make plan     - Show execution plan"
	@echo "  make deploy   - Apply changes (auto-approve)"
	@echo "  make destroy  - Destroy resources (auto-approve)"
	@echo "  make validate - Validate HCL syntax"

# Initialize Terraform
init:
	terraform init

# Show execution plan
plan: init
	terraform plan

# Apply changes
deploy: init
	terraform apply -auto-approve

# Destroy resources
destroy: init
	terraform destroy -auto-approve

# Validate syntax
validate: init
	terraform validate
