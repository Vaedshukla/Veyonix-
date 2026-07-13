# Backend Setup Guide - PostgreSQL Integration

This guide will help you set up a Node.js/Express backend server to connect your Project Alpha frontend to your existing PostgreSQL database.

## Prerequisites

- Node.js (v16 or higher)
- Your existing PostgreSQL server running on pgAdmin4
- Database credentials (host, port, database name, username, password)

## Step 1: Create Backend Project

```bash
# Create a new directory for your backend
mkdir project-alpha-backend
cd project-alpha-backend

# Initialize Node.js project
npm init -y

# Install required dependencies
npm install express cors pg bcrypt jsonwebtoken dotenv
npm install --save-dev @types/node @types/express @types/cors @types/bcrypt @types/jsonwebtoken typescript ts-node nodemon
```

## Step 2: Database Schema

Connect to your PostgreSQL server via pgAdmin4 and create the users table:

```sql
-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    organization VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'parent', 'teacher')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);

-- Create index on organization
CREATE INDEX idx_users_organization ON users(organization);

-- Optional: Create a function to update updated_at timestamp
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

## Step 3: Create .env File

Create a `.env` file in your backend directory:

```env
# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=project_alpha
DB_USER=postgres
DB_PASSWORD=your_password_here

# Server Configuration
PORT=3001

# JWT Secret (generate a random string)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# CORS Origin (your frontend URL)
CORS_ORIGIN=http://localhost:5173
```

## Step 4: Create Database Connection

Create `src/config/database.ts`:

```typescript
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
```

## Step 5: Create User Routes

Create `src/routes/userRoutes.ts`:

```typescript
import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database';

const router = express.Router();

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  const { firstName, lastName, email, password, organization, role } = req.body;

  try {
    // Validate input
    if (!firstName || !lastName || !email || !password || !organization || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userCheck.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, organization, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, first_name, last_name, email, organization, role, created_at`,
      [firstName, lastName, email.toLowerCase(), passwordHash, organization, role]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        organization: user.organization,
        role: user.role,
        createdAt: user.created_at,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// Login user
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, password_hash, organization, role, is_active
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated. Contact administrator.' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        organization: user.organization,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

export default router;
```

## Step 6: Create Main Server File

Create `src/server.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes';
import pool from './config/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.status(200).json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});
```

## Step 7: Create TypeScript Config

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

## Step 8: Update package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

## Step 9: Create nodemon.json

Create `nodemon.json`:

```json
{
  "watch": ["src"],
  "ext": "ts",
  "exec": "ts-node src/server.ts"
}
```

## Step 10: Start the Backend Server

```bash
# Run in development mode
npm run dev

# Or build and run in production
npm run build
npm start
```

## Step 11: Test the Connection

1. Check health endpoint:
```bash
curl http://localhost:3001/health
```

2. Test registration:
```bash
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "TestPass123",
    "organization": "Test School",
    "role": "admin"
  }'
```

## Security Best Practices

1. **Never commit .env file** - Add it to `.gitignore`
2. **Use strong JWT secrets** - Generate using: `openssl rand -base64 32`
3. **Enable SSL/TLS** in production
4. **Rate limiting** - Add rate limiting middleware
5. **Input validation** - Add express-validator
6. **SQL injection protection** - Use parameterized queries (already implemented)
7. **Password requirements** - Already enforced in frontend

## Troubleshooting

### Connection Issues:
- Verify PostgreSQL is running in pgAdmin4
- Check DB credentials in `.env`
- Ensure PostgreSQL accepts connections on localhost
- Check firewall settings

### CORS Issues:
- Verify CORS_ORIGIN matches your frontend URL
- Check browser console for CORS errors

### Database Errors:
- Run the SQL schema creation script
- Check table exists: `SELECT * FROM users;`
- Verify user permissions

## Next Steps

1. Add password reset functionality
2. Implement email verification
3. Add session management
4. Create admin user management endpoints
5. Add logging and monitoring
6. Set up database backups
