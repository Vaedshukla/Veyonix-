# Backend Setup for PostgreSQL User Registration

This document explains how to set up a backend API server to connect your Project Alpha frontend to your local PostgreSQL database.

## Architecture Overview

```
Frontend (React) → Backend API (Node.js/Express) → PostgreSQL Database
```

The frontend cannot directly connect to PostgreSQL for security reasons. You need a backend API server that:
- Handles HTTP requests from the frontend
- Connects to your PostgreSQL database
- Hashes passwords securely
- Returns JSON responses
- Issues JWT tokens for authentication

---

## Option 1: Node.js + Express Backend (Recommended)

### 1. Prerequisites
```bash
# Install Node.js (v16 or higher)
# Install npm (comes with Node.js)
```

### 2. Create Backend Project

Create a new folder for your backend (outside the Figma project):
```bash
mkdir project-alpha-backend
cd project-alpha-backend
npm init -y
```

### 3. Install Dependencies
```bash
npm install express pg bcryptjs jsonwebtoken cors dotenv
npm install --save-dev @types/node @types/express @types/bcryptjs @types/jsonwebtoken typescript ts-node
```

### 4. Create `.env` File
```env
# PostgreSQL Connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=project_alpha
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password

# JWT Secret (generate a random string)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Server Port
PORT=3001
```

### 5. Create PostgreSQL Database Schema

Open pgAdmin4 and run this SQL:

```sql
-- Create database
CREATE DATABASE project_alpha;

-- Connect to the database
\c project_alpha

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'parent', 'student')),
    organization_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 6. Create Backend Server (`server.js`)

```javascript
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected successfully');
  }
});

// Helper function to generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// ============================================
// AUTH ROUTES
// ============================================

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, fullName, role, organizationName } = req.body;

    // Validation
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user into database
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, organization_name) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, full_name, role, organization_name, created_at`,
      [email, passwordHash, fullName, role, organizationName || null]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        organizationName: user.organization_name,
        createdAt: user.created_at,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
    });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        organizationName: user.organization_name,
        createdAt: user.created_at,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
});

// ============================================
// USER ROUTES (Protected)
// ============================================

// Get all users (admin only)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.',
      });
    }

    const result = await pool.query(
      `SELECT id, email, full_name, role, organization_name, created_at 
       FROM users 
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      users: result.rows.map(user => ({
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        organizationName: user.organization_name,
        createdAt: user.created_at,
      })),
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Update user
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, organizationName } = req.body;

    // Users can only update their own profile unless they're admin
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const result = await pool.query(
      `UPDATE users 
       SET full_name = COALESCE($1, full_name),
           organization_name = COALESCE($2, organization_name)
       WHERE id = $3
       RETURNING id, email, full_name, role, organization_name`,
      [fullName, organizationName, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Delete user (admin only)
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.',
      });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api`);
});
```

### 7. Start the Backend Server

```bash
node server.js
```

You should see:
```
✅ Database connected successfully
🚀 Server running on http://localhost:3001
📡 API endpoint: http://localhost:3001/api
```

### 8. Update Frontend API URL

In `/services/api.ts`, make sure the API_BASE_URL matches your backend:
```typescript
const API_BASE_URL = 'http://localhost:3001/api';
```

---

## Testing the Setup

### 1. Test Backend Health
```bash
curl http://localhost:3001/api/health
```

Should return:
```json
{"success":true,"message":"Server is running"}
```

### 2. Test User Registration

Open your Project Alpha frontend and:
1. Click "Create Account" on login page
2. Fill in the registration form
3. Submit - user will be created in PostgreSQL
4. Check pgAdmin4 to see the new user:
   ```sql
   SELECT * FROM users;
   ```

### 3. Test User Login

1. Go to login page
2. Enter the email and password you just registered
3. Should redirect to dashboard
4. Check browser localStorage to see the JWT token

---

## Security Considerations

⚠️ **Important for Production:**

1. **Use HTTPS**: Never transmit passwords over HTTP in production
2. **Strong JWT Secret**: Use a long, random string for JWT_SECRET
3. **Environment Variables**: Never commit `.env` file to version control
4. **Password Requirements**: Enforce strong password policies
5. **Rate Limiting**: Add rate limiting to prevent brute force attacks
6. **Input Validation**: Add comprehensive validation on backend
7. **SQL Injection**: The code above uses parameterized queries (secure)
8. **CORS**: Configure CORS to only allow your frontend domain
9. **Password Reset**: Implement password reset functionality
10. **Email Verification**: Consider adding email verification

---

## Optional: TypeScript Backend

For TypeScript backend, create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  }
}
```

Rename `server.js` to `src/server.ts` and run:
```bash
npx ts-node src/server.ts
```

---

## Troubleshooting

### Database Connection Failed
- Check PostgreSQL is running in pgAdmin4
- Verify credentials in `.env` file
- Check if database exists: `SELECT datname FROM pg_database;`

### CORS Errors
- Make sure backend CORS is configured properly
- Check frontend is calling correct URL
- Try clearing browser cache

### JWT Token Errors
- Check JWT_SECRET is set in `.env`
- Verify token is being sent in Authorization header
- Check token hasn't expired (7 days default)

---

## Next Steps

1. **Start Backend Server**: Run `node server.js`
2. **Test Registration**: Create a new user account
3. **Check Database**: Verify user appears in pgAdmin4
4. **Test Login**: Log in with the new account
5. **Monitor Logs**: Watch backend console for errors

For additional features like password reset, email verification, or OAuth, refer to authentication libraries like Passport.js or Auth0.
