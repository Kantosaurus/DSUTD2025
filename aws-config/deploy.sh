#!/bin/bash

# AWS Deployment Script for Webapp with CloudWatch Synthetics
# Run this script after updating the configuration files with your actual values

set -e

echo "🚀 Starting AWS deployment process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if required tools are installed
check_requirements() {
    echo -e "${BLUE}Checking requirements...${NC}"
    
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
        exit 1
    fi
    
    if ! command -v terraform &> /dev/null; then
        echo -e "${RED}Terraform is not installed. Please install it first.${NC}"
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}AWS credentials not configured. Run 'aws configure' first.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ All requirements satisfied${NC}"
}

# Deploy infrastructure with Terraform
deploy_infrastructure() {
    echo -e "${BLUE}Deploying infrastructure with Terraform...${NC}"
    
    cd terraform
    
    if [ ! -f "terraform.tfvars" ]; then
        echo -e "${RED}terraform.tfvars file not found. Please copy from terraform.tfvars.example and fill in your values.${NC}"
        exit 1
    fi
    
    terraform init
    terraform plan
    
    echo -e "${YELLOW}Review the plan above. Do you want to proceed? (y/N)${NC}"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        terraform apply
        echo -e "${GREEN}✓ Infrastructure deployed successfully${NC}"
    else
        echo -e "${YELLOW}Deployment cancelled.${NC}"
        exit 0
    fi
    
    cd ..
}

# Package CloudWatch Synthetics canaries
package_canaries() {
    echo -e "${BLUE}Packaging CloudWatch Synthetics canaries...${NC}"
    
    cd cloudwatch-synthetics
    
    for script in *.js; do
        if [ -f "$script" ]; then
            canary_name=$(basename "$script" .js)
            echo "Packaging ${canary_name}..."
            zip "${canary_name}.zip" "$script"
            echo -e "${GREEN}✓ Packaged ${canary_name}.zip${NC}"
        fi
    done
    
    cd ..
}

# Get infrastructure outputs
get_outputs() {
    echo -e "${BLUE}Getting infrastructure outputs...${NC}"
    
    cd terraform
    
    export RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
    export SNS_TOPIC_ARN=$(terraform output -raw sns_topic_arn)
    export SYNTHETICS_BUCKET=$(terraform output -raw synthetics_bucket_name)
    export NAME_SERVERS=$(terraform output -json route53_name_servers | jq -r '.[]')
    
    cd ..
    
    echo -e "${GREEN}Infrastructure outputs:${NC}"
    echo -e "RDS Endpoint: ${RDS_ENDPOINT}"
    echo -e "SNS Topic: ${SNS_TOPIC_ARN}"
    echo -e "Synthetics Bucket: ${SYNTHETICS_BUCKET}"
    echo -e "Name Servers: ${NAME_SERVERS}"
}

# Update App Runner configurations
update_apprunner_configs() {
    echo -e "${BLUE}Updating App Runner configurations...${NC}"
    
    if [ -z "$RDS_ENDPOINT" ]; then
        echo -e "${RED}RDS endpoint not found. Make sure infrastructure is deployed.${NC}"
        exit 1
    fi
    
    # Update backend config
    sed -i "s/your-rds-endpoint.region.rds.amazonaws.com/${RDS_ENDPOINT}/g" ../backend/apprunner.yaml
    sed -i "s/your-rds-endpoint.region.rds.amazonaws.com/${RDS_ENDPOINT}/g" "../telegram bot/apprunner.yaml"
    
    echo -e "${GREEN}✓ App Runner configurations updated${NC}"
    echo -e "${YELLOW}⚠️  Don't forget to update the frontend NEXT_PUBLIC_API_URL with your actual backend App Runner URL${NC}"
}

# Display next steps
display_next_steps() {
    echo -e "${GREEN}"
    echo "=================================================="
    echo "🎉 Infrastructure deployment completed!"
    echo "=================================================="
    echo -e "${NC}"
    
    echo -e "${BLUE}Next steps:${NC}"
    echo ""
    echo "1. 📋 Update your domain's DNS to use these name servers:"
    echo "$NAME_SERVERS"
    echo ""
    echo "2. 🚀 Deploy App Runner services:"
    echo "   - Go to AWS App Runner console"
    echo "   - Create 3 services (Frontend, Backend, Telegram Bot)"
    echo "   - Connect to your GitHub repository"
    echo "   - Use the apprunner.yaml files in each directory"
    echo ""
    echo "3. 🔧 Update frontend configuration:"
    echo "   - Replace 'your-backend-app.region.awsapprunner.com' with actual backend URL"
    echo "   - Update in frontend/apprunner.yaml"
    echo ""
    echo "4. 🛡️  Deploy CloudWatch Synthetics canaries:"
    echo "   - Upload the .zip files from cloudwatch-synthetics/ directory"
    echo "   - Update domain URLs in the JavaScript files"
    echo "   - Create canaries in AWS console or via Terraform"
    echo ""
    echo "5. 📧 Confirm SNS email subscription:"
    echo "   - Check your email for subscription confirmation"
    echo "   - Click the confirmation link"
    echo ""
    echo "6. 🧪 Test the deployment:"
    echo "   - Visit your domain"
    echo "   - Check all API endpoints work"
    echo "   - Verify monitoring is active"
    echo ""
    echo -e "${YELLOW}💰 Estimated monthly cost: $60-95 USD (within your SGD $250 budget)${NC}"
    echo ""
    echo -e "${GREEN}For detailed instructions, see: AWS-DEPLOYMENT-GUIDE.md${NC}"
}

# Main execution
main() {
    check_requirements
    deploy_infrastructure
    package_canaries
    get_outputs
    update_apprunner_configs
    display_next_steps
}

# Run main function
main "$@"