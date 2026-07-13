.PHONY: init plan deploy destroy


export AWS_ACCESS_KEY_ID=AKIA...
export AWS_SECRET_ACCESS_KEY=...
export AWS_REGION=us-east-1


init:
	terraform init

plan:
	terraform plan

deploy: init
	terraform apply -auto-approve

destroy: init
	terraform destroy -auto-approve
