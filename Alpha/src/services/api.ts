/**
 * API Service for connecting to PostgreSQL backend
 * 
 * This file contains the frontend API calls.
 * You need to set up a backend server (Node.js/Express) to handle these requests.
 */

const API_BASE_URL = 'http://localhost:3001/api';

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  organization: string;
  role: 'admin' | 'parent' | 'teacher';
}

export interface LoginData {
  email: string;
  password: string;
}

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
  role: string;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

/**
 * Register a new user
 */
export async function registerUser(data: RegisterData): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Registration failed');
    }

    return result;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Network error');
  }
}

/**
 * Login existing user
 */
export async function loginUser(data: LoginData): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Login failed');
    }

    // Store token in localStorage
    if (result.token) {
      localStorage.setItem('authToken', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
    }

    return result;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Network error');
  }
}

/**
 * Logout user
 */
export function logoutUser(): void {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
}

/**
 * Get current user from localStorage
 */
export function getCurrentUser(): User | null {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('authToken');
}

/**
 * Get auth token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}
