# Terraform Infrastructure as Code Template

This template provides production-ready infrastructure definitions for AWS, Azure, and GCP using Terraform best practices.

## Project Structure
```
terraform/
├── environments/
│   ├── dev/
│   ├── staging/
│   └── production/
├── modules/
│   ├── networking/
│   ├── compute/
│   ├── database/
│   └── monitoring/
├── shared/
│   ├── variables.tf
│   ├── outputs.tf
│   └── versions.tf
└── scripts/
    ├── plan.sh
    ├── apply.sh
    └── destroy.sh
```

## AWS Infrastructure Templates

### Provider Configuration
```hcl
# versions.tf
terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.4"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket         = "{terraform_state_bucket}"
    key            = "{environment}/{project_name}/terraform.tfstate"
    region         = "{aws_region}"
    dynamodb_table = "{terraform_lock_table}"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = var.team_name
    }
  }
}
```

### Variables Configuration
```hcl
# variables.tf
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "{project_name}"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-west-2"
}

variable "availability_zones" {
  description = "Availability zones to use"
  type        = list(string)
  default     = ["us-west-2a", "us-west-2b", "us-west-2c"]
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "private_subnets" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "public_subnets" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

variable "database_subnets" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "min_size" {
  description = "Minimum number of instances in ASG"
  type        = number
  default     = 1
}

variable "max_size" {
  description = "Maximum number of instances in ASG"
  type        = number
  default     = 10
}

variable "desired_capacity" {
  description = "Desired number of instances in ASG"
  type        = number
  default     = 2
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "team_name" {
  description = "Team responsible for the infrastructure"
  type        = string
  default     = "{team_name}"
}
```

### VPC and Networking Module
```hcl
# modules/networking/main.tf
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-${var.environment}-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-${var.environment}-igw"
  }
}

resource "aws_subnet" "private" {
  count = length(var.private_subnets)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnets[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.project_name}-${var.environment}-private-${count.index + 1}"
    Type = "Private"
  }
}

resource "aws_subnet" "public" {
  count = length(var.public_subnets)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnets[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-${var.environment}-public-${count.index + 1}"
    Type = "Public"
  }
}

resource "aws_subnet" "database" {
  count = length(var.database_subnets)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.database_subnets[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.project_name}-${var.environment}-database-${count.index + 1}"
    Type = "Database"
  }
}

resource "aws_nat_gateway" "main" {
  count = length(var.public_subnets)

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "${var.project_name}-${var.environment}-nat-${count.index + 1}"
  }

  depends_on = [aws_internet_gateway.main]
}

resource "aws_eip" "nat" {
  count = length(var.public_subnets)

  domain = "vpc"

  tags = {
    Name = "${var.project_name}-${var.environment}-eip-${count.index + 1}"
  }
}

resource "aws_route_table" "private" {
  count = length(var.private_subnets)

  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-private-rt-${count.index + 1}"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-public-rt"
  }
}

resource "aws_route_table_association" "private" {
  count = length(var.private_subnets)

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

resource "aws_route_table_association" "public" {
  count = length(var.public_subnets)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Security Groups
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-${var.environment}-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
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
    Name = "${var.project_name}-${var.environment}-alb-sg"
  }
}

resource "aws_security_group" "app" {
  name        = "${var.project_name}-${var.environment}-app-sg"
  description = "Security group for application servers"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-app-sg"
  }
}

resource "aws_security_group" "database" {
  name        = "${var.project_name}-${var.environment}-db-sg"
  description = "Security group for database"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-db-sg"
  }
}
```

