import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/Table';

interface Agent {
  id: string;
  deviceId: string;
  os: string;
  osVersion: string;
  capabilities: string[];
  status: 'online' | 'offline';
  lastSeen: string;
  tokenExpiry: string;
  riskLevel: 'low' | 'medium' | 'high';
}

const mockAgents: Agent[] = [
  {
    id: '1',
    deviceId: 'LAPTOP-WIN-4872',
    os: 'Windows',
    osVersion: '11 Pro',
    capabilities: ['web', 'app', 'network'],
    status: 'online',
    lastSeen: '1 min ago',
    tokenExpiry: '29 days',
    riskLevel: 'low'
  },
  {
    id: '2',
    deviceId: 'MACBOOK-001',
    os: 'macOS',
    osVersion: '14.2 Sonoma',
    capabilities: ['web', 'app'],
    status: 'online',
    lastSeen: '5 min ago',
    tokenExpiry: '15 days',
    riskLevel: 'low'
  },
  {
    id: '3',
    deviceId: 'CHROMEBOOK-EDU',
    os: 'ChromeOS',
    osVersion: '120.0',
    capabilities: ['web'],
    status: 'online',
    lastSeen: '12 min ago',
    tokenExpiry: '45 days',
    riskLevel: 'low'
  },
  {
    id: '4',
    deviceId: 'IPAD-STUDENT-12',
    os: 'iPadOS',
    osVersion: '17.2',
    capabilities: ['web', 'app'],
    status: 'offline',
    lastSeen: '2 hours ago',
    tokenExpiry: '3 days',
    riskLevel: 'medium'
  },
  {
    id: '5',
    deviceId: 'LAPTOP-WIN-9023',
    os: 'Windows',
    osVersion: '10 Home',
    capabilities: ['web', 'app', 'network'],
    status: 'offline',
    lastSeen: '1 day ago',
    tokenExpiry: 'Expired',
    riskLevel: 'high'
  },
];

export function Agents() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAgents = mockAgents.filter(agent =>
    agent.deviceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.os.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-auto bg-dark-900">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-text-primary mb-2">Agent Monitoring</h1>
          <p className="text-text-tertiary">Monitor and manage deployed system agents</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" />
              <input
                type="text"
                placeholder="Search by device ID or OS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-dark-600 text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 hover:border-dark-500 placeholder-text-disabled"
              />
            </div>
            <Button variant="secondary" size="md">
              <Filter size={18} />
              Filters
            </Button>
          </div>
        </Card>

        {/* Agents Table */}
        <Card padding={false}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device ID</TableHead>
                <TableHead>Operating System</TableHead>
                <TableHead>Capabilities</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead>Token Expiry</TableHead>
                <TableHead>Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgents.map((agent) => (
                <TableRow 
                  key={agent.id}
                  onClick={() => navigate(`/agents/${agent.id}`)}
                >
                  <TableCell>
                    <span className="font-mono">{agent.deviceId}</span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-text-primary">{agent.os}</p>
                      <p className="text-text-tertiary text-sm">{agent.osVersion}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5 flex-wrap">
                      {agent.capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="px-2 py-0.5 bg-dark-700 text-text-secondary rounded text-xs"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge status={agent.status} />
                  </TableCell>
                  <TableCell className="text-text-tertiary">
                    {agent.lastSeen}
                  </TableCell>
                  <TableCell>
                    <span className={
                      agent.tokenExpiry === 'Expired' ? 'text-error-400' :
                      agent.tokenExpiry.includes('3 days') ? 'text-warning-400' :
                      'text-text-tertiary'
                    }>
                      {agent.tokenExpiry}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      status={
                        agent.riskLevel === 'high' ? 'error' :
                        agent.riskLevel === 'medium' ? 'warning' :
                        'online'
                      }
                      showDot={false}
                    >
                      {agent.riskLevel.toUpperCase()}
                    </Badge>
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