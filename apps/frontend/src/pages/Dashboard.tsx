import React, { useEffect, useState } from 'react';
import { Shield, AlertCircle, Activity, XCircle, Clock, Loader2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/StatCard';
import { Card, CardHeader } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';

const API = 'http://localhost:8080';

interface ActivityItem {
  id: string;
  timestamp: string;
  device: string;
  action: string;
  category: 'blocked' | 'warned' | 'allowed';
  details: string;
}

interface AgentItem {
  id: string;
  name: string;
  status: string;
  lastSeen: string | null;
}

interface DashboardStats {
  activeAgents: number;
  policyViolations: number;
  blockedActions: number;
  totalMonitored: number;
}

function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function Dashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const orgId = localStorage.getItem('orgId');

      if (!token) {
        navigate('/');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      // If orgId not cached yet, fetch it from /users/me
      let resolvedOrgId = orgId;
      if (!resolvedOrgId) {
        const meRes = await fetch(`${API}/api/v1/users/me`, { headers });
        if (meRes.ok) {
          const meData = await meRes.json();
          resolvedOrgId = (meData.data || meData).organizationId || null;
          if (resolvedOrgId) localStorage.setItem('orgId', resolvedOrgId);
        }
      }

      if (!resolvedOrgId) {
        setError('Could not resolve your organization. Please log out and log back in.');
        setLoading(false);
        return;
      }

      // Fetch real dashboard stats from the backend
      const res = await fetch(`${API}/api/v1/organizations/${resolvedOrgId}/dashboard-stats`, { headers });

      if (res.status === 401) {
        localStorage.clear();
        navigate('/');
        return;
      }

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const json = await res.json();
      const data = json.data || json;

      setStats(data.stats);
      setAgents((data.devices || []) as AgentItem[]);
      setActivity((data.recentActivity || []) as ActivityItem[]);
    } catch (err: any) {
      setError('Could not load dashboard data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboard, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 overflow-auto bg-dark-900">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-text-primary mb-2">Dashboard</h1>
            <p className="text-text-tertiary">Real-time system overview and activity monitoring</p>
          </div>
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
            <AlertCircle size={20} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-red-300 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        {loading && !stats ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={36} className="animate-spin text-indigo-500" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Active Agents"
                value={String(stats?.activeAgents ?? 0)}
                change={{ value: `${stats?.totalMonitored ?? 0} total enrolled`, trend: 'neutral' }}
                icon={<Shield size={24} />}
                variant="default"
              />
              <StatCard
                title="Policy Violations"
                value={String(stats?.policyViolations ?? 0)}
                change={{ value: 'From audit logs', trend: stats?.policyViolations ? 'up' : 'neutral' }}
                icon={<AlertCircle size={24} />}
                variant="warning"
              />
              <StatCard
                title="Blocked Actions"
                value={String(stats?.blockedActions ?? 0)}
                change={{ value: 'Last 10 events', trend: stats?.blockedActions ? 'up' : 'neutral' }}
                icon={<XCircle size={24} />}
                variant="error"
              />
              <StatCard
                title="Total Monitored"
                value={String(stats?.totalMonitored ?? 0)}
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
                  {activity.length === 0 ? (
                    <div className="p-10 text-center text-slate-500 text-sm">
                      No activity yet. Enroll your first device to start seeing events.
                    </div>
                  ) : (
                    activity.map((item) => (
                      <div key={item.id} className="p-4 hover:bg-dark-800 transition-all duration-200 cursor-pointer hover:pl-6">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge status={item.category}>{item.action}</Badge>
                            <span className="text-text-primary font-mono text-sm">{item.device}</span>
                          </div>
                          <div className="flex items-center gap-1 text-text-tertiary">
                            <Clock size={14} />
                            <small>{timeAgo(item.timestamp)}</small>
                          </div>
                        </div>
                        <p className="text-text-secondary text-sm truncate">{item.details}</p>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Agent Status */}
              <Card>
                <CardHeader title="Agent Status" subtitle="Connected devices" />
                <div className="space-y-3">
                  {agents.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-6">
                      No devices enrolled yet.
                    </p>
                  ) : (
                    agents.map((agent) => (
                      <div
                        key={agent.id}
                        className="flex items-center justify-between p-3 bg-dark-800 rounded-md transition-all duration-200 hover:bg-dark-700 cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary font-mono text-sm truncate">{agent.name || agent.id}</p>
                          <p className="text-text-tertiary text-sm">
                            {agent.lastSeen ? timeAgo(agent.lastSeen) : 'Never seen'}
                          </p>
                        </div>
                        <Badge status={agent.status as 'online' | 'offline'} />
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-dark-600">
                  <Button variant="secondary" size="sm" className="w-full" onClick={() => navigate('/devices')}>
                    View All Devices
                  </Button>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}