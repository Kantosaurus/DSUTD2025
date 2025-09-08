# Frequently Asked Questions (FAQ)

Common questions and answers about the DSUTD2025 Student Portal.

## 🚀 Getting Started

### Q: How do I run the application for the first time?
**A:** Follow these steps:
1. Clone the repository
2. Copy `env.example` to `.env` and configure environment variables
3. Run `npm start` to start all services with Docker
4. Access the application at http://localhost:3000

For detailed instructions, see the [Quick Start Guide](quick-start.md).

### Q: What are the default admin credentials?
**A:** The application comes with pre-configured admin accounts:
- **Student ID**: `1007667`, **Password**: `Admin123!@#`
- **Student ID**: `1008148`, **Password**: `Admin123!@#`

**Important**: Change these credentials in production environments.

### Q: Why can't I access the admin features?
**A:** Admin features are only available to users with admin role. Make sure:
1. You're logged in with an admin account
2. Your account has `role = 'admin'` in the database
3. The navbar shows "Admin Events" and "Admin Logs" options

## 🔧 Technical Setup

### Q: Do I need to install Node.js if I'm using Docker?
**A:** No, Docker handles all dependencies. However, you'll need Node.js for local development outside of Docker.

### Q: What versions are supported?
**A:**
- **Node.js**: 18+ (LTS recommended)
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **PostgreSQL**: 15+ (handled by Docker)

### Q: Can I run this on Windows?
**A:** Yes, the application works on:
- Windows 10/11 with Docker Desktop
- Windows Subsystem for Linux (WSL2)
- Linux
- macOS

### Q: How do I switch between development and production modes?
**A:**
- **Development**: `npm run dev` (includes hot reloading)
- **Production**: `npm start` or use production Docker Compose files

## 🐳 Docker Questions

### Q: Why use Docker instead of running services locally?
**A:** Docker provides:
- Consistent environment across all machines
- Isolated dependencies
- Easy database setup with PostgreSQL
- Simplified deployment process
- No conflicts with local installations

### Q: How do I update the Docker containers?
**A:**
```bash
docker-compose down
docker-compose pull
docker-compose up --build
```

### Q: Can I run just the database in Docker and the apps locally?
**A:** Yes, start only the database:
```bash
docker-compose up postgres
```
Then run frontend and backend locally with appropriate database connection strings.

### Q: How do I access the database directly?
**A:**
```bash
docker-compose exec postgres psql -U webapp_user -d webapp_db
```

## 🔐 Security and Authentication

### Q: How secure is the authentication system?
**A:** The system implements enterprise-grade security:
- bcrypt password hashing with salt
- JWT tokens with issuer/audience validation
- Account lockout after failed attempts
- Rate limiting on login endpoints
- Session management with token versioning
- Comprehensive security logging

See [Security Documentation](security.md) for details.

### Q: How long do user sessions last?
**A:** JWT tokens expire after 2 hours. Users need to log in again after expiration.

### Q: Can users be logged out from all devices?
**A:** Yes, the system supports:
- Logout from current session
- Logout from all devices (invalidates all sessions)
- Admin ability to terminate user sessions

### Q: What happens if I forget the admin password?
**A:** You can reset it directly in the database:
```sql
-- Connect to database
docker-compose exec postgres psql -U webapp_user -d webapp_db

-- Reset password (this sets password to "Admin123!@#")
UPDATE users SET password_hash = '$2a$10$1z.67uf.usNl82d5.On6DeIehT8pIF0vYf5cw54ySVmaIm7NczfuO' 
WHERE student_id = '1007667';
```

### Q: How do I add new admin users?
**A:**
```sql
INSERT INTO users (student_id, email, password_hash, role, is_active, email_verified) 
VALUES ('1234567', '1234567@mymail.sutd.edu.sg', '$2a$10$hashed_password', 'admin', TRUE, TRUE);
```

## 📧 Email Configuration