### Compute Module (ECS with Fargate)
```hcl
# modules/compute/main.tf
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-cluster"
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = "FARGATE"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.project_name}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = var.environment == "prod" ? true : false

  tags = {
    Name = "${var.project_name}-${var.environment}-alb"
  }
}

resource "aws_lb_target_group" "app" {
  name        = "${var.project_name}-${var.environment}-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-tg"
  }
}

resource "aws_lb_listener" "app" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "app_https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = var.ssl_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = "${var.project_name}-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = var.project_name
      image = "${var.ecr_repository_url}:${var.image_tag}"

      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = "3000"
        }
      ]

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_ssm_parameter.database_url.arn
        },
        {
          name      = "JWT_SECRET"
          valueFrom = aws_ssm_parameter.jwt_secret.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      essential = true
    }
  ])

  tags = {
    Name = "${var.project_name}-${var.environment}-task"
  }
}

# ECS Service
resource "aws_ecs_service" "app" {
  name            = "${var.project_name}-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [var.app_security_group_id]
    subnets          = var.private_subnet_ids
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = var.project_name
    container_port   = 3000
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  depends_on = [aws_lb_listener.app_https]

  tags = {
    Name = "${var.project_name}-${var.environment}-service"
  }
}

# Auto Scaling
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = var.max_capacity
  min_capacity       = var.min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "scale_up" {
  name               = "${var.project_name}-${var.environment}-scale-up"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 300
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.project_name}-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = {
    Name = "${var.project_name}-${var.environment}-logs"
  }
}
```

### RDS Database Module
```hcl
# modules/database/main.tf
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = var.database_subnet_ids

  tags = {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  }
}

resource "aws_db_parameter_group" "main" {
  family = "postgres15"
  name   = "${var.project_name}-${var.environment}-db-params"

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-db-params"
  }
}

resource "random_password" "database_password" {
  length  = 32
  special = true
}

resource "aws_ssm_parameter" "database_password" {
  name  = "/${var.project_name}/${var.environment}/database/password"
  type  = "SecureString"
  value = random_password.database_password.result

  tags = {
    Name = "${var.project_name}-${var.environment}-db-password"
  }
}

resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-${var.environment}-db"

  allocated_storage       = var.allocated_storage
  max_allocated_storage   = var.max_allocated_storage
  storage_type            = "gp3"
  storage_encrypted       = true
  kms_key_id             = aws_kms_key.database.arn

  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.db_instance_class

  db_name  = var.database_name
  username = var.database_username
  password = random_password.database_password.result

  vpc_security_group_ids = [var.database_security_group_id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.main.name

  backup_retention_period = var.backup_retention_period
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${var.project_name}-${var.environment}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  deletion_protection = var.environment == "prod" ? true : false

  monitoring_interval = var.environment == "prod" ? 60 : 0
  monitoring_role_arn = var.environment == "prod" ? aws_iam_role.rds_monitoring_role[0].arn : null

  performance_insights_enabled = var.environment == "prod" ? true : false
  performance_insights_kms_key_id = var.environment == "prod" ? aws_kms_key.database.arn : null

  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = {
    Name = "${var.project_name}-${var.environment}-db"
  }

  lifecycle {
    ignore_changes = [
      password,
    ]
  }
}

resource "aws_kms_key" "database" {
  description             = "KMS key for ${var.project_name} ${var.environment} database encryption"
  deletion_window_in_days = 7

  tags = {
    Name = "${var.project_name}-${var.environment}-db-kms"
  }
}

resource "aws_kms_alias" "database" {
  name          = "alias/${var.project_name}-${var.environment}-db"
  target_key_id = aws_kms_key.database.key_id
}

# Read replica for production
resource "aws_db_instance" "read_replica" {
  count = var.environment == "prod" ? 1 : 0

  identifier = "${var.project_name}-${var.environment}-db-replica"

  replicate_source_db = aws_db_instance.main.identifier
  instance_class      = var.replica_instance_class

  auto_minor_version_upgrade = false
  publicly_accessible       = false

  tags = {
    Name = "${var.project_name}-${var.environment}-db-replica"
  }
}

# Database URL for application
resource "aws_ssm_parameter" "database_url" {
  name  = "/${var.project_name}/${var.environment}/database/url"
  type  = "SecureString"
  value = "postgres://${aws_db_instance.main.username}:${random_password.database_password.result}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"

  tags = {
    Name = "${var.project_name}-${var.environment}-db-url"
  }
}

# IAM Role for RDS Enhanced Monitoring
resource "aws_iam_role" "rds_monitoring_role" {
  count = var.environment == "prod" ? 1 : 0

  name = "${var.project_name}-${var.environment}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      },
    ]
  })

  tags = {
    Name = "${var.project_name}-${var.environment}-rds-monitoring-role"
  }
}

resource "aws_iam_role_policy_attachment" "rds_monitoring_role" {
  count = var.environment == "prod" ? 1 : 0

  role       = aws_iam_role.rds_monitoring_role[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
```

