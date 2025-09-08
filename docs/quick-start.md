# Quick Start Guide

Get the DSUTD2025 Student Portal up and running in minutes.

## 🚀 Prerequisites

Before you begin, ensure you have the following installed:

- **Docker** and **Docker Compose** (recommended)
- **Node.js 18+** (for local development)
- **Git**

## ⚡ 5-Minute Setup

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd DSUTD2025
```

### 2. Environment Configuration
```bash
# Copy the example environment file
cp env.example .env

# Edit the .env file with your configuration (see Environment Setup guide)
```

### 3. Start the Application
```bash
# Using npm script (recommended)
npm start

# Or directly with Docker Compose
docker-compose up --build
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 🎯 Default Admin Account

The application comes with a pre-configured admin account:

- **Student ID**: `1007667`
- **Email**: `1007667@mymail.sutd.edu.sg`
- **Password**: `Admin123!@#`

## 📱 Main Features

### For Students
- **Home Dashboard**: Overview of upcoming events and announcements
- **Events Calendar**: View and register for events
- **Survival Kit**: Access important resources and guides
- **Profile Management**: Update personal information

### For Administrators
- **Admin Events**: Create, edit, and manage events
- **Admin Logs**: View security logs and system analytics
- **User Management**: Monitor user activities and statistics
- **Security Dashboard**: Real-time security monitoring

## 🔧 Useful Commands

```bash
# Start the application
npm start

# Start in development mode (with hot-reloading)
npm run dev

# Stop all services
npm run stop

# View logs
npm run logs

# Restart services
npm run restart

# Clean up Docker resources
npm run clean
```

## 🐳 Docker Status Check

Verify all services are running:
```bash
docker-compose ps
```

You should see three healthy containers:
- `webapp-frontend` (port 3000)
- `webapp-backend` (port 3001)  
- `webapp-postgres` (port 5432)

## 🔍 Health Checks

### Backend API Health
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-06T08:04:27.050Z"
}
```

### Frontend Health
Navigate to http://localhost:3000 - you should see the login page.

## 📚 Next Steps

- **Developers**: Read the [Development Guide](development.md)
- **Deployers**: Check the [Deployment Guide](deployment.md)
- **API Users**: Explore the [API Documentation](api.md)
- **Security Focus**: Review [Security Features](security.md)

## 🆘 Troubleshooting

### Common Issues

1. **Port conflicts**: Stop existing services with `npm run stop`
2. **Database issues**: Run `npm run migrate` to fix schema
3. **Build errors**: Clean Docker cache with `npm run clean`

For more detailed troubleshooting, see the [Troubleshooting Guide](troubleshooting.md).

## 🎉 You're Ready!

Your DSUTD2025 Student Portal is now running! You can:
1. Log in with the default admin account
2. Explore the different features
3. Start developing or customizing the application

---

*Need help? Check the [FAQ](faq.md) or create an issue in the repository.*