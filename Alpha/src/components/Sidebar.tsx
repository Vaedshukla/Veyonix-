import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, Monitor, FileText, BarChart3, Settings, LogOut } from 'lucide-react';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md transition-all duration-200 text-sm font-medium ${
        active
          ? 'bg-dark-700 text-text-primary border border-dark-500'
          : 'text-text-tertiary hover:bg-dark-800 hover:text-text-secondary'
      }`}
    >
      <span className="transition-transform duration-200">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    navigate('/');
  };

  const navItems = [
    { icon: <LayoutDashboard size={18} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <Monitor size={18} />, label: 'Agents', path: '/agents' },
    { icon: <FileText size={18} />, label: 'Policies', path: '/policies' },
    { icon: <BarChart3 size={18} />, label: 'Reports', path: '/reports' },
    { icon: <Settings size={18} />, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="w-64 bg-dark-950 border-r border-dark-700 flex flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-dark-800 border border-dark-600 rounded-lg flex items-center justify-center transition-all duration-300 hover:bg-dark-700">
            <Shield size={24} className="text-text-secondary" />
          </div>
          <div>
            <h3 className="text-text-primary">Project Alpha</h3>
            <p className="text-text-tertiary text-sm">Control Center</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            active={location.pathname.startsWith(item.path)}
            onClick={() => navigate(item.path)}
          />
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-dark-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-dark-800 border border-dark-600 rounded-full flex items-center justify-center text-text-secondary text-sm font-medium">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-primary text-sm truncate">Admin User</p>
            <p className="text-text-tertiary text-xs">admin@alpha.local</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-4 py-2 text-text-tertiary hover:bg-dark-800 hover:text-text-secondary rounded-md transition-colors text-sm"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
