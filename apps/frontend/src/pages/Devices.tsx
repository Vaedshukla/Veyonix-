import React, { useEffect, useState } from 'react';
import { Monitor, Key, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:8080';

interface Device {
  id: string;
  hostname?: string;
  name?: string;
  status: string;
  lastSeenAt?: string;
  lastSeen?: string;
  platform?: string;
  operatingSystem?: string;
}

export function Devices() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enrollmentToken, setEnrollmentToken] = useState('');
  const [generatingToken, setGeneratingToken] = useState(false);
  const [copied, setCopied] = useState(false);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const resolveOrgId = async (): Promise<string | null> => {
    let orgId = localStorage.getItem('orgId');
    if (orgId) return orgId;

    try {
      const res = await fetch(`${API}/api/v1/users/me`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        orgId = (data.data || data).organizationId || null;
        if (orgId) localStorage.setItem('orgId', orgId);
      }
    } catch {
      // ignore
    }
    return orgId;
  };

  const fetchDevices = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/'); return; }

      const orgId = await resolveOrgId();
      if (!orgId) {
        setError('Could not resolve organization. Please log out and sign in again.');
        setLoading(false);
        return;
      }

      const res = await fetch(`${API}/api/v1/organizations/${orgId}/devices`, {
        headers: getHeaders(),
      });

      if (res.status === 401) { localStorage.clear(); navigate('/'); return; }
      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const json = await res.json();
      // Backend returns { data: Device[] }
      const list = json.data ?? json.devices ?? json ?? [];
      setDevices(Array.isArray(list) ? list : []);
    } catch {
      setError('Could not load devices. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const generateEnrollmentToken = async () => {
    setGeneratingToken(true);
    setError('');
    setEnrollmentToken('');

    try {
      const orgId = await resolveOrgId();
      if (!orgId) throw new Error('No organization ID');

      const res = await fetch(`${API}/api/v1/organizations/${orgId}/devices/tokens`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ maxUses: 1, expiresInDays: 1 }),
      });

      if (!res.ok) throw new Error('Failed to generate token');

      const json = await res.json();
      const tok = (json.data?.token) || json.token || json.enrollmentToken || '';
      setEnrollmentToken(tok);
    } catch {
      setError('Could not generate enrollment token.');
    } finally {
      setGeneratingToken(false);
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(enrollmentToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayName = (d: Device) => d.hostname || d.name || d.id.slice(0, 8).toUpperCase();
  const displayPlatform = (d: Device) => d.operatingSystem || d.platform || 'Unknown';
  const displayLastSeen = (d: Device) => {
    const ts = d.lastSeenAt || d.lastSeen;
    if (!ts) return 'Never';
    return new Date(ts).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Devices</h1>
          <p className="text-slate-400 mt-1">Manage and monitor connected devices</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDevices}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={generateEnrollmentToken}
            disabled={generatingToken}
            className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50"
          >
            {generatingToken ? <Loader2 size={18} className="animate-spin" /> : <Key size={18} />}
            Generate Enrollment Token
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
          <AlertCircle size={20} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-red-300 font-medium">{error}</p>
        </div>
      )}

      {enrollmentToken && (
        <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
          <h3 className="text-indigo-400 font-semibold mb-2">New Enrollment Token Generated</h3>
          <p className="text-slate-300 mb-4 text-sm">Use this token to enroll a new device. It expires in 24 hours.</p>
          <div className="flex items-center gap-4">
            <code className="px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-indigo-300 font-mono text-sm flex-1 overflow-x-auto break-all">
              {enrollmentToken}
            </code>
            <button
              onClick={copyToken}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium whitespace-nowrap"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 size={32} className="animate-spin text-indigo-500" />
          </div>
        ) : devices.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-800 rounded-full mb-4">
              <Monitor size={32} className="text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No devices enrolled</h3>
            <p className="text-slate-400 max-w-sm mx-auto">
              Generate an enrollment token and run the Veyonix agent on your first device to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50 border-b border-slate-800 text-slate-400 text-sm">
                  <th className="px-6 py-4 font-medium">Device Name</th>
                  <th className="px-6 py-4 font-medium">Platform</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {devices.map((device) => (
                  <tr key={device.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Monitor size={18} className="text-slate-500 shrink-0" />
                        <span className="font-medium text-slate-200 font-mono text-sm">
                          {displayName(device)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{displayPlatform(device)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        device.status?.toLowerCase() === 'active' || device.status?.toLowerCase() === 'online'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                      }`}>
                        {device.status?.toLowerCase() === 'active' ? 'online' : device.status?.toLowerCase() ?? 'offline'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{displayLastSeen(device)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
