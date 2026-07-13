// Authentication Service - Connects to your local backend API

const API_BASE_URL = 'http://localhost:3001/api'; // Change this to your backend URL

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'parent' | 'student';
}

export interface LoginData {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: {
    id: number;
    username: string;
    email: string;
    fullName: string;
    role: string;
    createdAt: string;
  };
  token?: string;
}

export const authService = {
  // Register new user
  register: async (data: RegisterData): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }

      return result;
    } catch (error) {
      throw error;
    }
  },

  // Login existing user
  login: async (data: LoginData): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Login failed');
      }

      // Store token in localStorage
      if (result.token) {
        localStorage.setItem('authToken', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
      }

      return result;
    } catch (error) {
      throw error;
    }
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },

  // Get current user from localStorage
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },

  // Get auth token
  getToken: () => {
    return localStorage.getItem('authToken');
  }
};
