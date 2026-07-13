import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export function StatCard({ title, value, change, icon, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'bg-dark-850 border-dark-600',
    success: 'bg-success-900/20 border-success-700/50',
    warning: 'bg-warning-900/20 border-warning-700/50',
    error: 'bg-error-900/20 border-error-700/50',
  };

  const iconStyles = {
    default: 'text-text-secondary',
    success: 'text-success-400',
    warning: 'text-warning-400',
    error: 'text-error-400',
  };

  const valueStyles = {
    default: 'text-text-primary',
    success: 'text-success-300',
    warning: 'text-warning-300',
    error: 'text-error-300',
  };

  return (
    <div className={`border rounded-lg p-6 transition-all duration-200 hover:border-dark-500 hover:shadow-lg hover:shadow-dark-900/50 cursor-pointer hover:-translate-y-0.5 ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-text-tertiary text-sm font-medium mb-1">{title}</p>
          <p className={`text-3xl font-semibold transition-all duration-300 ${valueStyles[variant]}`}>{value}</p>
          {change && (
            <p className={`mt-2 text-sm transition-colors duration-200 ${
              change.trend === 'up' ? 'text-success-400' :
              change.trend === 'down' ? 'text-error-400' :
              'text-text-tertiary'
            }`}>
              {change.value}
            </p>
          )}
        </div>
        {icon && (
          <div className={`transition-transform duration-200 group-hover:scale-110 ${iconStyles[variant]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}