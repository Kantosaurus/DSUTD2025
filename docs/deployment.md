# Deployment Guide

Complete guide for deploying the DSUTD2025 Student Portal to production environments.

## 🚀 Deployment Overview

The DSUTD2025 Student Portal is designed for containerized deployment using Docker and Docker Compose, making it suitable for various hosting environments.

## 🏗️ Deployment Architecture

```
Internet
    │
    ▼
Load Balancer (Nginx/CloudFlare)
    │
    ▼
Application Server (Docker Host)
├── Frontend Container (Next.js)
├── Backend Container (Node.js/Express)
└── Database Container (PostgreSQL)
    │
    ▼
Persistent Storage (Volumes/External DB)
```

## 🐳 Docker Production Deployment

### Production Docker Compose
Create a production-specific docker-compose file:

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: webapp_db
      POSTGRES_USER: webapp_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    networks:
      - app-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://webapp_user:${POSTGRES_PASSWORD}@postgres:5431/webapp_db
      JWT_SECRET: ${JWT_SECRET}
      EMAIL_USER: ${EMAIL_USER}
      EMAIL_PASSWORD: ${EMAIL_PASSWORD}
      EMAIL_FROM: ${EMAIL_FROM}
    depends_on:
      - postgres
    restart: unless-stopped
    networks:
      - app-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    environment:
      NODE_ENV: production
    depends_on:
      - backend
    ports:
      - "3000:3000"
    restart: unless-stopped
    networks:
      - app-network

volumes:
  postgres_data:

networks:
  app-network:
    driver: bridge
```

### Production Dockerfiles

#### Backend Production Dockerfile
```dockerfile
# backend/Dockerfile.prod
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:20-alpine AS runtime

# Install PostgreSQL client for health checks
RUN apk add --no-cache postgresql-client

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# Copy dependencies
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Set user
USER nodejs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "server.js"]
```

#### Frontend Production Dockerfile
```dockerfile
# frontend/Dockerfile.prod
FROM node:20-alpine AS dependencies

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

FROM node:20-alpine AS runtime

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app

# Copy runtime dependencies
COPY --from=dependencies --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["npm", "start"]
```

## 🌐 Environment Configuration

### Production Environment Variables
Create a `.env.prod` file for production:

```bash
# Database Configuration
POSTGRES_PASSWORD=your-secure-database-password-change-this

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters-change-this

# Email Configuration
EMAIL_USER=your-production-email@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
EMAIL_FROM=noreply@yourdomain.com

# API Configuration
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# Security Configuration
NODE_ENV=production
```

### Environment Security Best Practices
- **Never commit** `.env.prod` to version control
- **Use strong passwords** with high entropy
- **Rotate secrets** regularly
- **Use environment-specific** configuration management
- **Enable logging** for audit trails

## 🖥️ Server Deployment

### VPS/Cloud Server Setup

#### System Requirements
- **Minimum**: 2 CPU cores, 4GB RAM, 20GB storage
- **Recommended**: 4 CPU cores, 8GB RAM, 50GB storage
- **OS**: Ubuntu 20.04 LTS or newer

#### Server Preparation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo apt install git -y

# Install Nginx (for reverse proxy)
sudo apt install nginx -y
```

#### Application Deployment
```bash
# Clone repository
git clone <your-repo-url> /opt/dsutd2025
cd /opt/dsutd2025

# Set up environment
cp env.example .env.prod
nano .env.prod  # Edit with production values

# Deploy with production compose
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
```

### Nginx Reverse Proxy Configuration
```nginx
# /etc/nginx/sites-available/dsutd2025
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self'" always;
    
    # Frontend proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }
}
```

#### Enable Nginx Configuration
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/dsutd2025 /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## 🔒 SSL/TLS Setup

### Let's Encrypt SSL Certificate
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Verify auto-renewal
sudo certbot renew --dry-run

# Set up auto-renewal cron job
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

## ☁️ Cloud Platform Deployment

### AWS Deployment

#### Using AWS ECS with Fargate
```yaml
# ecs-task-definition.json
{
  "family": "dsutd2025",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "frontend",
      "image": "your-registry/dsutd2025-frontend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/dsutd2025",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "frontend"
        }
      }
    }
  ]
}
```