### Q: Why aren't emails being sent?
**A:** Check these common issues:
1. Gmail 2-factor authentication enabled
2. App-specific password generated (not regular password)
3. EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM correctly set
4. Gmail "Less secure app access" disabled (use app passwords)

### Q: How do I set up Gmail for email sending?
**A:**
1. Enable 2-factor authentication on Gmail
2. Generate an app-specific password
3. Use your Gmail address for EMAIL_USER
4. Use the 16-character app password for EMAIL_PASSWORD

### Q: Can I use other email providers besides Gmail?
**A:** Yes, modify the email configuration in `backend/config/email.js`:
```javascript
const transporter = nodemailer.createTransporter({
  host: 'smtp.yourdomain.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});
```

## 📊 Database Questions

### Q: How do I backup the database?
**A:**
```bash
# Create backup
docker-compose exec postgres pg_dump -U webapp_user webapp_db > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U webapp_user -d webapp_db < backup.sql
```

### Q: How do I reset the database?
**A:**
```bash
# Remove database volume and restart
docker-compose down -v
docker-compose up postgres
```

### Q: Can I use an external database instead of the Docker PostgreSQL?
**A:** Yes, change the `DATABASE_URL` environment variable to point to your external database:
```env
DATABASE_URL=postgresql://user:password@external-host:5432/database_name
```

### Q: How do I view database logs?
**A:**
```bash
docker-compose logs postgres
```

## 🎨 Frontend Development

### Q: Why isn't hot reloading working?
**A:** Common solutions:
1. Restart the frontend container: `docker-compose restart frontend`
2. Check file permissions (especially on Windows/WSL)
3. Ensure you're editing files in the correct directory
4. Check Docker logs: `docker-compose logs frontend`

### Q: How do I customize the UI design?
**A:** The application uses Tailwind CSS:
- Edit component files in `frontend/components/`
- Modify Tailwind configuration in `frontend/tailwind.config.js`
- Add custom styles in `frontend/app/globals.css`

### Q: Can I add new pages?
**A:** Yes, create new files in `frontend/app/`:
```
frontend/app/
├── new-page/
│   └── page.tsx
```

### Q: How do I add new UI components?
**A:** Add components to `frontend/components/ui/` and import them in your pages.

## 🔌 API Development

### Q: How do I add new API endpoints?
**A:**
1. Create route files in `backend/routes/`
2. Add route handlers with proper validation
3. Import and use in `backend/server.js`
4. Add authentication middleware if needed

