.PHONY: init plan deploy destroy

init:
	terraform init

plan: init
	terraform plan

deploy: init
	terraform apply -auto-approve

destroy: init
	terraform destroy -auto-approve
