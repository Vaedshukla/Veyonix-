import React from 'react';
import { Shield, Bell, Users, Lock, Database, Globe } from 'lucide-react';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';

export function Settings() {
  const handlePasswordChange = () => {
    alert('Password change dialog would open here');
  };

  const handleManageUsers = () => {
    alert('User management panel would open here');
  };

  const handleSaveChanges = () => {
    alert('Settings saved successfully!');
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      alert('Settings reset to defaults');
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-dark-900">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-text-primary mb-2">Settings</h1>
          <p className="text-text-tertiary">Configure system preferences and security options</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Security Settings */}
          <Card>
            <CardHeader 
              title="Security & Authentication" 
              action={<Shield size={20} className="text-text-tertiary" />}
            />
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-dark-800 rounded-md">
                <div>
                  <p className="text-text-primary">Two-Factor Authentication</p>
                  <p className="text-text-tertiary text-sm">Additional security layer for admin access</p>
                </div>
                <Badge status="active" />
              </div>

              <div className="flex items-center justify-between p-3 bg-dark-800 rounded-md hover:bg-dark-700 transition-all duration-200">
                <div>
                  <p className="text-text-primary">Session Timeout</p>
                  <p className="text-text-tertiary text-sm">Auto-logout after inactivity</p>
                </div>
                <select className="px-3 py-1 bg-dark-700 border border-dark-600 text-text-primary rounded-md hover:border-dark-500 transition-colors duration-200">
                  <option>15 minutes</option>
                  <option>30 minutes</option>
                  <option>1 hour</option>
                  <option>Never</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-dark-800 rounded-md hover:bg-dark-700 transition-all duration-200">
                <div>
                  <p className="text-text-primary">Agent Token Validity</p>
                  <p className="text-text-tertiary text-sm">Default expiration period</p>
                </div>
                <select className="px-3 py-1 bg-dark-700 border border-dark-600 text-text-primary rounded-md hover:border-dark-500 transition-colors duration-200">
                  <option>30 days</option>
                  <option>60 days</option>
                  <option>90 days</option>
                </select>
              </div>

              <div className="pt-4 border-t border-dark-600">
                <Button variant="secondary" size="sm" onClick={handlePasswordChange}>
                  <Lock size={16} />
                  Change Password
                </Button>
              </div>
            </div>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader 
              title="Notifications" 
              action={<Bell size={20} className="text-text-tertiary" />}
            />
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-dark-800 rounded-md">
                <div>
                  <p className="text-text-primary">Policy Violation Alerts</p>
                  <p className="text-text-tertiary text-sm">Immediate notification on violations</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-dark-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-dark-200 after:border-dark-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-dark-800 rounded-md">
                <div>
                  <p className="text-text-primary">Agent Status Changes</p>
                  <p className="text-text-tertiary text-sm">Notify when agents go offline</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-dark-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-dark-200 after:border-dark-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-dark-800 rounded-md">
                <div>
                  <p className="text-text-primary">Daily Summary Reports</p>
                  <p className="text-text-tertiary text-sm">Email digest of daily activity</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-dark-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-dark-200 after:border-dark-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="pt-4 border-t border-dark-600">
                <div>
                  <label className="block text-text-secondary text-sm font-medium mb-2">Email Address</label>
                  <input
                    type="email"
                    defaultValue="admin@alpha.local"
                    className="w-full px-3 py-2 bg-dark-800 border border-dark-600 text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 hover:border-dark-500"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* User Management */}
          <Card>
            <CardHeader 
              title="User Management" 
              action={<Users size={20} className="text-text-tertiary" />}
            />
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-dark-800 rounded-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-900/50 text-primary-400 rounded-full flex items-center justify-center font-semibold">
                    AD
                  </div>
                  <div>
                    <p className="text-text-primary">Admin User</p>
                    <p className="text-text-tertiary text-sm">admin@alpha.local</p>
                  </div>
                </div>
                <Badge status="active">Admin</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-dark-800 rounded-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-success-900/50 text-success-400 rounded-full flex items-center justify-center font-semibold">
                    TC
                  </div>
                  <div>
                    <p className="text-text-primary">Teacher Account</p>
                    <p className="text-text-tertiary text-sm">teacher@school.edu</p>
                  </div>
                </div>
                <Badge status="active">Moderator</Badge>
              </div>

              <div className="pt-4 border-t border-dark-600">
                <Button variant="secondary" size="sm" className="w-full" onClick={handleManageUsers}>
                  Manage Users
                </Button>
              </div>
            </div>
          </Card>

          {/* System Settings */}
          <Card>
            <CardHeader 
              title="System Configuration" 
              action={<Database size={20} className="text-text-tertiary" />}
            />
            <div className="space-y-4">
              <div>
                <label className="block text-text-secondary text-sm font-medium mb-2">Organization Name</label>
                <input
                  type="text"
                  defaultValue="Example School District"
                  className="w-full px-3 py-2 bg-dark-800 border border-dark-600 text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 hover:border-dark-500"
                />
              </div>

              <div>
                <label className="block text-text-secondary text-sm font-medium mb-2">Time Zone</label>
                <select className="w-full px-3 py-2 bg-dark-800 border border-dark-600 text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200 hover:border-dark-500">
                  <option>UTC-5 (Eastern Time)</option>
                  <option>UTC-6 (Central Time)</option>
                  <option>UTC-7 (Mountain Time)</option>
                  <option>UTC-8 (Pacific Time)</option>
                </select>
              </div>

              <div>
                <label className="block text-text-secondary text-sm font-medium mb-2">Data Retention Period</label>
                <select className="w-full px-3 py-2 bg-dark-800 border border-dark-600 text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200 hover:border-dark-500">
                  <option>30 days</option>
                  <option>90 days</option>
                  <option>180 days</option>
                  <option>1 year</option>
                </select>
              </div>

              <div className="pt-4 border-t border-dark-600 flex gap-2">
                <Button variant="primary" size="sm" onClick={handleSaveChanges}>
                  Save Changes
                </Button>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Reset
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}