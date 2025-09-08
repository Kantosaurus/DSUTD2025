# DSUTD2025 - Student Portal

A modern full-stack web application built with Next.js, React, Tailwind CSS, Node.js, and PostgreSQL, all orchestrated with Docker. Features enterprise-grade security for authentication and user management.

## 🚀 Features

- **Frontend**: Next.js 14 with React 18 and TypeScript
- **Styling**: Tailwind CSS for modern, responsive design
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with connection pooling
- **Containerization**: Docker and Docker Compose for easy deployment
- **Real-time**: RESTful API with JSON responses
- **Modern UI**: Beautiful, responsive interface with loading states and error handling
- **🔐 Enterprise Security**: Multi-layer authentication security with rate limiting, account lockout, session management, and comprehensive monitoring

## 🏗️ Architecture

```
├── frontend/          # Next.js React application
│   ├── app/          # App router pages
│   ├── package.json  # Frontend dependencies
│   └── Dockerfile    # Frontend container
├── backend/          # Node.js Express API
│   ├── server.js     # Main server file
│   ├── init.sql      # Database schema
│   ├── package.json  # Backend dependencies
│   └── Dockerfile    # Backend container
├── docker-compose.yml # Multi-container orchestration
└── README.md         # This file
```

## 🛠️ Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- Git

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd DSUTD2025
   ```

2. **Start all services with Docker Compose**
   ```bash
   npm start
   # or
   docker-compose up --build
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Database: localhost:5431

## 📋 Available Scripts

The project includes convenient npm scripts for common tasks:

```bash
# Start the application
npm start

# Start in development mode
npm run dev

# Stop all services
npm run stop

# Restart services
npm run restart

# View logs
npm run logs

# Run database migration (fixes schema issues)
npm run migrate

# Note: Database migrations now run automatically when the backend starts



# Clean up Docker resources
npm run clean
```

## 📦 Services

### Frontend (Port 3000)
- Next.js application with React and TypeScript
- Tailwind CSS for styling
- Axios for API communication
- Modern, responsive UI
- API request proxying via Next.js rewrites

### Backend (Port 3001)
- Express.js server with middleware
- PostgreSQL database connection
- RESTful API endpoints
- **🔐 Advanced Security Features**:
  - Rate limiting and DDoS protection
  - Account lockout after failed attempts
  - Session management with token versioning
  - Comprehensive security logging and monitoring
  - Password expiry and change enforcement
  - Secure JWT tokens with issuer/audience validation
- CORS enabled for frontend communication
- **Automatic database migrations** on startup

### Database (Port 5431)
- PostgreSQL 15 with Alpine Linux
- Persistent data storage
- Pre-configured database and tables

## 🔧 Development

### Running Locally (without Docker)

1. **Backend Setup**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Database Setup**
   - Install PostgreSQL locally
   - Create database: `webapp_db`
   - Run `backend/init.sql` to create tables

### Environment Variables

1. **Copy the example environment file:**
   ```bash
   cp env.example .env
   ```

2. **Edit the `.env` file with your configuration:**
   ```env
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   
   # Gmail Email Configuration (for email verification)
   EMAIL_USER=your-gmail@gmail.com
   EMAIL_PASSWORD=your-16-character-app-password
   EMAIL_FROM=your-gmail@gmail.com
   
   # Optional: Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:3000
   ```

3. **For local development without Docker, create `.env` files in both directories:**

   **Backend (.env)**
   ```env
   DATABASE_URL=postgresql://webapp_user:webapp_password@localhost:5431/webapp_db
   PORT=3001
   NODE_ENV=development
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   EMAIL_USER=your-gmail@gmail.com
   EMAIL_PASSWORD=your-16-character-app-password
   EMAIL_FROM=your-gmail@gmail.com
   ```

   **Frontend (.env.local)**
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

**Note:** See [Gmail Setup Guide](GMAIL_SETUP.md) for detailed email configuration instructions.

The frontend uses Next.js rewrites to proxy API requests, allowing seamless API communication without CORS issues.

## 📚 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration with validation
- `POST /api/auth/login` - Secure login with rate limiting and account protection
- `POST /api/auth/logout` - Secure logout with session invalidation
- `POST /api/auth/logout-all` - Logout from all devices
- `GET /api/auth/me` - Get current user profile