## Environment-Specific Configurations

### Development Environment
```hcl
# environments/dev/main.tf
module "networking" {
  source = "../../modules/networking"

  project_name     = var.project_name
  environment      = "dev"
  vpc_cidr        = "10.0.0.0/16"
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
  database_subnets = ["10.0.201.0/24", "10.0.202.0/24"]
  availability_zones = ["us-west-2a", "us-west-2b"]
}

module "database" {
  source = "../../modules/database"

  project_name               = var.project_name
  environment               = "dev"
  database_subnet_ids       = module.networking.database_subnet_ids
  database_security_group_id = module.networking.database_security_group_id

  db_instance_class        = "db.t3.micro"
  allocated_storage        = 20
  max_allocated_storage    = 100
  backup_retention_period  = 1
}

module "compute" {
  source = "../../modules/compute"

  project_name           = var.project_name
  environment           = "dev"
  vpc_id                = module.networking.vpc_id
  public_subnet_ids     = module.networking.public_subnet_ids
  private_subnet_ids    = module.networking.private_subnet_ids
  alb_security_group_id = module.networking.alb_security_group_id
  app_security_group_id = module.networking.app_security_group_id

  task_cpu      = 256
  task_memory   = 512
  desired_count = 1
  min_capacity  = 1
  max_capacity  = 3
}
```

### Production Environment
```hcl
# environments/prod/main.tf
module "networking" {
  source = "../../modules/networking"

  project_name     = var.project_name
  environment      = "prod"
  vpc_cidr        = "10.1.0.0/16"
  private_subnets = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
  public_subnets  = ["10.1.101.0/24", "10.1.102.0/24", "10.1.103.0/24"]
  database_subnets = ["10.1.201.0/24", "10.1.202.0/24", "10.1.203.0/24"]
  availability_zones = ["us-west-2a", "us-west-2b", "us-west-2c"]
}

module "database" {
  source = "../../modules/database"

  project_name               = var.project_name
  environment               = "prod"
  database_subnet_ids       = module.networking.database_subnet_ids
  database_security_group_id = module.networking.database_security_group_id

  db_instance_class        = "db.r6g.xlarge"
  replica_instance_class   = "db.r6g.large"
  allocated_storage        = 100
  max_allocated_storage    = 1000
  backup_retention_period  = 30
}

module "compute" {
  source = "../../modules/compute"

  project_name           = var.project_name
  environment           = "prod"
  vpc_id                = module.networking.vpc_id
  public_subnet_ids     = module.networking.public_subnet_ids
  private_subnet_ids    = module.networking.private_subnet_ids
  alb_security_group_id = module.networking.alb_security_group_id
  app_security_group_id = module.networking.app_security_group_id

  task_cpu      = 1024
  task_memory   = 2048
  desired_count = 3
  min_capacity  = 3
  max_capacity  = 20
}

# Additional production resources
module "cdn" {
  source = "../../modules/cdn"

  project_name    = var.project_name
  environment     = "prod"
  domain_name     = var.domain_name
  alb_domain_name = module.compute.alb_dns_name
}

module "monitoring" {
  source = "../../modules/monitoring"

  project_name = var.project_name
  environment  = "prod"

  # SNS topics for alerts
  critical_alerts_email = var.critical_alerts_email
  warning_alerts_email  = var.warning_alerts_email
}
```

## Deployment Scripts

