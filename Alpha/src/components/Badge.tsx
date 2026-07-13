import React from 'react';

type Status = 'online' | 'offline' | 'warning' | 'error' | 'active' | 'inactive' | 'allowed' | 'blocked' | 'warned';

interface BadgeConfig {
  bg: string;
  text: string;
  dot: string;
  label: string;
}

interface BadgeProps {
  status: Status;
  children?: React.ReactNode;
  showDot?: boolean;
}

export function Badge({ status, children, showDot = true }: BadgeProps) {
  const statusConfig: Record<Status, BadgeConfig> = {
    online: {
      bg: 'bg-success-900/50',
      text: 'text-success-300',
      dot: 'bg-success-400',
      label: 'Online',
    },
    offline: {
      bg: 'bg-dark-700',
      text: 'text-dark-100',
      dot: 'bg-dark-300',
      label: 'Offline',
    },
    active: {
      bg: 'bg-success-900/50',
      text: 'text-success-300',
      dot: 'bg-success-400',
      label: 'Active',
    },
    inactive: {
      bg: 'bg-dark-700',
      text: 'text-dark-100',
      dot: 'bg-dark-300',
      label: 'Inactive',
    },
    blocked: {
      bg: 'bg-error-900/50',
      text: 'text-error-300',
      dot: 'bg-error-400',
      label: 'Blocked',
    },
    allowed: {
      bg: 'bg-success-900/50',
      text: 'text-success-300',
      dot: 'bg-success-400',
      label: 'Allowed',
    },
    warning: {
      bg: 'bg-warning-900/50',
      text: 'text-warning-300',
      dot: 'bg-warning-400',
      label: 'Warning',
    },
    error: {
      bg: 'bg-error-900/50',
      text: 'text-error-300',
      dot: 'bg-error-400',
      label: 'Error',
    },
    warned: {
      bg: 'bg-warning-900/50',
      text: 'text-warning-300',
      dot: 'bg-warning-400',
      label: 'Warned',
    },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flexzZ  items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 ${config.bg} ${config.text}`}>
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
      )}
      <span>{children || config.label}</span>
    </span>
  );
}
