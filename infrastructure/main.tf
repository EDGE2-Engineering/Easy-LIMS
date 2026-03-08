terraform {
    required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.30"
    }
  }

  backend "s3" {
    bucket         = "edge2-lims-tfstate-bucket"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
  }
}


locals {
  tags = {
    Project = var.project_name
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = local.tags
  }
}

# --- Cognito User Pool ---

resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-UserPool"

  alias_attributes         = ["preferred_username", "email"]
  auto_verified_attributes = ["email"]

  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "admin_only"
      priority = 1
    }
  }

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  schema {
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    name                     = "user_name"
    required                 = false

    string_attribute_constraints {
      min_length = 7
      max_length = 256
    }
  }

  schema {
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    name                     = "role"
    required                 = false

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_message        = "Your verification code is {####}"
    email_subject        = "Verify your email"
  }
}

resource "aws_cognito_user_pool_client" "client" {
  name = "${var.project_name}-Client"

  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret     = false
  explicit_auth_flows = ["ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_SRP_AUTH"]

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_scopes                 = ["phone", "email", "openid", "profile", "aws.cognito.signin.user.admin"]
  callback_urls                        = var.callback_urls
  logout_urls                          = var.logout_urls
  supported_identity_providers         = ["COGNITO"]
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = lower(var.project_name)
  user_pool_id = aws_cognito_user_pool.main.id
  managed_login_version = 2 
}

resource "aws_cognito_managed_login_branding" "branding" {
  user_pool_id = aws_cognito_user_pool.main.id
  client_id    = aws_cognito_user_pool_client.client.id

  use_cognito_provided_values = true
}

resource "aws_cognito_user_pool_ui_customization" "main" {
  client_id    = aws_cognito_user_pool_client.client.id
  user_pool_id = aws_cognito_user_pool.main.id
  css          = ".label-customizable { font-weight: 400; }"
}

resource "aws_cognito_user" "admin_user" {
  user_pool_id = aws_cognito_user_pool.main.id
  username     = "admin"

  attributes = {
    email          = "admin@example.com"
    name           = "Administrator"
    email_verified = true
    "custom:role" = "admin"
  }

  password = var.admin_password

   depends_on = [
    aws_cognito_user_pool.main
  ]
}

resource "aws_cognito_user" "superadmin_user" {
  user_pool_id = aws_cognito_user_pool.main.id
  username     = "superadmin"

  attributes = {
    email          = "superadmin@example.com"
    name           = "Super Admin"  
    email_verified = true
    "custom:role" = "superadmin"
  }

  password = var.superadmin_password
  
   depends_on = [
    aws_cognito_user_pool.main
  ]
}

# --- Cognito Identity Pool ---

resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = "${var.project_name}-Identity-Pool"
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.client.id
    provider_name           = aws_cognito_user_pool.main.endpoint
    server_side_token_check = false
  }
  
}

# --- IAM Roles for Identity Pool ---

resource "aws_iam_role" "authenticated" {
  name = "${var.project_name}-Cognito-Authenticated"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = [
          "sts:AssumeRoleWithWebIdentity",
          "sts:TagSession"
        ]
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "authenticated"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "authenticated" {
  name = "${var.project_name}-Cognito-Authenticated-Policy"
  role = aws_iam_role.authenticated.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "mobileanalytics:PutEvents",
          "cognito-sync:*",
          "cognito-identity:*",
        ]
        Effect   = "Allow"
        Resource = "*"
      },
    ]
  })
}

resource "aws_cognito_identity_pool_roles_attachment" "main" {
  identity_pool_id = aws_cognito_identity_pool.main.id

  roles = {
    authenticated = aws_iam_role.authenticated.arn
  }

  role_mapping {
    identity_provider = "cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}:${aws_cognito_user_pool_client.client.id}"
    type               = "Token"
    ambiguous_role_resolution = "AuthenticatedRole"

  }
}

resource "aws_cognito_identity_pool_provider_principal_tag" "main" {
  identity_pool_id       = aws_cognito_identity_pool.main.id
  identity_provider_name = aws_cognito_user_pool.main.endpoint
  use_defaults           = false
  principal_tags = {
    role = "custom:role"
  }
}

# --- Project IAM Policy ---