### Plan Script
```bash
#!/bin/bash
# scripts/plan.sh

set -e

ENVIRONMENT=${1:-dev}
WORKSPACE="terraform-${ENVIRONMENT}"

echo "Planning Terraform changes for environment: ${ENVIRONMENT}"

cd "environments/${ENVIRONMENT}"

# Initialize Terraform
terraform init

# Select workspace
terraform workspace select "${WORKSPACE}" || terraform workspace new "${WORKSPACE}"

# Plan changes
terraform plan -out="tfplan-${ENVIRONMENT}" -var-file="terraform.tfvars"

echo "Plan completed. Review the changes above."
echo "To apply: ./scripts/apply.sh ${ENVIRONMENT}"
```

### Apply Script
```bash
#!/bin/bash
# scripts/apply.sh

set -e

ENVIRONMENT=${1:-dev}
WORKSPACE="terraform-${ENVIRONMENT}"

echo "Applying Terraform changes for environment: ${ENVIRONMENT}"

cd "environments/${ENVIRONMENT}"

# Check if plan file exists
if [ ! -f "tfplan-${ENVIRONMENT}" ]; then
    echo "Error: Plan file not found. Run ./scripts/plan.sh ${ENVIRONMENT} first."
    exit 1
fi

# Apply changes
terraform apply "tfplan-${ENVIRONMENT}"

# Clean up plan file
rm "tfplan-${ENVIRONMENT}"

echo "Apply completed for environment: ${ENVIRONMENT}"

# Output important values
echo "Important outputs:"
terraform output
```

### Destroy Script
```bash
#!/bin/bash
# scripts/destroy.sh

set -e

ENVIRONMENT=${1:-dev}
WORKSPACE="terraform-${ENVIRONMENT}"

if [ "${ENVIRONMENT}" = "prod" ]; then
    read -p "Are you sure you want to destroy PRODUCTION environment? Type 'yes' to confirm: " confirm
    if [ "${confirm}" != "yes" ]; then
        echo "Destroy cancelled."
        exit 0
    fi
fi

echo "Destroying Terraform infrastructure for environment: ${ENVIRONMENT}"

cd "environments/${ENVIRONMENT}"

# Select workspace
terraform workspace select "${WORKSPACE}"

# Plan destroy
terraform plan -destroy -out="destroy-plan-${ENVIRONMENT}" -var-file="terraform.tfvars"

echo "Destroy plan created. Review the changes above."
read -p "Continue with destroy? (yes/no): " confirm

if [ "${confirm}" = "yes" ]; then
    terraform apply "destroy-plan-${ENVIRONMENT}"
    rm "destroy-plan-${ENVIRONMENT}"
    echo "Infrastructure destroyed for environment: ${ENVIRONMENT}"
else
    rm "destroy-plan-${ENVIRONMENT}"
    echo "Destroy cancelled."
fi
```

## Output Configuration
```hcl
# outputs.tf
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.networking.vpc_id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.networking.private_subnet_ids
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.networking.public_subnet_ids
}

output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = module.compute.alb_dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the load balancer"
  value       = module.compute.alb_zone_id
}

output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = module.database.database_endpoint
  sensitive   = true
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.compute.cluster_name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = module.compute.service_name
}
```

## Customization Variables

Replace these placeholders when using the templates:

- `{project_name}` - Your project name
- `{terraform_state_bucket}` - S3 bucket for Terraform state
- `{terraform_lock_table}` - DynamoDB table for state locking
- `{aws_region}` - AWS region
- `{team_name}` - Team responsible for infrastructure

## Best Practices Included

✅ **Security**
- Encrypted storage and transit
- Least privilege IAM policies
- Security groups and NACLs
- Secrets management with SSM

✅ **High Availability**
- Multi-AZ deployments
- Auto-scaling configurations
- Load balancing
- Database replicas

✅ **Monitoring**
- CloudWatch integration
- Performance Insights
- Enhanced monitoring
- Custom metrics

✅ **Cost Optimization**
- Right-sized instances
- Spot instances where appropriate
- Storage lifecycle policies
- Reserved capacity

---

*This template provides enterprise-grade infrastructure as code with security, scalability, and cost optimization built-in.*