### Q: How do I test API endpoints?
**A:**
```bash
# Test with curl
curl -X GET http://localhost:3001/api/endpoint

# Test authenticated endpoints
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Q: How do I handle file uploads?
**A:** The system uses Multer for file uploads. See the CSV upload implementation in `backend/routes/admin.js` for examples.

## 📱 Features and Functionality

### Q: How do users register for events?
**A:**
1. Users view events on the calendar page
2. Click on an event to see details
3. Click "Register" if spaces are available
4. Registration is stored in the `event_signups` table

### Q: Can I customize the navbar?
**A:** Yes, edit `frontend/components/ui/resizable-navbar.tsx`. The navbar:
- Automatically shows/hides admin items based on user role
- Supports responsive design
- Includes search functionality

### Q: How do I add new event types?
**A:** Events support custom types. When creating events:
- Use the event type dropdown in admin interface
- Types are stored as strings in the database
- Add new types by modifying the frontend dropdown options

### Q: Can students create events?
**A:** Currently, only admin users can create events. To allow students:
1. Modify the authorization middleware
2. Update the frontend to show event creation for students
3. Add appropriate permission checks

## 🚀 Deployment and Production

### Q: How do I deploy to production?
**A:** See the [Deployment Guide](deployment.md) for detailed instructions. Key steps:
1. Set up production environment variables
2. Use production Docker Compose files
3. Configure SSL/TLS certificates
4. Set up monitoring and backups

### Q: What environment variables do I need for production?
**A:** Essential production variables:
```env
NODE_ENV=production
JWT_SECRET=secure-32-character-minimum-secret
DATABASE_URL=postgresql://user:password@host:5432/database
EMAIL_USER=production-email@domain.com
EMAIL_PASSWORD=app-specific-password
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### Q: How do I enable HTTPS?
**A:** Use a reverse proxy like Nginx with SSL certificates:
1. Set up Nginx reverse proxy
2. Obtain SSL certificates (Let's Encrypt recommended)
3. Configure Nginx to proxy to your Docker containers

### Q: How do I monitor the application in production?
**A:**
- Use health check endpoints: `/health`
- Monitor Docker container logs
- Set up external monitoring tools (e.g., Uptime Robot)
- Monitor database performance

## 🐛 Troubleshooting

### Q: The application won't start. What should I check?
**A:**
1. Check if Docker is running
2. Verify ports 3000, 3001, 5432 are available
3. Check environment variables are set
4. Look at container logs: `docker-compose logs`

### Q: I'm getting database connection errors. What's wrong?
**A:**
1. Ensure PostgreSQL container is running: `docker-compose ps`
2. Check database logs: `docker-compose logs postgres`
3. Verify DATABASE_URL is correctly formatted
4. Try restarting the backend: `docker-compose restart backend`

### Q: Why can't I log in with correct credentials?
**A:**
1. Check if account is locked: Look for `account_locked_until` in database
2. Verify email is verified: Check `email_verified` field
3. Check backend logs for authentication errors
4. Ensure JWT_SECRET is set and consistent

### Q: The frontend shows a blank page. How do I fix it?
**A:**
1. Check browser console for JavaScript errors
2. Verify backend API is accessible: `curl http://localhost:3001/health`
3. Check frontend logs: `docker-compose logs frontend`
4. Try rebuilding: `docker-compose up --build frontend`

For more detailed troubleshooting, see the [Troubleshooting Guide](troubleshooting.md).

## 📚 Development and Customization

### Q: How do I contribute to the project?
**A:**
1. Fork the repository
2. Create a feature branch
3. Make your changes with proper testing
4. Submit a pull request
5. Follow the coding standards in the development guide

### Q: What's the recommended development workflow?
**A:**
1. Use feature branches for new development
2. Test changes locally with `npm run dev`
3. Run linting: `npm run lint`
4. Commit with descriptive messages
5. Create pull requests for review

### Q: How do I add new dependencies?
**A:**
```bash
# Frontend dependencies
cd frontend
npm install package-name

# Backend dependencies
cd backend
npm install package-name

# Rebuild containers
docker-compose up --build
```

### Q: Can I use a different database?
**A:** The application is designed for PostgreSQL, but you could adapt it for other databases by:
1. Modifying the database connection configuration
2. Updating SQL queries for compatibility
3. Adjusting the schema initialization

## 📞 Support and Resources

### Q: Where can I find more documentation?
**A:** Check the documentation in the `/docs` folder:
- [Architecture Guide](architecture.md)
- [API Documentation](api.md)
- [Security Documentation](security.md)
- [Development Guide](development.md)
- [Deployment Guide](deployment.md)

### Q: How do I report bugs or request features?
**A:**
1. Check existing issues in the repository
2. Create a new issue with:
   - Clear description of the problem/request
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - System information and logs

### Q: Is there community support available?
**A:** 
- Check the project repository for discussions
- Review documentation for common solutions
- Create issues for bugs or feature requests
- Contribute improvements via pull requests

### Q: What technologies should I learn to contribute?
**A:**
- **Frontend**: React, Next.js, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js, PostgreSQL
- **DevOps**: Docker, Docker Compose
- **Security**: JWT, bcrypt, security best practices

---

*Can't find your question? Check the [Troubleshooting Guide](troubleshooting.md) or create an issue in the repository.*