resource "aws_iam_policy" "project_access" {
  name        = "${var.project_name}-Access-Policy"
  description = "Project-wide access policy for EDGE2 resources"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "DynamoListAccess"
        Effect   = "Allow"
        Action   = ["dynamodb:ListTables"]
        Resource = "*"
      },
      {
        Sid      = "EDGE2AppsTableAccess"
        Effect   = "Allow"
        Action   = [
          "dynamodb:DescribeTable",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:PartiQLSelect"
        ]
        Resource = "*"
        Condition = {
          "StringEquals" = {
            "aws:ResourceTag/Project" = local.tags["Project"]
          }
        }
      },
      {
        Sid      = "IAMCreateRole"
        Effect   = "Allow"
        Action   = ["iam:CreateRole", "iam:TagRole"]
        Resource = "*"
        Condition = {
          "StringEquals" = {
            "aws:RequestTag/Project" = local.tags["Project"]
          }
        }
      },
      {
        Sid      = "IAMManageTaggedRoles"
        Effect   = "Allow"
        Action   = [
          "iam:GetRole",
          "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies",
          "iam:ListInstanceProfilesForRole",
          "iam:DeleteRole",
          "iam:PutRolePolicy",
          "iam:GetRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:TagRole",
          "iam:UntagRole"
        ]
        Resource = "*"
        Condition = {
          "StringEquals" = {
            "aws:ResourceTag/Project" = local.tags["Project"]
          }
        }
      },
      {
        Sid      = "IAMPassRoleForCognito"
        Effect   = "Allow"
        Action   = "iam:PassRole"
        Resource = "*"
        Condition = {
          "StringEquals" = {
            "aws:ResourceTag/Project" = local.tags["Project"]
          }
        }
      },
      {
        Sid      = "CognitoGlobalRead"
        Effect   = "Allow"
        Action   = ["cognito-idp:DescribeUserPoolDomain", "cognito-idp:ListUserPools"]
        Resource = "*"
      },
      {
        Sid      = "CognitoCreate"
        Effect   = "Allow"
        Action   = [
          "cognito-idp:CreateUserPool",
          "cognito-idp:TagResource",
          "cognito-idp:UntagResource",
          "cognito-identity:CreateIdentityPool",
          "cognito-identity:TagResource",
          "cognito-identity:UntagResource"
        ]
        Resource = "*"
        Condition = {
          "StringEquals" = {
            "aws:RequestTag/Project" = local.tags["Project"]
          }
          "ForAllValues:StringEquals" = {
            "aws:TagKeys" = ["Project"]
          }
        }
      },
      {
        Sid      = "CognitoManageTagged"
        Effect   = "Allow"
        Action   = [
          "cognito-idp:DescribeUserPool",
          "cognito-idp:GetUserPoolMfaConfig",
          "cognito-idp:DeleteUserPool",
          "cognito-idp:CreateUserPoolClient",
          "cognito-idp:DescribeUserPoolClient",
          "cognito-idp:DeleteUserPoolClient",
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminDeleteUser",
          "cognito-idp:AdminSetUserPassword",
          "cognito-idp:AddCustomAttributes",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:UpdateUserPool",
          "cognito-idp:AdminDeleteUserAttributes",
          "cognito-idp:CreateUserPoolDomain",
          "cognito-idp:DeleteUserPoolDomain",
          "cognito-idp:TagResource",
          "cognito-idp:UntagResource",
          "cognito-identity:DescribeIdentityPool",
          "cognito-identity:DeleteIdentityPool",
          "cognito-identity:SetIdentityPoolRoles",
          "cognito-identity:GetIdentityPoolRoles",
          "cognito-identity:GetCredentialsForIdentity",
          "cognito-identity:TagResource",
          "cognito-identity:UntagResource"
        ]
        Resource = "*"
        Condition = {
          "StringEquals" = {
            "aws:ResourceTag/Project" = local.tags["Project"]
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "authenticated_project_access" {
  role       = aws_iam_role.authenticated.name
  policy_arn = aws_iam_policy.project_access.arn
}

# --- DynamoDB Tables ---

resource "aws_dynamodb_table" "data_table" {
  name         = "${var.project_name}-Data"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "type"
    type = "S"
  }

  global_secondary_index {
    name            = "TypeIndex"
    hash_key        = "type"
    range_key       = "id"
    projection_type = "ALL"
  }

  # default_tags will handle Project = "EDGE2"
}

# --- Outputs ---

output "user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "user_pool_client_id" {
  value = aws_cognito_user_pool_client.client.id
}

output "identity_pool_id" {
  value = aws_cognito_identity_pool.main.id
}

output "region" {
  value = var.aws_region
}

output "cognito_domain_prefix" {
  value = aws_cognito_user_pool_domain.main.domain
}
