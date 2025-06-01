#!/bin/bash

# Corporate Information Collection System - Deployment Script
# This script deploys the Cloud Function to Google Cloud Platform

set -e  # Exit on error

# Configuration
PROJECT_ID="${GCP_PROJECT:-your-project-id}"
REGION="${GCP_REGION:-asia-northeast1}"
FUNCTION_NAME="${FUNCTION_NAME:-collect-company-info}"
RUNTIME="python311"
MEMORY="512MB"
TIMEOUT="540s"  # 9 minutes max timeout
MAX_INSTANCES="10"
SERVICE_ACCOUNT="${SERVICE_ACCOUNT:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Corporate Information Collection System - Deployment${NC}"
echo "=================================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo -e "${YELLOW}Warning: Not authenticated with gcloud${NC}"
    echo "Running: gcloud auth login"
    gcloud auth login
fi

# Set project
echo -e "${GREEN}Setting project to: ${PROJECT_ID}${NC}"
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo -e "${GREEN}Enabling required APIs...${NC}"
gcloud services enable cloudfunctions.googleapis.com \
    secretmanager.googleapis.com \
    sheets.googleapis.com \
    cloudbuild.googleapis.com \
    --project=${PROJECT_ID}

# Create secrets if they don't exist
echo -e "${GREEN}Checking secrets...${NC}"

# Check if Tavily API key secret exists
if ! gcloud secrets describe tavily-api-key --project=${PROJECT_ID} &> /dev/null; then
    echo -e "${YELLOW}Creating secret: tavily-api-key${NC}"
    echo -n "Enter your Tavily API key: "
    read -s TAVILY_KEY
    echo
    echo -n "${TAVILY_KEY}" | gcloud secrets create tavily-api-key \
        --data-file=- \
        --project=${PROJECT_ID}
else
    echo "Secret 'tavily-api-key' already exists"
fi

# Check if OpenAI API key secret exists
if ! gcloud secrets describe openai-api-key --project=${PROJECT_ID} &> /dev/null; then
    echo -e "${YELLOW}Creating secret: openai-api-key${NC}"
    echo -n "Enter your OpenAI API key: "
    read -s OPENAI_KEY
    echo
    echo -n "${OPENAI_KEY}" | gcloud secrets create openai-api-key \
        --data-file=- \
        --project=${PROJECT_ID}
else
    echo "Secret 'openai-api-key' already exists"
fi

# Grant secret access to service account
if [ ! -z "${SERVICE_ACCOUNT}" ]; then
    echo -e "${GREEN}Granting secret access to service account...${NC}"
    gcloud secrets add-iam-policy-binding tavily-api-key \
        --member="serviceAccount:${SERVICE_ACCOUNT}" \
        --role="roles/secretmanager.secretAccessor" \
        --project=${PROJECT_ID}
    
    gcloud secrets add-iam-policy-binding openai-api-key \
        --member="serviceAccount:${SERVICE_ACCOUNT}" \
        --role="roles/secretmanager.secretAccessor" \
        --project=${PROJECT_ID}
fi

# Deploy the main function
echo -e "${GREEN}Deploying main function: ${FUNCTION_NAME}${NC}"

DEPLOY_CMD="gcloud functions deploy ${FUNCTION_NAME} \
    --gen2 \
    --runtime=${RUNTIME} \
    --region=${REGION} \
    --source=. \
    --entry-point=collect_company_info \
    --trigger-http \
    --allow-unauthenticated \
    --memory=${MEMORY} \
    --timeout=${TIMEOUT} \
    --max-instances=${MAX_INSTANCES} \
    --set-env-vars GCP_PROJECT=${PROJECT_ID},GCP_REGION=${REGION}"

# Add service account if specified
if [ ! -z "${SERVICE_ACCOUNT}" ]; then
    DEPLOY_CMD="${DEPLOY_CMD} --service-account=${SERVICE_ACCOUNT}"
fi

echo "Executing: ${DEPLOY_CMD}"
eval ${DEPLOY_CMD}

# Deploy the health check function
echo -e "${GREEN}Deploying health check function...${NC}"
gcloud functions deploy ${FUNCTION_NAME}-health \
    --gen2 \
    --runtime=${RUNTIME} \
    --region=${REGION} \
    --source=. \
    --entry-point=health_check \
    --trigger-http \
    --allow-unauthenticated \
    --memory=128MB \
    --timeout=60s \
    --max-instances=3

# Get function URLs
echo -e "${GREEN}Deployment completed!${NC}"
echo "=================================================="
echo -e "${GREEN}Function URLs:${NC}"

MAIN_URL=$(gcloud functions describe ${FUNCTION_NAME} \
    --gen2 \
    --region=${REGION} \
    --format="value(serviceConfig.uri)")

HEALTH_URL=$(gcloud functions describe ${FUNCTION_NAME}-health \
    --gen2 \
    --region=${REGION} \
    --format="value(serviceConfig.uri)")

echo "Main function: ${MAIN_URL}"
echo "Health check: ${HEALTH_URL}"

# Test the deployment
echo -e "${GREEN}Testing health check endpoint...${NC}"
curl -s ${HEALTH_URL} | python3 -m json.tool

echo -e "${GREEN}Deployment successful!${NC}"
echo ""
echo "To test the main function, use:"
echo "curl -X POST ${MAIN_URL} \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"spreadsheet_id\": \"your-sheet-id\","
echo "    \"input_range\": \"Sheet1!A2:A\","
echo "    \"output_range\": \"Sheet1!B2:M\""
echo "  }'"