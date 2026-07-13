import React, { useState } from 'react';
import { Shield, Plus, FileText, Globe, MonitorPlay, Clock } from 'lucide-react';
import { Card, CardHeader } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/Table';

interface Policy {
  id: string;
  name: string;
  category: 'web' | 'app' | 'time' | 'content';
  action: 'allowed' | 'blocked' | 'warned';
  scope: string;
  status: 'active' | 'inactive';
  appliedTo: number;
}

const mockPolicies: Policy[] = [
  {
    id: '1',
    name: 'Block Gaming Sites',
    category: 'web',
    action: 'blocked',
    scope: 'Domain: *.gaming.*, *.twitch.tv',
    status: 'active',
    appliedTo: 12
  },
  {
    id: '2',
    name: 'Focus Time Enforcement',
    category: 'time',
    action: 'blocked',
    scope: 'Schedule: Mon-Fri 9AM-3PM',
    status: 'active',
    appliedTo: 8
  },
  {
    id: '3',
    name: 'Social Media Warning',
    category: 'web',
    action: 'warned',
    scope: 'Domain: facebook.com, instagram.com, tiktok.com',
    status: 'active',
    appliedTo: 15
  },
  {
    id: '4',
    name: 'Block Messaging Apps',
    category: 'app',
    action: 'blocked',
    scope: 'Apps: Discord, Slack, WhatsApp',
    status: 'active',
    appliedTo: 12
  },
  {
    id: '5',
    name: 'Educational Whitelist',
    category: 'web',
    action: 'allowed',
    scope: 'Domain: *.edu, github.com, stackoverflow.com',
    status: 'active',
    appliedTo: 20
  },
];

const categoryIcons = {
  web: <Globe size={18} />,
  app: <MonitorPlay size={18} />,
  time: <Clock size={18} />,
  content: <FileText size={18} />,
};

export function Policies() {
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [testInput, setTestInput] = useState('');
  const [testType, setTestType] = useState('domain');
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleEditPolicy = () => {
    alert(`Editing policy: ${selectedPolicy?.name}`);
  };

  const handleTestPolicy = () => {
    alert(`Testing policy: ${selectedPolicy?.name}`);
  };

  const handleDeactivate = () => {
    if (confirm(`Are you sure you want to deactivate "${selectedPolicy?.name}"?`)) {
      alert('Policy deactivated');
      setSelectedPolicy(null);
    }
  };

  const handleTestDecision = () => {
    if (!testInput) {
      setTestResult('Please enter a test input');
      return;
    }
    
    // Simulate policy test
    const matchedPolicy = mockPolicies.find(p => 
      testInput.toLowerCase().includes('gaming') || 
      testInput.toLowerCase().includes('discord') ||
      testInput.toLowerCase().includes('instagram')
    );
    
    if (matchedPolicy) {
      setTestResult(`✓ Match found: Policy "${matchedPolicy.name}" would ${matchedPolicy.action.toUpperCase()} this ${testType}`);
    } else {
      setTestResult(`✓ No matching policy - this ${testType} would be ALLOWED by default`);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-dark-900">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-text-primary mb-2">Policy Management</h1>
          <p className="text-text-tertiary">Configure and manage behavior control policies</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Policy List */}
          <Card className="lg:col-span-2" padding={false}>
            <div className="p-6 border-b border-dark-600">
              <h3 className="text-text-primary">Active Policies</h3>
              <p className="text-text-tertiary mt-1">Currently enforced rules across all agents</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Applied To</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockPolicies.map((policy) => (
                  <TableRow
                    key={policy.id}
                    onClick={() => setSelectedPolicy(policy)}
                    className={selectedPolicy?.id === policy.id ? 'bg-dark-700' : ''}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="text-text-tertiary">
                          {categoryIcons[policy.category]}
                        </div>
                        <span>{policy.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-dark-700 text-text-secondary rounded capitalize text-sm">
                        {policy.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge status={policy.action}>{policy.action.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-text-tertiary">
                      {policy.appliedTo} agents
                    </TableCell>
                    <TableCell>
                      <Badge status={policy.status === 'active' ? 'active' : 'inactive'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Policy Detail Panel */}
          <div>
            {selectedPolicy ? (
              <Card>
                <CardHeader title="Policy Details" />
                <div className="space-y-4">
                  <div>
                    <p className="text-text-tertiary text-sm mb-1">Policy Name</p>
                    <p className="text-text-primary">{selectedPolicy.name}</p>
                  </div>

                  <div className="pt-4 border-t border-dark-600">
                    <p className="text-text-tertiary text-sm mb-2">Category</p>
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-dark-800 rounded">
                        {categoryIcons[selectedPolicy.category]}
                      </div>
                      <span className="text-text-primary capitalize">{selectedPolicy.category}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-dark-600">
                    <p className="text-text-tertiary text-sm mb-2">Action</p>
                    <Badge status={selectedPolicy.action}>
                      {selectedPolicy.action.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="pt-4 border-t border-dark-600">
                    <p className="text-text-tertiary text-sm mb-1">Scope</p>
                    <p className="text-text-primary font-mono text-sm">{selectedPolicy.scope}</p>
                  </div>

                  <div className="pt-4 border-t border-dark-600">
                    <p className="text-text-tertiary text-sm mb-1">Applied To</p>
                    <p className="text-text-primary">{selectedPolicy.appliedTo} active agents</p>
                  </div>

                  <div className="pt-4 border-t border-dark-600">
                    <p className="text-text-tertiary text-sm mb-2">Status</p>
                    <Badge status={selectedPolicy.status === 'active' ? 'active' : 'inactive'} />
                  </div>

                  <div className="pt-4 border-t border-dark-600 space-y-2">
                    <Button variant="secondary" size="sm" className="w-full" onClick={handleEditPolicy}>
                      Edit Policy
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full" onClick={handleTestPolicy}>
                      Test Policy
                    </Button>
                    <Button variant="danger" size="sm" className="w-full" onClick={handleDeactivate}>
                      Deactivate
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card>
                <div className="text-center py-12">
                  <div className="inline-flex p-4 bg-dark-800 rounded-full mb-4">
                    <Shield size={32} className="text-text-disabled" />
                  </div>
                  <h4 className="text-text-primary mb-2">No Policy Selected</h4>
                  <p className="text-text-tertiary">Select a policy to view details</p>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Policy Sandbox */}
        <Card className="mt-6">
          <CardHeader 
            title="Policy Sandbox" 
            subtitle="Test policy decisions without enforcement"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-text-secondary text-sm font-medium mb-2">Test Input</label>
              <input
                type="text"
                placeholder="e.g., gaming.example.com"
                className="w-full px-3 py-2 bg-dark-800 border border-dark-600 text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 hover:border-dark-500 placeholder-text-disabled"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-text-secondary text-sm font-medium mb-2">Input Type</label>
              <select className="w-full px-3 py-2 bg-dark-800 border border-dark-600 text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200 hover:border-dark-500"
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
              >
                <option value="domain">Domain</option>
                <option value="application">Application</option>
                <option value="url">URL</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button variant="secondary" size="md" className="w-full" onClick={handleTestDecision}>
                Test Decision
              </Button>
            </div>
          </div>
          <div className="mt-4 p-4 bg-dark-800 border border-dark-600 rounded-md">
            {testResult ? (
              <p className="text-text-tertiary">{testResult}</p>
            ) : (
              <p className="text-text-tertiary">Test results will appear here</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}