### Security Monitoring (Protected)
- `GET /api/admin/security-events` - View security events
- `GET /api/admin/login-attempts` - View login attempts

### Items
- `GET /api/items` - Get all items
- `POST /api/items` - Create a new item

### Health Check
- `GET /health` - API health status

## 🎨 UI Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Loading States**: Smooth loading indicators
- **Error Handling**: User-friendly error messages
- **Form Validation**: Client-side validation
- **Real-time Updates**: Items list updates immediately after creation

## 🐳 Container Setup

The application is containerized using Docker and orchestrated with Docker Compose. The setup includes:

- **Frontend Container**: Next.js application with hot-reloading
- **Backend Container**: Node.js Express API with live-reloading
- **Database Container**: PostgreSQL with persistent volume

All services are connected via a dedicated Docker network for secure communication.

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Rebuild and start
docker-compose up --build

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Access specific service
docker-compose exec backend sh
docker-compose exec frontend sh
docker-compose exec postgres psql -U webapp_user -d webapp_db
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm run lint
```

## 📖 Documentation

Comprehensive documentation is available in the `/docs` directory:

- **[📚 Complete Documentation](docs/README.md)** - Full documentation index
- **[🚀 Quick Start Guide](docs/quick-start.md)** - Get up and running in 5 minutes
- **[🏗️ Architecture Guide](docs/architecture.md)** - System design and structure
- **[🔌 API Documentation](docs/api.md)** - Complete REST API reference
- **[🔐 Security Features](docs/security.md)** - Security implementation details
- **[💾 Database Guide](docs/database.md)** - Database schema and management
- **[💻 Development Guide](docs/development.md)** - Local development setup
- **[🚀 Deployment Guide](docs/deployment.md)** - Production deployment
- **[🔧 Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions
- **[❓ FAQ](docs/faq.md)** - Frequently asked questions

## 📝 Database Schema

### Items Table
```sql
CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Users Table (for future authentication)
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔒 Security Features

### Authentication Security
- **Strong Password Requirements**: Minimum 8 characters with uppercase, lowercase, number, and special character
- **Secure Password Hashing**: bcryptjs with salt rounds
- **Password Expiry**: 90-day password expiration
- **Account Lockout**: 5 failed attempts trigger 15-minute lockout
- **Rate Limiting**: Login attempts limited to 5 per 15-minute window
- **Progressive Delays**: Increasing response times for repeated attempts

### Session Management
- **Secure JWT Tokens**: Tokens with issuer, audience, and algorithm validation
- **Session Tracking**: Database-backed session management
- **Token Versioning**: Session invalidation through token version increments
- **Session Expiry**: 2-hour session duration with automatic cleanup
- **Multi-device Logout**: Ability to logout from all devices

### Security Monitoring
- **Comprehensive Logging**: All login attempts and security events logged
- **IP Address Tracking**: Client IP address and user agent logging
- **Real-time Monitoring**: Admin endpoints for security event monitoring
- **Audit Trail**: Complete security event history with metadata

### Attack Prevention
- **Brute Force Protection**: Account lockout and rate limiting
- **Session Hijacking Prevention**: Secure cookies and token validation
- **CSRF Protection**: SameSite cookies and origin validation
- **User Enumeration Prevention**: Consistent response times

### Technical Security
- Helmet.js for security headers
- CORS configuration with specific origins
- Input validation and sanitization
- SQL injection prevention with parameterized queries
- Environment variable management
- Request size limits (10MB max)

## 🚀 Deployment

### Production Deployment
1. Update environment variables for production
2. Build and push Docker images
3. Deploy with Docker Compose or Kubernetes

### Environment Variables for Production
```bash
NODE_ENV=production
DATABASE_URL=your-production-database-url
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

1. **Port already in use**
   - Stop existing services: `docker-compose down`
   - Check for running containers: `docker ps`

2. **Database connection issues**
   - Ensure PostgreSQL container is running
   - Check database credentials in docker-compose.yml

3. **Frontend not loading**
   - Verify backend is running on port 3001
   - Check browser console for errors

4. **Build errors**
   - Clear Docker cache: `docker system prune`
   - Rebuild: `docker-compose up --build`

### Logs
```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs frontend
docker-compose logs backend
docker-compose logs postgres
```

## 📞 Support

For issues and questions, please create an issue in the repository.