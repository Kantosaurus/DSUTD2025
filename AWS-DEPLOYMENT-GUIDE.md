# AWS Deployment Guide

Complete setup for deploying your full-stack webapp with CloudWatch Synthetics monitoring.

## 📋 Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured with your credentials
3. **Terraform** installed (v1.0+)
4. **Your domain** ready to transfer DNS to Route 53
5. **SGD $250** budget confirmed

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   App Runner    │    │   App Runner    │    │   App Runner    │
│   (Frontend)    │    │   (Backend)     │    │  (Telegram Bot) │
│   Port: 3000    │    │   Port: 3001    │    │   Port: 3002    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ RDS PostgreSQL  │
                    │  (db.t3.micro)  │
                    └─────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ CloudWatch      │    │   Route 53 +    │    │      SNS        │
│   Synthetics    │    │   CloudFront    │    │    Alerts       │
│  (4 Canaries)   │    │      SSL        │    │   (Email/SMS)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 💰 Cost Breakdown (Monthly)

| Service | Configuration | Cost (USD) |
|---------|---------------|------------|
| App Runner (3 services) | 2 vCPU, 4GB RAM each | ~$60-90 |
| RDS PostgreSQL | db.t3.micro, 20GB | ~$15-20 |
| CloudWatch Synthetics | 4 canaries | ~$8-12 |
| Route 53 | Hosted zone + queries | ~$1-3 |
| CloudFront + S3 | CDN + storage | ~$5-10 |
| **Total** | | **~$89-135 USD** |
| **SGD Equivalent** | | **~$120-180 SGD** |

✅ **Well within your SGD $250 budget**

## 🚀 Deployment Steps

### Step 1: Infrastructure Setup

1. **Copy Terraform configuration**:
   ```bash
   cd aws-config/terraform
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit `terraform.tfvars`**:
   ```hcl
   aws_region = "us-east-1"  # or your preferred region
   app_name = "webapp"
   domain_name = "yourdomain.com"  # YOUR ACTUAL DOMAIN
   db_password = "YourSecurePassword123!"
   notification_email = "your-email@example.com"
   ```

3. **Deploy infrastructure**:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

4. **Update domain DNS**: Point your domain to Route 53 name servers (output from terraform)

### Step 2: App Runner Deployment

1. **Update App Runner configs** with actual endpoints:
   
   In `frontend/apprunner.yaml`:
   ```yaml
   - name: NEXT_PUBLIC_API_URL
     value: https://your-backend-app.region.awsapprunner.com
   ```
   
   In `backend/apprunner.yaml`:
   ```yaml
   - name: DATABASE_URL
     value: postgresql://webapp_user:webapp_password@your-rds-endpoint:5432/webapp_db
   ```
   
   In `telegram bot/apprunner.yaml`:
   ```yaml
   - name: DB_HOST
     value: your-rds-endpoint.region.rds.amazonaws.com
   ```

2. **Deploy services via AWS Console**:
   - Go to App Runner console
   - Create 3 services (Frontend, Backend, Telegram Bot)
   - Connect to your GitHub repository
   - Point to respective directories and `apprunner.yaml` files

### Step 3: CloudWatch Synthetics Setup

1. **Update canary scripts** with your actual domain:
   
   Replace `https://yourdomain.com` and `https://your-backend-app.region.awsapprunner.com` in:
   - `aws-config/cloudwatch-synthetics/visual-defacement-check.js`
   - `aws-config/cloudwatch-synthetics/content-integrity-check.js`
   - `aws-config/cloudwatch-synthetics/api-health-check.js`
   - `aws-config/cloudwatch-synthetics/performance-baseline.js`

2. **Deploy canaries**:
   ```bash
   # Zip each canary script
   cd aws-config/cloudwatch-synthetics
   zip visual-defacement-check.zip visual-defacement-check.js
   zip content-integrity-check.zip content-integrity-check.js
   zip api-health-check.zip api-health-check.js
   zip performance-baseline.zip performance-baseline.js
   
   # Deploy via AWS CLI or Console
   aws synthetics create-canary --cli-input-json file://canary-config.json
   ```

## 🛡️ Security Features

### Automatic Security Monitoring

1. **Visual Defacement Detection** (Every 5 minutes):
   - Takes screenshots for visual comparison
   - Detects suspicious keywords
   - Alerts on unauthorized changes

2. **Content Integrity Monitoring** (Every 10 minutes):
   - Verifies critical page elements
   - Detects iframe injections
   - Monitors for unauthorized redirects

3. **API Health Monitoring** (Every 5 minutes):
   - Checks backend API endpoints
   - Monitors response times
   - Validates database connectivity

4. **Performance Baseline** (Every hour):
   - Tracks load times
   - Monitors resource loading
   - Detects performance degradation

### Security Best Practices Implemented

- ✅ **HTTPS Everywhere**: ACM certificates for all services
- ✅ **Database Encryption**: RDS encryption at rest
- ✅ **Network Isolation**: Security groups for database access
- ✅ **Container Security**: App Runner managed containers
- ✅ **Secrets Management**: Environment variables for sensitive data
- ✅ **Monitoring & Alerting**: Real-time defacement detection

## 📊 Monitoring & Alerts

### Alert Channels

1. **Email Notifications**: Immediate alerts to your email
2. **SNS Integration**: Can add SMS, Slack, Teams
3. **CloudWatch Dashboard**: Visual monitoring interface

### Alert Types

- 🚨 **Critical**: Defacement detected, API down, database issues
- ⚠️ **Warning**: Performance degradation, high resource usage
- ℹ️ **Info**: Deployment success, routine maintenance

## 🔧 Maintenance

### Regular Tasks

- **Weekly**: Review CloudWatch dashboards
- **Monthly**: Check costs and optimize resources
- **Quarterly**: Update dependencies and security patches

### Scaling

- **App Runner**: Auto-scales based on traffic
- **RDS**: Can upgrade instance size if needed
- **Monitoring**: Add more canaries as needed

## 📞 Support & Troubleshooting

### Common Issues

1. **App Runner build failures**: Check `apprunner.yaml` syntax
2. **Database connection issues**: Verify security groups
3. **Canary failures**: Check domain URLs in scripts
4. **High costs**: Monitor usage in AWS Cost Explorer

### Getting Help

- AWS Support (if subscribed)
- AWS Documentation
- Community forums

## 🎯 Next Steps

After deployment:

1. **Test all services** are running correctly
2. **Verify monitoring** is working (force a test failure)
3. **Set up backup procedures** for critical data
4. **Document operational procedures** for your team
5. **Schedule regular security reviews**

---

**Your webapp is now deployed with enterprise-grade security monitoring at a fraction of traditional costs!**