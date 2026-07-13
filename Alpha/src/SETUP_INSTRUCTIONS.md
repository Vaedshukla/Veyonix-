# Project Alpha - User Registration Setup

## Overview

Your Project Alpha application now has a complete user registration system that connects to your local PostgreSQL database running on pgAdmin4.

## What Has Been Added

### 1. **Frontend Components**
- ✅ **Registration Page** (`/pages/Register.tsx`)
  - Full form validation
  - Password strength requirements
  - Role selection (Admin, Parent, Teacher)
  - Organization field
  - Success/error messaging
  
- ✅ **Updated Login Page** (`/pages/Login.tsx`)
  - PostgreSQL backend integration
  - Fallback to demo login if backend unavailable
  - Link to registration page
  
- ✅ **API Service** (`/services/api.ts`)
  - User registration function
  - User login function
  - Token management
  - LocalStorage integration

### 2. **Backend Setup Guide**
- 📁 **Complete backend setup instructions** (`/backend-setup/README.md`)
  - Step-by-step Node.js/Express server setup
  - PostgreSQL database schema
  - User authentication with JWT
  - Password hashing with bcrypt
  - CORS configuration
  - Security best practices

## Quick Start

### Access the Registration Page

1. **Start your frontend** (if not already running)
2. **Navigate to**: `http://localhost:5173/register`
3. **Or click**: "Create new account" on the login page

### Current Features

**Registration Form Validates:**
- ✅ First and Last Name (required)
- ✅ Email format
- ✅ Password strength (8+ chars, uppercase, lowercase, number)
- ✅ Password confirmation match
- ✅ Organization name
- ✅ User role selection

**Upon Successful Registration:**
- User data is stored in PostgreSQL
- Password is securely hashed
- JWT token is generated
- Auto-redirect to login page

## Backend Setup (Required for Database Storage)

### Prerequisites
- PostgreSQL running on your machine (via pgAdmin4)
- Node.js v16 or higher

### Quick Setup

1. **Create Database in pgAdmin4**
   ```sql
   CREATE DATABASE project_alpha;
   ```

2. **Run the SQL Schema**
   - Open the schema SQL from `/backend-setup/README.md`
   - Execute in pgAdmin4 Query Tool

3. **Set Up Backend Server**
   ```bash
   # Create backend directory
   mkdir project-alpha-backend
   cd project-alpha-backend
   
   # Follow instructions in /backend-setup/README.md
   ```

4. **Configure Database Connection**
   - Create `.env` file with your PostgreSQL credentials
   - Update `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

5. **Start Backend Server**
   ```bash
   npm run dev
   ```
   
   Server will run on `http://localhost:3001`

## Database Schema

The `users` table stores:
- `id` - Auto-increment primary key
- `first_name` - User's first name
- `last_name` - User's last name
- `email` - Unique email (indexed)
- `password_hash` - Bcrypt hashed password
- `organization` - School/organization name
- `role` - User role (admin, parent, teacher)
- `created_at` - Registration timestamp
- `updated_at` - Last update timestamp
- `last_login` - Last successful login
- `is_active` - Account status flag

## API Endpoints

### POST `/api/users/register`
Register new user

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "organization": "Springfield Elementary",
  "role": "admin"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "organization": "Springfield Elementary",
    "role": "admin",
    "createdAt": "2024-12-24T..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST `/api/users/login`
Login existing user

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Security Features

✅ **Password Hashing** - Bcrypt with 10 salt rounds
✅ **JWT Authentication** - 7-day expiry tokens
✅ **SQL Injection Protection** - Parameterized queries
✅ **Email Validation** - Frontend and backend
✅ **Password Requirements** - Enforced strength rules
✅ **CORS Protection** - Configured origins
✅ **Input Sanitization** - Trim and validate all inputs

## Testing

### Test Without Backend (Demo Mode)
- Frontend works standalone
- Falls back to demo login: `admin@projectalpha.com` / `admin123`

### Test With Backend
1. Start PostgreSQL
2. Start backend server: `npm run dev`
3. Register a new user at `/register`
4. Login with registered credentials

### Verify in Database
```sql
-- In pgAdmin4 Query Tool
SELECT id, first_name, last_name, email, organization, role, created_at 
FROM users 
ORDER BY created_at DESC;
```

## File Structure

```
project-alpha/
├── pages/
│   ├── Login.tsx           # Updated with PostgreSQL integration
│   └── Register.tsx        # New registration page
├── services/
│   └── api.ts             # API service for backend calls
├── backend-setup/
│   └── README.md          # Complete backend setup guide
└── SETUP_INSTRUCTIONS.md  # This file

Backend (separate project):
project-alpha-backend/
├── src/
│   ├── config/
│   │   └── database.ts    # PostgreSQL connection
│   ├── routes/
│   │   └── userRoutes.ts  # Registration & login endpoints
│   └── server.ts          # Express server
├── .env                   # Database credentials (DO NOT COMMIT)
└── package.json
```

## Troubleshooting

### "Registration failed" Error
- ✅ Check backend server is running
- ✅ Verify PostgreSQL is running in pgAdmin4
- ✅ Check database credentials in `.env`
- ✅ Look at backend console for errors

### "User already exists" Error
- Email is already registered
- Use different email or login instead

### CORS Errors
- Update `CORS_ORIGIN` in backend `.env` to match frontend URL
- Ensure backend server is on `http://localhost:3001`

### Database Connection Failed
- Verify PostgreSQL service is running
- Check credentials in `.env` file
- Ensure database `project_alpha` exists
- Check firewall/port settings

## Next Steps

### Recommended Enhancements
1. Email verification system
2. Password reset functionality
3. User profile management
4. Admin user management panel
5. Audit logging for user actions
6. Session timeout handling
7. Remember me functionality
8. Two-factor authentication

### Production Considerations
- Use environment variables for all secrets
- Enable HTTPS/SSL
- Implement rate limiting
- Add comprehensive logging
- Set up database backups
- Use connection pooling
- Add monitoring/alerting

## Support

For detailed backend setup instructions, see:
📁 `/backend-setup/README.md`

This includes:
- Complete Node.js/Express server code
- Database schema with all table definitions
- Security configurations
- Testing procedures
- Troubleshooting guides

---

**Your registration system is ready!** Set up the backend server following the guide in `/backend-setup/README.md` to enable full PostgreSQL database storage.
