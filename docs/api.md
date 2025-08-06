# API Documentation

Complete reference for the DSUTD2025 Student Portal REST API.

## 🌐 Base URL

- **Development**: `http://localhost:3001`
- **Production**: `https://your-domain.com`

## 🔐 Authentication

Most endpoints require authentication via JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Token Format
```json
{
  "userId": 1,
  "studentId": "1007667",
  "email": "user@mymail.sutd.edu.sg",
  "role": "admin|student",
  "sessionId": "uuid",
  "tokenVersion": 1,
  "iss": "dsutd2025-api",
  "aud": "dsutd2025-frontend",
  "exp": 1642723200
}
```

## 📚 API Endpoints

### Health Check

#### GET /health
Check API health status.

**Request:**
```bash
curl http://localhost:3001/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-06T08:04:27.050Z"
}
```

---

## 🔐 Authentication Endpoints

### POST /api/auth/signup
Register a new user account.

**Request Body:**
```json
{
  "studentId": "1234567",
  "email": "student@mymail.sutd.edu.sg",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!"
}
```

**Response (Success):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "studentId": "1234567",
    "email": "student@mymail.sutd.edu.sg",
    "role": "student",
    "emailVerified": false
  }
}
```

**Validation Rules:**
- Student ID: 7 digits, must be unique
- Email: Must end with `@mymail.sutd.edu.sg`
- Password: Minimum 12 characters, must include uppercase, lowercase, number, and special character

### POST /api/auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "identifier": "1234567", // Student ID or email
  "password": "SecurePass123!"
}
```

**Response (Success):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "studentId": "1234567",
    "email": "student@mymail.sutd.edu.sg",
    "role": "student",
    "emailVerified": true
  }
}
```

**Security Features:**
- Rate limiting: 5 attempts per 15 minutes
- Account lockout: 5 failed attempts = 15-minute lockout
- Progressive delays for repeated attempts

### POST /api/auth/logout
Logout from current session.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### POST /api/auth/logout-all
Logout from all devices/sessions.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Logged out from all devices"
}
```

### GET /api/auth/me
Get current user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "studentId": "1234567",
    "email": "student@mymail.sutd.edu.sg",
    "role": "student",
    "emailVerified": true,
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

### POST /api/auth/forgot-password
Request password reset.

**Request Body:**
```json
{
  "identifier": "1234567" // Student ID or email
}
```

**Response:**
```json
{
  "message": "Password reset email sent"
}
```

### POST /api/auth/reset-password
Reset password with token.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123!"
}
```

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

---

## 📅 Calendar/Events Endpoints

### GET /api/calendar/events
Get events for a specific month.

**Query Parameters:**
- `year` (required): Year (e.g., 2025)
- `month` (required): Month (1-12)

**Headers:**
```
Authorization: Bearer <token> (optional)
```

**Request:**
```bash
curl "http://localhost:3001/api/calendar/events?year=2025&month=1" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "2025-01-15": [
    {
      "id": 1,
      "title": "Orientation Day",
      "description": "Welcome new students",
      "date": "2025-01-15",
      "time": "9:00 AM",
      "endTime": "5:00 PM",
      "type": "Mandatory",
      "color": "#ef4444",
      "maxParticipants": 100,
      "currentParticipants": 45,
      "isRegistered": false
    }
  ]
}
```

---

## 👤 User Profile Endpoints

### GET /api/user/profile
Get user profile information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "studentId": "1234567",
    "email": "student@mymail.sutd.edu.sg",
    "role": "student",
    "emailVerified": true,
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

### PUT /api/user/profile
Update user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "email": "newemail@mymail.sutd.edu.sg"
}
```

**Response:**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "studentId": "1234567",
    "email": "newemail@mymail.sutd.edu.sg",
    "role": "student"
  }
}
```

### GET /api/user/events
Get user's registered events.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "events": [
    {
      "id": 1,
      "title": "Orientation Day",
      "eventDate": "2025-01-15",
      "startTime": "09:00",
      "endTime": "17:00",
      "signupDate": "2025-01-01T10:00:00Z"
    }
  ]
}
```

---

## 🎯 Event Management Endpoints

### POST /api/events/signup
Sign up for an event.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "eventId": 1
}
```

**Response:**
```json
{
  "message": "Successfully signed up for event"
}
```

### DELETE /api/events/signup/:eventId
Cancel event registration.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Successfully cancelled event registration"
}
```

