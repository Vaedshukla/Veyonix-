import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Monitor, Cpu, HardDrive, Wifi, Shield, Clock } from 'lucide-react';
import { Card, CardHeader } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';

interface PolicyDecision {
  id: string;
  timestamp: string;
  action: string;
  category: 'blocked' | 'warned' | 'allowed';
  target: string;
  reason: string;
}

const mockDecisions: PolicyDecision[] = [
  {
    id: '1',
    timestamp: '2024-12-24 14:23:15',
    action: 'BLOCK',
    category: 'blocked',
    target: 'gaming.example.com',
    reason: 'Category: Gaming - Blocked during focus hours'
  },
  {
    id: '2',
    timestamp: '2024-12-24 14:15:42',
    action: 'WARN',
    category: 'warned',
    target: 'youtube.com',
    reason: 'Extended usage warning threshold reached'
  },
  {
    id: '3',
    timestamp: '2024-12-24 13:58:22',
    action: 'ALLOW',
    category: 'allowed',
    target: 'github.com',
    reason: 'Category: Development - Whitelisted'
  },
  {
    id: '4',
    timestamp: '2024-12-24 13:45:10',
    action: 'BLOCK',
    category: 'blocked',
    target: 'Discord.exe',
    reason: 'Application: Communication - Restricted during school hours'
  },
];

export function AgentDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <div className="flex-1 overflow-auto bg-dark-900">
      <div className="p-8">
        {/* Header with Back Button */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/agents')}
            className="flex items-center gap-2 text-text-tertiary hover:text-text-secondary mb-4 transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Back to Agents</span>
          </button>
          <h1 className="text-text-primary mb-2">Agent Detail: {id}</h1>
          <p className="text-text-tertiary">Detailed information and management for this agent</p>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary-900/30 rounded-lg">
                <Monitor size={24} className="text-primary-400" />
              </div>
              <div>
                <p className="text-text-tertiary text-sm mb-1">Operating System</p>
                <p className="text-text-primary">Windows 11 Pro</p>
                <p className="text-text-tertiary text-sm">Build 22621.2715</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-success-900/30 rounded-lg">
                <Cpu size={24} className="text-success-400" />
              </div>
              <div>
                <p className="text-text-tertiary text-sm mb-1">Hardware</p>
                <p className="text-text-primary">Intel Core i7-1265U</p>
                <p className="text-text-tertiary text-sm">16GB RAM</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-info-900/30 rounded-lg">
                <HardDrive size={24} className="text-info-400" />
              </div>
              <div>
                <p className="text-text-tertiary text-sm mb-1">Agent Version</p>
                <p className="text-text-primary">v2.4.1</p>
                <p className="text-text-tertiary text-sm">Latest stable</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Capabilities & Security */}
          <div className="space-y-6">
            <Card>
              <CardHeader title="Capabilities" />
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-dark-800 rounded">
                  <div className="flex items-center gap-2">
                    <Wifi size={16} className="text-text-tertiary" />
                    <span className="text-text-primary">Web Filtering</span>
                  </div>
                  <Badge status="active" />
                </div>
                <div className="flex items-center justify-between p-2 bg-dark-800 rounded">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-text-tertiary" />
                    <span className="text-text-primary">App Control</span>
                  </div>
                  <Badge status="active" />
                </div>
                <div className="flex items-center justify-between p-2 bg-dark-800 rounded">
                  <div className="flex items-center gap-2">
                    <Monitor size={16} className="text-text-tertiary" />
                    <span className="text-text-primary">Network Monitor</span>
                  </div>
                  <Badge status="active" />
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title="Security Status" />
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-text-tertiary text-sm">Token Expiry</span>
                    <span className="text-text-primary">29 days</span>
                  </div>
                  <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                    <div className="h-full bg-success-500 w-[90%]"></div>
                  </div>
                </div>
                <div className="pt-3 border-t border-dark-600">
                  <p className="text-text-tertiary text-sm mb-1">Last Authentication</p>
                  <p className="text-text-primary">2024-12-24 09:15:22</p>
                </div>
                <div className="pt-3 border-t border-dark-600">
                  <p className="text-text-tertiary text-sm mb-1">Risk Level</p>
                  <Badge status="online">LOW</Badge>
                </div>
              </div>
            </Card>
          </div>

          {/* Session Timeline & Policy Decisions */}
          <Card className="lg:col-span-2" padding={false}>
            <div className="p-6 border-b border-dark-600">
              <CardHeader title="Recent Policy Decisions" subtitle="Last 24 hours of enforcement actions" />
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {mockDecisions.map((decision, index) => (
                  <div key={decision.id} className="relative">
                    {index !== mockDecisions.length - 1 && (
                      <div className="absolute left-3 top-8 bottom-0 w-px bg-dark-600"></div>
                    )}
                    <div className="flex gap-4">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        decision.category === 'blocked' ? 'bg-error-900/50' :
                        decision.category === 'warned' ? 'bg-warning-900/50' :
                        'bg-success-900/50'
                      }`}>
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          decision.category === 'blocked' ? 'bg-error-400' :
                          decision.category === 'warned' ? 'bg-warning-400' :
                          'bg-success-400'
                        }`}></div>
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge status={decision.category}>{decision.action}</Badge>
                            <span className="text-text-primary font-mono text-sm">{decision.target}</span>
                          </div>
                          <div className="flex items-center gap-1 text-text-tertiary">
                            <Clock size={14} />
                            <small>{decision.timestamp}</small>
                          </div>
                        </div>
                        <p className="text-text-secondary text-sm">{decision.reason}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}