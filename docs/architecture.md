# System Architecture

The DSUTD2025 Student Portal follows a modern three-tier architecture with containerized services.

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                             │
├─────────────────────────────────────────────────────────────┤
│  Web Browser (React/Next.js Frontend)                      │
│  - Responsive UI with Tailwind CSS                         │
│  - TypeScript for type safety                              │
│  - Framer Motion for animations                            │
└─────────────────────────────────────────────────────────────┘
                              │
                         HTTP/HTTPS
                              │
┌─────────────────────────────────────────────────────────────┐
│                 Application Layer                           │
├─────────────────────────────────────────────────────────────┤
│  Node.js/Express.js Backend API                            │
│  - Modular route structure                                 │
│  - JWT-based authentication                                │
│  - Rate limiting & security middleware                     │
│  - File upload handling                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                          PostgreSQL
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                               │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL Database                                       │
│  - User management                                         │
│  - Event management                                        │
│  - Security logging                                        │
│  - Session tracking                                        │
└─────────────────────────────────────────────────────────────┘
```

## 🐳 Container Architecture

The application is containerized using Docker with three main services:

### Frontend Container (`webapp-frontend`)
- **Base Image**: `node:20-alpine`
- **Port**: 3000
- **Framework**: Next.js 14 with App Router
- **Features**:
  - Server-side rendering (SSR)
  - Static site generation (SSG)
  - API route proxying
  - Hot reloading in development

### Backend Container (`webapp-backend`)
- **Base Image**: `node:20-alpine`
- **Port**: 3001
- **Framework**: Express.js
- **Features**:
  - RESTful API endpoints
  - Authentication middleware
  - File upload processing
  - Database connection pooling

### Database Container (`webapp-postgres`)
- **Base Image**: `postgres:15-alpine`
- **Port**: 5431
- **Features**:
  - Persistent data volumes
  - Automatic schema initialization
  - Connection pooling support

## 📁 Project Structure

```
DSUTD2025/
├── frontend/                 # Next.js React application
│   ├── app/                 # App Router pages
│   │   ├── (auth)/         # Authentication pages
│   │   ├── admin/          # Admin-only pages
│   │   ├── calendar/       # Events calendar
│   │   ├── home/           # Dashboard
│   │   ├── profile/        # User profile
│   │   └── survival-kit/   # Resources
│   ├── components/         # Reusable components
│   │   └── ui/            # UI component library
│   ├── lib/               # Utility functions
│   └── public/            # Static assets
├── backend/                 # Node.js Express API
│   ├── config/             # Configuration modules
│   ├── middleware/         # Custom middleware
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic
│   ├── utils/              # Utility functions
│   ├── uploads/            # File upload storage
│   ├── server.js           # Main server entry
│   └── init.sql            # Database schema
├── docs/                   # Documentation
└── docker-compose.yml     # Container orchestration
```

## 🔄 Data Flow

### 1. User Request Flow
```
User → Frontend → Backend API → Database → Backend → Frontend → User
```

### 2. Authentication Flow
```
Login Request → Rate Limiting → Validation → Database Lookup → 
JWT Generation → Session Creation → Response
```

### 3. Event Management Flow
```
Event Creation → Authorization Check → Validation → 
Database Insert → Real-time Update → UI Refresh
```

## 🌐 Network Architecture

### Docker Network
- **Name**: `dsutd2025_default`
- **Type**: Bridge network
- **Services Communication**: Internal Docker DNS resolution

### Port Mapping
- **Frontend**: `3000:3000`
- **Backend**: `3001:3001`
- **Database**: `5431:5431`

### API Communication
- Frontend uses Next.js rewrites for seamless API proxying
- CORS configured for cross-origin requests
- API base URL: `/api` (proxied to backend)

## 🔧 Modular Backend Architecture

The backend follows a modular architecture pattern:

### Configuration Layer (`/config`)
- `database.js` - Database connection and pooling
- `email.js` - Email service configuration
- `security.js` - Security constants and settings

### Middleware Layer (`/middleware`)
- `auth.js` - Authentication and authorization
- `rateLimiting.js` - Rate limiting and DDoS protection
- `optionalAuth.js` - Optional authentication for public endpoints

### Route Layer (`/routes`)
- `auth.js` - Authentication endpoints
- `admin.js` - Administrative functions
- `calendar.js` - Event management
- `user.js` - User profile management
- `events.js` - Event participation

### Service Layer (`/services`)
- `emailService.js` - Email sending and templates

### Utility Layer (`/utils`)
- `auth.js` - Authentication utilities
- `security.js` - Security logging and monitoring

## 💾 Database Architecture

### Core Tables
- **users** - User accounts and profiles
- **calendar_events** - Event information
- **event_signups** - Event registrations
- **user_sessions** - Active user sessions
- **login_attempts** - Security audit trail
- **security_events** - System security logs

### Relationships
- Users can have multiple sessions (1:N)
- Users can sign up for multiple events (M:N)
- Events can have multiple participants (1:N)
- All security events are logged with user context

## 🔒 Security Architecture

### Authentication
- JWT tokens with issuer/audience validation
- Session-based token versioning
- Multi-device logout capability

### Authorization
- Role-based access control (admin/student)
- Route-level permission checks
- Resource-level access control

### Attack Prevention
- Rate limiting per IP and user
- Account lockout mechanisms
- SQL injection prevention
- XSS protection
- CSRF protection

## 📊 Monitoring & Logging

### Application Logs
- Express.js request logging
- Error tracking and reporting
- Security event logging

### Health Monitoring
- API health endpoints
- Database connection monitoring
- Container health checks

## 🚀 Scalability Considerations

### Horizontal Scaling
- Stateless backend design
- Database connection pooling
- Session storage externalization ready

### Performance Optimization
- Next.js static generation
- API response caching
- Database query optimization
- Image optimization

## 🔧 Development Architecture

### Hot Reloading
- Frontend: Next.js fast refresh
- Backend: Nodemon for file watching
- Database: Volume persistence

### Development Tools
- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting
- Docker for environment consistency

---

*For detailed component documentation, see [Frontend Guide](frontend.md) and [Backend Guide](backend.md).*