---

## 🔧 Admin Endpoints

*All admin endpoints require `admin` role.*

### GET /api/admin/calendar/events
Get all events with admin details.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response:**
```json
[
  {
    "id": 1,
    "title": "Orientation Day",
    "description": "Welcome new students",
    "event_date": "2025-01-15",
    "start_time": "09:00",
    "end_time": "17:00",
    "event_type": "Mandatory",
    "location": "Main Hall",
    "color": "#ef4444",
    "max_participants": 100,
    "current_participants": 45,
    "creator_student_id": "1007667",
    "signup_count": 45,
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

### POST /api/admin/calendar/events
Create a new event.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "title": "New Event",
  "description": "Event description",
  "eventDate": "2025-02-01",
  "startTime": "10:00",
  "endTime": "12:00",
  "eventType": "Optional",
  "location": "Room 101",
  "color": "#3b82f6",
  "maxParticipants": 50
}
```

**Response:**
```json
{
  "message": "Event created successfully",
  "event": {
    "id": 2,
    "title": "New Event",
    "eventDate": "2025-02-01"
  }
}
```

### PUT /api/admin/calendar/events/:id
Update an existing event.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "title": "Updated Event Title",
  "maxParticipants": 75
}
```

**Response:**
```json
{
  "message": "Event updated successfully"
}
```

### DELETE /api/admin/calendar/events/:id
Delete an event.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "message": "Event deleted successfully"
}
```

### POST /api/admin/calendar/events/batch-upload
Upload events via CSV file.

**Headers:**
```
Authorization: Bearer <admin-token>
Content-Type: multipart/form-data
```

**Request Body:**
```
Form data with 'csvFile' field containing CSV file
```

**CSV Format:**
```csv
title,description,event_date,start_time,end_time,location,event_type,is_mandatory
"Event 1","Description 1","2025-01-15","09:00","17:00","Main Hall","Mandatory","true"
```

**Response:**
```json
{
  "message": "Batch upload completed",
  "processedCount": 5,
  "skippedCount": 1,
  "totalRows": 6,
  "errors": []
}
```

### GET /api/admin/dashboard-stats
Get dashboard statistics.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "users": {
    "total": 150,
    "byRole": {
      "admin": 5,
      "student": 145
    }
  },
  "events": {
    "total": 25,
    "upcoming": 10,
    "ongoing": 2,
    "past": 13
  },
  "signups": {
    "total": 450
  },
  "activity": {
    "recent": 25,
    "failedLogins": 3
  },
  "currentEvent": null,
  "nextEvent": {
    "id": 5,
    "title": "Next Event",
    "event_date": "2025-01-20"
  }
}
```

### GET /api/admin/security-events
Get security events log.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `type` (optional): Event type filter

**Response:**
```json
{
  "events": [
    {
      "id": 1,
      "event_type": "LOGIN_SUCCESS",
      "event_description": "User logged in successfully",
      "user_id": 1,
      "student_id": "1234567",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2025-01-01T10:00:00Z"
    }
  ],
  "totalPages": 5,
  "currentPage": 1,
  "totalEvents": 250
}
```

### GET /api/admin/login-attempts
Get login attempts log.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "attempts": [
    {
      "id": 1,
      "identifier": "1234567",
      "success": true,
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "attempt_time": "2025-01-01T10:00:00Z"
    }
  ]
}
```

---

## 📋 Response Codes

### Success Codes
- `200` - OK
- `201` - Created
- `204` - No Content

### Client Error Codes
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limited)

### Server Error Codes
- `500` - Internal Server Error

## ❌ Error Response Format

```json
{
  "error": "Error message",
  "details": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

## 🔒 Rate Limiting

### Login Endpoints
- **Limit**: 5 attempts per 15 minutes per IP
- **Slowdown**: Progressive delays after failed attempts

### General API
- **Limit**: 100 requests per 15 minutes per IP
- **Headers**: Rate limit info included in response headers

## 📝 Request/Response Examples

### Complete Login Flow
```bash
# 1. Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "1234567",
    "password": "SecurePass123!"
  }'

# 2. Use returned token for authenticated requests
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

*For authentication details, see [Authentication Guide](authentication.md).*
*For security features, see [Security Documentation](security.md).*