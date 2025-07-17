# Full-Stack Web Application

A modern full-stack web application built with Next.js, React, Tailwind CSS, Node.js, and PostgreSQL, all orchestrated with Docker.

## 🚀 Features

- **Frontend**: Next.js 14 with React 18 and TypeScript
- **Styling**: Tailwind CSS for modern, responsive design
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with connection pooling
- **Containerization**: Docker and Docker Compose for easy deployment
- **Real-time**: RESTful API with JSON responses
- **Modern UI**: Beautiful, responsive interface with loading states and error handling

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
   docker-compose up --build
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Database: localhost:5432

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
- CORS enabled for frontend communication

### Database (Port 5432)
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

Create `.env` files in both frontend and backend directories:

**Backend (.env)**
```
DATABASE_URL=postgresql://webapp_user:webapp_password@localhost:5432/webapp_db
PORT=3001
NODE_ENV=development
```

**Frontend (.env.local)**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

The frontend uses Next.js rewrites to proxy API requests, allowing seamless API communication without CORS issues.

## 📚 API Endpoints

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

- Helmet.js for security headers
- CORS configuration
- Input validation
- SQL injection prevention with parameterized queries
- Environment variable management

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