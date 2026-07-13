import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, AlertCircle } from 'lucide-react';
import { Button } from '../components/Button';
import { loginUser } from '../services/api';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Try PostgreSQL backend login first
      const response = await loginUser({ email, password });
      
      if (response.success) {
        // Login successful, navigate to dashboard
        navigate('/dashboard');
      }
    } catch (backendError) {
      // If backend is not available, fall back to demo login silently
      if (email === 'admin@projectalpha.com' && password === 'admin123') {
        // Store demo user data
        localStorage.setItem('authToken', 'demo-token');
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@projectalpha.com',
          organization: 'Demo Organization',
          role: 'admin'
        }));
        navigate('/dashboard');
      } else {
        setError('Invalid email or password');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-dark-850 border border-dark-600 rounded-lg mb-4 transition-all duration-300 hover:bg-dark-800">
            <Shield size={32} className="text-text-secondary" />
          </div>
          <h1 className="text-text-primary mb-2">Project Alpha</h1>
          <p className="text-text-tertiary">Digital Behavior Control System</p>
        </div>

        {/* Login Card */}
        <div className="bg-dark-900 border border-dark-700 rounded-lg p-8">
          <div className="mb-6">
            <h2 className="text-text-primary mb-1">Sign In</h2>
            <p className="text-text-tertiary">Enter your credentials to access the system</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-error-900/30 border border-error-700 rounded-md flex items-start gap-2 animate-shake">
              <AlertCircle size={18} className="text-error-400 mt-0.5 flex-shrink-0" />
              <p className="text-error-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-text-secondary text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-dark-850 border border-dark-600 text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 hover:border-dark-500 placeholder-text-disabled"
                placeholder="Enter email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-text-secondary text-sm font-medium mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-dark-850 border border-dark-600 text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 hover:border-dark-500 placeholder-text-disabled"
                placeholder="Enter password"
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-6"
              disabled={isLoading}
            >
              <Lock size={18} />
              {isLoading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>

          {/* Register Link */}
          <div className="mt-4 text-center">
            <p className="text-text-tertiary text-sm">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-primary-400 hover:text-primary-300 transition-colors"
              >
                Create new account
              </button>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-dark-700">
            <div className="flex items-center gap-2 text-text-tertiary text-sm">
              <Lock size={14} />
              <small>Secure authentication required</small>
            </div>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 p-4 bg-dark-900 border border-dark-700 rounded-md">
          <p className="text-text-tertiary text-sm mb-2">Demo Credentials:</p>
          <div className="space-y-1 font-mono text-sm">
            <p className="text-text-secondary">Admin: admin@projectalpha.com / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}