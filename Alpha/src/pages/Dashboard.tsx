import React from 'react';
import { Shield, AlertCircle, Activity, XCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/StatCard';
import { Card, CardHeader } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';

interface ActivityItem {
  id: string;
  timestamp: string;
  device: string;
  action: string;
  category: 'blocked' | 'warned' | 'allowed';
  details: string;
}

const mockActivity: ActivityItem[] = [
  {
    id: '1',
    timestamp: '2 min ago',
    device: 'LAPTOP-WIN-4872',
    action: 'Blocked',
    category: 'blocked',
    details: 'Attempted access to restricted domain: gaming.example.com'
  },
  {
    id: '2',
    timestamp: '8 min ago',
    device: 'MACBOOK-001',
    action: 'Warned',
    category: 'warned',
    details: 'Extended session detected: 2.5 hours continuous usage'
  },
  {
    id: '3',
    timestamp: '15 min ago',
    device: 'CHROMEBOOK-EDU',
    action: 'Allowed',
    category: 'allowed',
    details: 'Access granted: educational-platform.edu'
  },
  {
    id: '4',
    timestamp: '23 min ago',
    device: 'LAPTOP-WIN-4872',
    action: 'Blocked',
    category: 'blocked',
    details: 'Application launch denied: Discord.exe'
  },
  {
    id: '5',
    timestamp: '35 min ago',
    device: 'IPAD-STUDENT-12',
    action: 'Warned',
    category: 'warned',
    details: 'Off-task behavior detected during focus period'
  },
];

const mockAgents = [
  { id: 'LAPTOP-WIN-4872', status: 'online', lastSeen: '1 min ago' },
  { id: 'MACBOOK-001', status: 'online', lastSeen: '5 min ago' },
  { id: 'CHROMEBOOK-EDU', status: 'online', lastSeen: '12 min ago' },
  { id: 'IPAD-STUDENT-12', status: 'offline', lastSeen: '2 hours ago' },
];

export function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 overflow-auto bg-dark-900">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-text-primary mb-2">Dashboard</h1>
          <p className="text-text-tertiary">Real-time system overview and activity monitoring</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Active Agents"
            value="12"
            change={{ value: '+2 this week', trend: 'up' }}
            icon={<Shield size={24} />}
            variant="default"
          />
          <StatCard
            title="Policy Violations"
            value="3"
            change={{ value: '-5 from yesterday', trend: 'down' }}
            icon={<AlertCircle size={24} />}
            variant="warning"
          />
          <StatCard
            title="Blocked Actions"
            value="47"
            change={{ value: 'Last 24 hours', trend: 'neutral' }}
            icon={<XCircle size={24} />}
            variant="error"
          />
          <StatCard
            title="Total Monitored"
            value="156"
            change={{ value: 'Devices tracked', trend: 'neutral' }}
            icon={<Activity size={24} />}
            variant="default"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <Card className="lg:col-span-2" padding={false}>
            <div className="p-6 border-b border-dark-600">
              <CardHeader 
                title="Recent Activity" 
                subtitle="Live policy enforcement events"
                action={
                  <Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>
                    View All
                  </Button>
                }
              />
            </div>
            <div className="divide-y divide-dark-600">
              {mockActivity.map((item) => (
                <div key={item.id} className="p-4 hover:bg-dark-800 transition-all duration-200 cursor-pointer hover:pl-6">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge status={item.category}>{item.action}</Badge>
                      <span className="text-text-primary font-mono text-sm">{item.device}</span>
                    </div>
                    <div className="flex items-center gap-1 text-text-tertiary">
                      <Clock size={14} />
                      <small>{item.timestamp}</small>
                    </div>
                  </div>
                  <p className="text-text-secondary text-sm">{item.details}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Agent Status */}
          <Card>
            <CardHeader title="Agent Status" subtitle="Connected devices" />
            <div className="space-y-3">
              {mockAgents.map((agent) => (
                <div 
                  key={agent.id}
                  className="flex items-center justify-between p-3 bg-dark-800 rounded-md transition-all duration-200 hover:bg-dark-700 cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-mono text-sm truncate">{agent.id}</p>
                    <p className="text-text-tertiary text-sm">
                      {agent.lastSeen}
                    </p>
                  </div>
                  <Badge status={agent.status as 'online' | 'offline'} />
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-dark-600">
              <Button variant="secondary" size="sm" className="w-full" onClick={() => navigate('/agents')}>
                View All Agents
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}