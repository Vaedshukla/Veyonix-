# PostgreSQL Database Setup Guide

## Database Schema

Create the following table in your PostgreSQL database using pgAdmin4:

```sql
-- Users table for authentication and user management
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'parent', 'teacher', 'student')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Create indexes for better query performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Optional: Create user sessions table for tracking logins
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
```

## Backend API Setup

You need to create a backend server (Node.js, Python, etc.) to handle PostgreSQL connections.
Here's an example using **Node.js with Express**:

### 1. Install Dependencies

```bash
npm install express pg bcrypt jsonwebtoken cors dotenv
npm install --save-dev @types/express @types/pg @types/bcrypt @types/jsonwebtoken
```

### 2. Create Environment Variables (.env)

```env
# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=project_alpha
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password

# Security
JWT_SECRET=your_very_secure_random_secret_key_here
JWT_EXPIRATION=24h

# Server
PORT=3000
NODE_ENV=development
```

### 3. Database Connection (db.js)

```javascript
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = pool;
```

### 4. Registration API Endpoint (routes/auth.js)

```javascript
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();
const SALT_ROUNDS = 10;

// POST /api/register
router.post('/register', async (req, res) => {
  const { username, email, password, fullName, role } = req.body;

  try {
    // Validate input
    if (!username || !email || !password || !fullName || !role) {
      return res.status(400).json({ 
        error: 'All fields are required' 
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters' 
      });
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return res.status(400).json({ 
        error: 'Password must contain uppercase, lowercase, and number' 
      });
    }

    // Check if username already exists
    const usernameCheck = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (usernameCheck.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Username already exists' 
      });
    }

    // Check if email already exists
    const emailCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Email already registered' 
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert new user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, full_name, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, username, email, full_name, role, created_at`,
      [username, email, passwordHash, fullName, role]
    );

    const newUser = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: newUser.id, 
        username: newUser.username,
        role: newUser.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.full_name,
        role: newUser.role,
        createdAt: newUser.created_at
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed. Please try again.' 
    });
  }
});

// POST /api/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Get user from database
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND is_active = TRUE',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed. Please try again.' 
    });
  }
});

module.exports = router;
```

### 5. Main Server File (server.js)

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Your frontend URL
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Frontend Integration

Update the registration form to call your backend API:

```typescript
// In /pages/Register.tsx - Replace the TODO section with:

const response = await fetch('http://localhost:3000/api/register', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: formData.username,
    email: formData.email,
    password: formData.password,
    fullName: formData.fullName,
    role: formData.role
  })
});

const data = await response.json();

if (!response.ok) {
  throw new Error(data.error || 'Registration failed');
}

// Store token for authentication
localStorage.setItem('authToken', data.token);
localStorage.setItem('user', JSON.stringify(data.user));
```

## Testing with pgAdmin4

1. Open pgAdmin4
2. Connect to your PostgreSQL server
3. Create a new database: `project_alpha`
4. Run the SQL schema provided above
5. Verify tables created successfully
6. Start your backend server: `node server.js`
7. Test registration from the frontend

## Security Best Practices

1. **Never store passwords in plain text** - Always use bcrypt or similar
2. **Use HTTPS** in production
3. **Implement rate limiting** to prevent brute force attacks
4. **Validate all inputs** on both frontend and backend
5. **Use prepared statements** (parameterized queries) to prevent SQL injection
6. **Implement CSRF protection** for form submissions
7. **Set proper CORS policies**
8. **Keep JWT secrets secure** and rotate them regularly
9. **Implement account lockout** after failed login attempts
10. **Use environment variables** for sensitive configuration

## Connection String for pgAdmin4

```
Host: localhost
Port: 5432
Database: project_alpha
Username: your_postgres_username
Password: your_postgres_password
```

## Troubleshooting

### Cannot connect to PostgreSQL
- Check if PostgreSQL service is running
- Verify port 5432 is not blocked by firewall
- Check pgAdmin4 connection settings

### Backend API not receiving requests
- Ensure CORS is properly configured
- Check backend server is running on correct port
- Verify frontend is pointing to correct API URL

### User registration fails
- Check PostgreSQL error logs
- Verify database schema is created correctly
- Ensure all required fields are being sent
