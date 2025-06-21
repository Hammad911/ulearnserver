#!/bin/bash

# AWS ECR Deployment Script for uLearn Backend
# Usage: ./scripts/deploy_aws.sh

set -e  # Exit on any error

# Configuration
AWS_REGION="eu-north-1"
AWS_ACCOUNT_ID="434724191765"
ECR_REPOSITORY="ulearn-backend"
IMAGE_TAG="latest"
CLUSTER_NAME="ulearn-cluster"  # Update this to your actual cluster name
SERVICE_NAME="ulearn-backend"  # Update this to your actual service name

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting AWS ECR Deployment...${NC}"

# Step 1: Build the Docker image
echo -e "${YELLOW}📦 Building Docker image...${NC}"
docker-compose build api

# Step 2: Tag the image for ECR
echo -e "${YELLOW}🏷️  Tagging image for ECR...${NC}"
docker tag chatbot_using_pinecone-api:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:${IMAGE_TAG}

# Step 3: Authenticate with ECR
echo -e "${YELLOW}🔐 Authenticating with ECR...${NC}"
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Step 4: Push to ECR
echo -e "${YELLOW}⬆️  Pushing image to ECR...${NC}"
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:${IMAGE_TAG}

# Step 5: Update ECS Service
echo -e "${YELLOW}🔄 Updating ECS service...${NC}"
aws ecs update-service \
    --cluster ${CLUSTER_NAME} \
    --service ${SERVICE_NAME} \
    --force-new-deployment

# Step 6: Wait for deployment to complete
echo -e "${YELLOW}⏳ Waiting for deployment to complete...${NC}"
aws ecs wait services-stable \
    --cluster ${CLUSTER_NAME} \
    --services ${SERVICE_NAME}

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"

# Step 7: Show service status
echo -e "${YELLOW}📊 Current service status:${NC}"
aws ecs describe-services \
    --cluster ${CLUSTER_NAME} \
    --services ${SERVICE_NAME} \
    --query 'services[0].{Status:status,RunningCount:runningCount,DesiredCount:desiredCount}' \
    --output table 