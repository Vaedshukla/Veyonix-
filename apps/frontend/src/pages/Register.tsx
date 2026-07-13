import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, User, Mail, Lock, Building, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  organization: string;
  role: 'admin' | 'parent' | 'teacher';
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  organization?: string;
  general?: string;
}

export function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    organization: '',
    role: 'admin',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // First name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Organization validation
    if (!formData.organization.trim()) {
      newErrors.organization = 'Organization name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // API call to your PostgreSQL backend
      const response = await fetch('http://localhost:3001/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          organization: formData.organization,
          role: formData.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccessMessage('Registration successful! Redirecting to login...');
      
      // Clear form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        organization: '',
        role: 'admin',
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error) {
      // Check if this is a network error (backend not available)
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        setErrors({
          general: 'Backend server is not running. Please set up the PostgreSQL backend server first. See /backend-setup/README.md for instructions.',
        });
      } else {
        setErrors({
          general: error instanceof Error ? error.message : 'Registration failed. Please try again.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-primary-900/30 rounded-lg">
              <Shield size={32} className="text-primary-400" />
            </div>
          </div>
          <h1 className="text-text-primary mb-2">Create New Account</h1>
          <p className="text-text-secondary">
            Register for Project Alpha monitoring platform
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Success Message */}
            {successMessage && (
              <div className="p-4 bg-success-900/30 border border-success-700/50 rounded-lg flex items-start gap-3">
                <CheckCircle size={20} className="text-success-400 flex-shrink-0 mt-0.5" />
                <p className="text-success-300">{successMessage}</p>
              </div>
            )}

            {/* General Error */}
            {errors.general && (
              <div className="p-4 bg-error-900/30 border border-error-700/50 rounded-lg flex items-start gap-3">
                <AlertCircle size={20} className="text-error-400 flex-shrink-0 mt-0.5" />
                <p className="text-error-300">{errors.general}</p>
              </div>
            )}

            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-text-secondary text-sm mb-2">
                  First Name *
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`w-full bg-dark-800 border ${
                      errors.firstName ? 'border-error-500' : 'border-dark-600'
                    } rounded-md px-10 py-2.5 text-text-primary placeholder-text-tertiary focus:outline-none focus:border-primary-500 transition-colors`}
                    placeholder="Enter first name"
                  />
                </div>
                {errors.firstName && (
                  <p className="mt-1 text-sm text-error-400">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-text-secondary text-sm mb-2">
                  Last Name *
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className={`w-full bg-dark-800 border ${
                      errors.lastName ? 'border-error-500' : 'border-dark-600'
                    } rounded-md px-10 py-2.5 text-text-primary placeholder-text-tertiary focus:outline-none focus:border-primary-500 transition-colors`}
                    placeholder="Enter last name"
                  />
                </div>
                {errors.lastName && (
                  <p className="mt-1 text-sm text-error-400">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-text-secondary text-sm mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full bg-dark-800 border ${
                    errors.email ? 'border-error-500' : 'border-dark-600'
                  } rounded-md px-10 py-2.5 text-text-primary placeholder-text-tertiary focus:outline-none focus:border-primary-500 transition-colors`}
                  placeholder="your.email@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-error-400">{errors.email}</p>
              )}
            </div>

            {/* Organization */}
            <div>
              <label className="block text-text-secondary text-sm mb-2">
                Organization *
              </label>
              <div className="relative">
                <Building size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  name="organization"
                  value={formData.organization}
                  onChange={handleChange}
                  className={`w-full bg-dark-800 border ${
                    errors.organization ? 'border-error-500' : 'border-dark-600'
                  } rounded-md px-10 py-2.5 text-text-primary placeholder-text-tertiary focus:outline-none focus:border-primary-500 transition-colors`}
                  placeholder="School or Organization Name"
                />
              </div>
              {errors.organization && (
                <p className="mt-1 text-sm text-error-400">{errors.organization}</p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="block text-text-secondary text-sm mb-2">
                Role *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full bg-dark-800 border border-dark-600 rounded-md px-3 py-2.5 text-text-primary focus:outline-none focus:border-primary-500 transition-colors"
              >
                <option value="admin">Administrator</option>
                <option value="parent">Parent</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-text-secondary text-sm mb-2">
                  Password *
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full bg-dark-800 border ${
                      errors.password ? 'border-error-500' : 'border-dark-600'
                    } rounded-md px-10 py-2.5 text-text-primary placeholder-text-tertiary focus:outline-none focus:border-primary-500 transition-colors`}
                    placeholder="••••••••"
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-error-400">{errors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-text-secondary text-sm mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full bg-dark-800 border ${
                      errors.confirmPassword ? 'border-error-500' : 'border-dark-600'
                    } rounded-md px-10 py-2.5 text-text-primary placeholder-text-tertiary focus:outline-none focus:border-primary-500 transition-colors`}
                    placeholder="••••••••"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-error-400">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* Password Requirements */}
            <div className="p-4 bg-dark-800 rounded-lg border border-dark-600">
              <p className="text-text-tertiary text-sm mb-2">Password Requirements:</p>
              <ul className="text-text-tertiary text-sm space-y-1 ml-4">
                <li className="list-disc">At least 8 characters long</li>
                <li className="list-disc">Contains uppercase and lowercase letters</li>
                <li className="list-disc">Contains at least one number</li>
              </ul>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>

            {/* Login Link */}
            <div className="text-center">
              <p className="text-text-tertiary">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Sign in here
                </button>
              </p>
            </div>
          </form>
        </Card>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-dark-850 border border-dark-600 rounded-lg">
          <div className="flex items-start gap-3">
            <Shield size={18} className="text-primary-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-text-primary text-sm mb-1">Secure Registration</p>
              <p className="text-text-tertiary text-sm">
                Your password is encrypted before storage. We use industry-standard security practices to protect your data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}