#### Using AWS RDS for Database
```bash
# Environment variables for RDS
DATABASE_URL=postgresql://username:password@rds-endpoint:5431/webapp_db
```

### Google Cloud Platform

#### Using Cloud Run
```yaml
# cloudrun.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: dsutd2025-frontend
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "10"
    spec:
      containers:
      - image: gcr.io/your-project/dsutd2025-frontend
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        resources:
          limits:
            cpu: "1000m"
            memory: "1Gi"
```

### DigitalOcean App Platform
```yaml
# .do/app.yaml
name: dsutd2025
services:
- name: frontend
  source_dir: /frontend
  github:
    repo: your-username/dsutd2025
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  routes:
  - path: /
  envs:
  - key: NODE_ENV
    value: production

databases:
- name: postgres-db
  engine: PG
  version: "15"
  size_slug: db-s-1vcpu-1gb
```

## 📊 Monitoring and Logging

### Application Monitoring
```javascript
// backend/middleware/monitoring.js
const prometheus = require('prom-client');

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

// Middleware to track metrics
const monitoringMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
};

module.exports = { monitoringMiddleware };
```

### Health Check Endpoints
```javascript
// backend/routes/health.js
router.get('/health', async (req, res) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || 'unknown',
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

### Docker Health Checks
```dockerfile
# Health check in Dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1
```

## 🔧 CI/CD Pipeline

### GitHub Actions Deployment
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ghcr.io
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Build and push images
      run: |
        docker buildx build --platform linux/amd64 \
          -f backend/Dockerfile.prod \
          -t ghcr.io/${{ github.repository }}/backend:latest \
          --push backend/
        
        docker buildx build --platform linux/amd64 \
          -f frontend/Dockerfile.prod \
          -t ghcr.io/${{ github.repository }}/frontend:latest \
          --build-arg NEXT_PUBLIC_API_URL=${{ secrets.NEXT_PUBLIC_API_URL }} \
          --push frontend/
    
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /opt/dsutd2025
          git pull origin main
          docker-compose -f docker-compose.prod.yml pull
          docker-compose -f docker-compose.prod.yml up -d
          docker image prune -f
```

## 🗄️ Database Management

### Production Database Setup
```bash
# External PostgreSQL setup
sudo apt install postgresql postgresql-contrib -y

# Create production database
sudo -u postgres createdb webapp_db
sudo -u postgres createuser webapp_user

# Set password
sudo -u postgres psql -c "ALTER USER webapp_user PASSWORD 'secure-password';"

# Grant permissions
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE webapp_db TO webapp_user;"
```

### Database Backup Strategy
```bash
#!/bin/bash
# backup.sh - Daily database backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
DB_NAME="webapp_db"
DB_USER="webapp_user"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
pg_dump -h localhost -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 7 days of backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://your-backup-bucket/
```

### Database Migration in Production
```bash
# Run migrations safely
docker-compose exec backend npm run migrate

# Backup before major changes
pg_dump webapp_db > pre_migration_backup.sql

# Monitor migration progress
docker-compose logs -f backend
```

## 🚨 Production Troubleshooting

### Common Issues and Solutions

#### Service Not Starting
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs frontend
docker-compose logs backend
docker-compose logs postgres

# Check resource usage
docker stats

# Restart services
docker-compose restart
```

#### Database Connection Issues
```bash
# Check database connectivity
docker-compose exec backend psql -h postgres -U webapp_user -d webapp_db

# Check database logs
docker-compose logs postgres

# Reset database connection pool
docker-compose restart backend
```

#### Performance Issues
```bash
# Monitor resource usage
top
htop
free -h
df -h

# Check application metrics
curl http://localhost:3001/health

# Analyze slow queries
docker-compose exec postgres psql -U webapp_user -d webapp_db -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"
```

## 📈 Scaling Considerations

### Horizontal Scaling
- **Load Balancer**: Nginx or cloud load balancer
- **Multiple Frontend Instances**: Scale frontend containers
- **Database Read Replicas**: For read-heavy workloads
- **Session Storage**: External Redis for session management

### Vertical Scaling
- **Increase Resources**: CPU, memory, storage
- **Database Performance**: Connection pooling, query optimization
- **Caching**: Redis for application caching

---

*For security considerations in production, see [Security Documentation](security.md).*
*For monitoring and maintenance, see [Monitoring Guide](monitoring.md).*