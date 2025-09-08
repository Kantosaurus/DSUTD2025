# Development Guide

Complete guide for local development of the DSUTD2025 Student Portal.

## 🚀 Development Setup

### Prerequisites
- **Node.js 18+** (LTS recommended)
- **Docker & Docker Compose** (for database and full-stack development)
- **Git** for version control
- **VS Code** (recommended IDE) with extensions:
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense
  - ES7+ React/Redux/React-Native snippets
  - Prettier - Code formatter
  - ESLint

### Quick Development Setup

#### 1. Repository Setup
```bash
git clone <repository-url>
cd DSUTD2025
```

#### 2. Environment Configuration
```bash
# Copy environment template
cp env.example .env

# Edit .env with your configuration
code .env
```

#### 3. Start Development Environment
```bash
# Option A: Docker-based development (recommended)
npm run dev

# Option B: Local development
npm run dev:local
```

## 🐳 Docker Development

### Development with Docker Compose
```bash
# Start all services in development mode
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Build and start with latest changes
npm run dev

# View logs
npm run logs

# Stop services
npm run stop
```

### Hot Reloading
- **Frontend**: Next.js Fast Refresh automatically reloads on changes
- **Backend**: Nodemon restarts server on file changes
- **Database**: Persistent volume maintains data between restarts

## 💻 Local Development

### Backend Local Setup
```bash
cd backend

# Install dependencies
npm install

# Set up local environment
cp .env.example .env
# Edit backend/.env with local database settings

# Start PostgreSQL (if not using Docker)
# Create database: webapp_db
createdb webapp_db

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

**Backend Environment Variables:**
```env
# backend/.env
DATABASE_URL=postgresql://webapp_user:webapp_password@localhost:5431/webapp_db
PORT=3001
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
EMAIL_FROM=your-gmail@gmail.com
```

### Frontend Local Setup
```bash
cd frontend

# Install dependencies
npm install

# Set up local environment
cp .env.example .env.local
# Edit frontend/.env.local

# Start development server
npm run dev
```

**Frontend Environment Variables:**
```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🏗️ Project Structure Deep Dive

### Frontend Architecture (`/frontend`)
```
frontend/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Route groups for authentication
│   │   ├── login/
│   │   └── signup/
│   ├── admin/             # Admin-only routes
│   │   ├── events/
│   │   └── logs/
│   ├── calendar/          # Event calendar
│   ├── home/              # User dashboard
│   ├── profile/           # User profile management
│   ├── survival-kit/      # Resource center
│   ├── meet-the-team/     # Team information
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable components
│   └── ui/               # UI component library
│       ├── animated-tooltip.tsx
│       ├── email-verification-modal.tsx
│       ├── forgot-password-modal.tsx
│       ├── login-card.tsx
│       ├── multi-step-loader.tsx
│       ├── resizable-navbar.tsx
│       └── signup-modal.tsx
├── lib/                  # Utility functions
│   └── utils.ts          # Common utilities
├── public/               # Static assets
│   ├── dsutd.png
│   ├── dsutd 2025.svg
│   └── letter d.svg
├── next.config.js        # Next.js configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

### Backend Architecture (`/backend`)
```
backend/
├── config/               # Configuration modules
│   ├── database.js       # Database connection setup
│   ├── email.js          # Email service configuration
│   └── security.js       # Security constants
├── middleware/           # Express middleware
│   ├── auth.js           # Authentication middleware
│   ├── rateLimiting.js   # Rate limiting configuration
│   └── optionalAuth.js   # Optional authentication
├── routes/               # API route handlers
│   ├── auth.js           # Authentication endpoints
│   ├── admin.js          # Admin functionality
│   ├── calendar.js       # Event management
│   ├── events.js         # Event participation
│   └── user.js           # User profile
├── services/             # Business logic
│   └── emailService.js   # Email sending service
├── utils/                # Utility functions
│   ├── auth.js           # Auth helper functions
│   └── security.js       # Security utilities
├── uploads/              # File upload storage
├── server.js             # Main server entry point
└── init.sql              # Database schema
```

## 🛠️ Development Workflow

### Code Organization Standards
```javascript
// File naming conventions
- Components: PascalCase (e.g., UserProfile.tsx)
- Utilities: camelCase (e.g., formatDate.js)
- API routes: kebab-case (e.g., user-profile.js)
- Directories: kebab-case (e.g., user-management/)
```

### Component Development Pattern
```typescript
// Example component structure
'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface ComponentProps {
  title: string
  onAction?: () => void
}

