import React, { useState } from 'react';
import { Download, Filter, Calendar, Search } from 'lucide-react';
import { Card, CardHeader } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/Table';

interface LogEntry {
  id: string;
  timestamp: string;
  device: string;
  category: 'web' | 'app' | 'system';
  action: 'blocked' | 'warned' | 'allowed';
  target: string;
  policy: string;
  user: string;
}

const mockLogs: LogEntry[] = [
  {
    id: '1',
    timestamp: '2024-12-24 14:23:15',
    device: 'LAPTOP-WIN-4872',
    category: 'web',
    action: 'blocked',
    target: 'gaming.example.com',
    policy: 'Block Gaming Sites',
    user: 'student-01'
  },
  {
    id: '2',
    timestamp: '2024-12-24 14:15:42',
    device: 'MACBOOK-001',
    category: 'web',
    action: 'warned',
    target: 'youtube.com',
    policy: 'Social Media Warning',
    user: 'student-02'
  },
  {
    id: '3',
    timestamp: '2024-12-24 13:58:22',
    device: 'CHROMEBOOK-EDU',
    category: 'web',
    action: 'allowed',
    target: 'github.com',
    policy: 'Educational Whitelist',
    user: 'student-03'
  },
  {
    id: '4',
    timestamp: '2024-12-24 13:45:10',
    device: 'LAPTOP-WIN-4872',
    category: 'app',
    action: 'blocked',
    target: 'Discord.exe',
    policy: 'Block Messaging Apps',
    user: 'student-01'
  },
  {
    id: '5',
    timestamp: '2024-12-24 13:32:55',
    device: 'IPAD-STUDENT-12',
    category: 'web',
    action: 'warned',
    target: 'instagram.com',
    policy: 'Social Media Warning',
    user: 'student-04'
  },
  {
    id: '6',
    timestamp: '2024-12-24 13:18:33',
    device: 'MACBOOK-001',
    category: 'web',
    action: 'allowed',
    target: 'stackoverflow.com',
    policy: 'Educational Whitelist',
    user: 'student-02'
  },
  {
    id: '7',
    timestamp: '2024-12-24 12:55:21',
    device: 'LAPTOP-WIN-9023',
    category: 'web',
    action: 'blocked',
    target: 'twitch.tv',
    policy: 'Block Gaming Sites',
    user: 'student-05'
  },
  {
    id: '8',
    timestamp: '2024-12-24 12:42:08',
    device: 'CHROMEBOOK-EDU',
    category: 'system',
    action: 'blocked',
    target: 'Settings Access',
    policy: 'System Restrictions',
    user: 'student-03'
  },
];

export function Reports() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');

  const handleExport = () => {
    // Create CSV content
    const headers = ['Timestamp', 'Device', 'Category', 'Action', 'Target', 'Policy', 'User'];
    const rows = filteredLogs.map(log => [
      log.timestamp,
      log.device,
      log.category,
      log.action,
      log.target,
      log.policy,
      log.user
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filteredLogs = mockLogs.filter(log => {
    const matchesSearch = 
      log.device.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.policy.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || log.category === filterCategory;
    const matchesAction = filterAction === 'all' || log.action === filterAction;

    return matchesSearch && matchesCategory && matchesAction;
  });

  const stats = {
    total: mockLogs.length,
    blocked: mockLogs.filter(l => l.action === 'blocked').length,
    warned: mockLogs.filter(l => l.action === 'warned').length,
    allowed: mockLogs.filter(l => l.action === 'allowed').length,
  };

  return (
    <div className="flex-1 overflow-auto bg-dark-900">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-text-primary mb-2">Reports & Logs</h1>
          <p className="text-text-tertiary">Analyze system activity and export compliance data</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <p className="text-text-tertiary text-sm mb-1">Total Events</p>
            <p className="text-text-primary text-2xl font-semibold">{stats.total}</p>
          </Card>
          <Card className="bg-error-900/20 border-error-700/50">
            <p className="text-error-300 text-sm mb-1">Blocked</p>
            <p className="text-error-200 text-2xl font-semibold">{stats.blocked}</p>
          </Card>
          <Card className="bg-warning-900/20 border-warning-700/50">
            <p className="text-warning-300 text-sm mb-1">Warned</p>
            <p className="text-warning-200 text-2xl font-semibold">{stats.warned}</p>
          </Card>
          <Card className="bg-success-900/20 border-success-700/50">
            <p className="text-success-300 text-sm mb-1">Allowed</p>
            <p className="text-success-200 text-2xl font-semibold">{stats.allowed}</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-text-secondary text-sm font-medium mb-2">Search</label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" />
                <input
                  type="text"
                  placeholder="Search device, target, or policy..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-dark-600 text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 hover:border-dark-500 placeholder-text-disabled"
                />
              </div>
            </div>
            <div>
              <label className="block text-text-secondary text-sm font-medium mb-2">Category</label>
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 bg-dark-800 border border-dark-600 text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200 hover:border-dark-500"
              >
                <option value="all">All Categories</option>
                <option value="web">Web</option>
                <option value="app">Application</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <label className="block text-text-secondary text-sm font-medium mb-2">Action</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full px-3 py-2 bg-dark-800 border border-dark-600 text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200 hover:border-dark-500"
              >
                <option value="all">All Actions</option>
                <option value="blocked">Blocked</option>
                <option value="warned">Warned</option>
                <option value="allowed">Allowed</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-dark-600">
            <Calendar size={18} className="text-text-tertiary" />
            <span className="text-text-secondary">Time Range:</span>
            <select className="px-3 py-1 bg-dark-800 border border-dark-600 text-text-primary rounded-md transition-all duration-200 hover:border-dark-500">
              <option>Last 24 Hours</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Custom Range</option>
            </select>
            <div className="ml-auto">
              <Button variant="secondary" size="sm" onClick={handleExport}>
                <Download size={16} />
                Export CSV
              </Button>
            </div>
          </div>
        </Card>

        {/* Logs Table */}
        <Card padding={false}>
          <div className="p-6 border-b border-dark-600">
            <div className="flex items-center justify-between">
              <h3 className="text-text-primary">Activity Log</h3>
              <p className="text-text-tertiary">{filteredLogs.length} entries</p>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Policy</TableHead>
                <TableHead>User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-text-tertiary font-mono text-sm">
                    {log.timestamp}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{log.device}</span>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-dark-700 text-text-secondary rounded capitalize text-sm">
                      {log.category}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge status={log.action}>
                      {log.action.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{log.target}</span>
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {log.policy}
                  </TableCell>
                  <TableCell className="text-text-tertiary">
                    {log.user}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}