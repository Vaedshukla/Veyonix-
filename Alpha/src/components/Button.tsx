import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '',
  ...props 
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] font-medium hover:shadow-md';
  
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-500 active:bg-primary-700 border border-primary-500 hover:border-primary-400 hover:shadow-primary-500/30',
    secondary: 'bg-dark-700 text-text-primary hover:bg-dark-600 active:bg-dark-800 border border-dark-500 hover:border-dark-400',
    danger: 'bg-error-600 text-white hover:bg-error-500 active:bg-error-700 border border-error-500 hover:border-error-400 hover:shadow-error-500/30',
    ghost: 'text-text-secondary hover:bg-dark-800 hover:text-text-primary active:bg-dark-700 hover:shadow-none',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded',
    md: 'px-4 py-2 text-sm rounded-md',
    lg: 'px-6 py-2.5 text-base rounded-md',
  };
  
  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}