export default function ExampleComponent({ title, onAction }: ComponentProps) {
  const [state, setState] = useState<string>('')

  useEffect(() => {
    // Side effects
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 bg-white rounded-lg shadow"
    >
      <h2 className="text-xl font-semibold">{title}</h2>
      {/* Component content */}
    </motion.div>
  )
}
```

### API Route Development Pattern
```javascript
// Example API route structure
const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Validation middleware
const validateInput = [
  body('field').notEmpty().withMessage('Field is required'),
  // Additional validation rules
];

// Route handler
router.post('/endpoint', authenticateToken, validateInput, async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    // Business logic
    const result = await businessLogic(req.body);

    // Return response
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

## 🧪 Testing and Quality

### Frontend Testing
```bash
cd frontend

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check

# Build test
npm run build
```

### Backend Testing
```bash
cd backend

# Run linting
npm run lint

# Run tests (if configured)
npm test

# Check for security vulnerabilities
npm audit
```

### Code Quality Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for React and Node.js
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for quality checks

## 🔧 Development Tools

### VS Code Configuration
```json
// .vscode/settings.json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

### Recommended Extensions
```json
// .vscode/extensions.json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

## 🚀 Development Scripts

### Root Level Scripts
```bash
# Start all services
npm start

# Development mode with hot reloading
npm run dev

# Stop all services
npm run stop

# View logs
npm run logs

# Clean up Docker resources
npm run clean

# Database migration
npm run migrate
```

### Frontend Scripts
```bash
cd frontend

# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint
npm run lint:fix

# Type checking
npm run type-check
```

### Backend Scripts
```bash
cd backend

# Development server with hot reload
npm run dev

# Production server
npm start

# Database migration
npm run migrate

# Linting
npm run lint
```

## 🐛 Debugging

### Frontend Debugging
```typescript
// React DevTools debugging
import { useEffect } from 'react'

export default function Component() {
  useEffect(() => {
    console.log('Component mounted')
    // Debug state changes
  }, [])

  // Use React DevTools for component inspection
  return <div>Component</div>
}
```

### Backend Debugging
```javascript
// Node.js debugging with console logs
console.log('Debug info:', { variable, context });

// Using debugger statements
debugger; // Pauses execution in Node.js inspector

// Error logging
try {
  // Code that might fail
} catch (error) {
  console.error('Error details:', {
    message: error.message,
    stack: error.stack,
    context: 'Additional context'
  });
}
```

### Database Debugging
```bash
# Connect to database directly
docker-compose exec postgres psql -U webapp_user -d webapp_db

# View database logs
docker-compose logs postgres

# Check query performance
EXPLAIN ANALYZE SELECT * FROM users WHERE student_id = '1234567';
```

## 📊 Performance Monitoring

### Frontend Performance
```typescript
// Performance monitoring
import { useState, useEffect } from 'react'

export function usePerformance(componentName: string) {
  useEffect(() => {
    const start = performance.now()
    
    return () => {
      const end = performance.now()
      console.log(`${componentName} render time: ${end - start}ms`)
    }
  }, [componentName])
}

// Usage in components
export default function MyComponent() {
  usePerformance('MyComponent')
  return <div>Content</div>
}
```

### Backend Performance
```javascript
// Request timing middleware
const requestTimer = (req, res, next) => {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`${req.method} ${req.path} - ${duration}ms`)
  })
  
  next()
}

app.use(requestTimer)
```

## 🔄 Git Workflow

### Branch Naming Convention
```bash
# Feature branches
feature/user-authentication
feature/event-management

# Bug fixes
bugfix/login-validation-error
bugfix/database-connection-issue

# Hotfixes
hotfix/security-vulnerability

# Release branches
release/v1.0.0
```

### Commit Message Format
```bash
# Format: type(scope): description
feat(auth): add password reset functionality
fix(calendar): resolve event date display issue
docs(api): update authentication endpoints
style(navbar): improve responsive design
refactor(backend): reorganize route handlers
test(user): add profile update tests
```

### Development Process
1. **Create feature branch** from `main`
2. **Develop and test** locally
3. **Commit changes** with descriptive messages
4. **Push branch** and create pull request
5. **Code review** process
6. **Merge** after approval

## 🚨 Troubleshooting

### Common Development Issues

#### Port Conflicts
```bash
# Check what's using port 3000/3001
netstat -tulpn | grep :3000
lsof -i :3000

# Kill process on port
kill -9 $(lsof -t -i:3000)
```

#### Docker Issues
```bash
# Clean Docker cache
docker system prune -a

# Rebuild containers
docker-compose down
docker-compose up --build

# Remove all containers and volumes
docker-compose down -v
```

#### Database Connection Issues
```bash
# Check database status
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up postgres
```

#### Frontend Build Issues
```bash
# Clear Next.js cache
cd frontend
rm -rf .next
npm run build

# Check TypeScript errors
npm run type-check
```

## 📚 Learning Resources

### Documentation Links
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

### Tutorials and Guides
- [Next.js App Router Tutorial](https://nextjs.org/learn)
- [React TypeScript Guide](https://react-typescript-cheatsheet.netlify.app/)
- [Tailwind CSS Best Practices](https://tailwindcss.com/docs/reusing-styles)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

*For deployment information, see [Deployment Guide](deployment.md).*
*For API details, see [API Documentation](api.md).*