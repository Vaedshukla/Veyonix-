import React from 'react';
import { Activity, AlertTriangle, BookOpen, Clock, TrendingUp } from 'lucide-react';
import { Card, CardHeader } from '../components/Card';
import { Badge } from '../components/Badge';
import { useNavigate } from 'react-router-dom';
import { Shield, LogOut } from 'lucide-react';

interface FocusSession {
  id: string;
  date: string;
  duration: string;
  score: number;
  status: 'good' | 'fair' | 'needs-improvement';
}

const mockSessions: FocusSession[] = [
  { id: '1', date: 'Dec 24', duration: '3h 15m', score: 85, status: 'good' },
  { id: '2', date: 'Dec 23', duration: '2h 45m', score: 72, status: 'fair' },
  { id: '3', date: 'Dec 22', duration: '4h 10m', score: 92, status: 'good' },
  { id: '4', date: 'Dec 21', duration: '2h 20m', score: 65, status: 'needs-improvement' },
];

export function Student() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Simple Header */}
      <div className="bg-dark-950 border-b border-dark-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-dark-850 border border-dark-600 rounded-lg flex items-center justify-center">
              <Shield size={20} className="text-text-secondary" />
            </div>
            <div>
              <h3 className="text-text-primary">Project Alpha</h3>
              <p className="text-text-tertiary text-sm">Student Portal</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-text-tertiary hover:text-text-secondary hover:bg-dark-850 rounded-md transition-colors text-sm"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Focus Score */}
        <div className="mb-8">
          <Card>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-success-900/30 mb-4">
                <div className="text-center">
                  <p className="text-3xl font-semibold text-success-300">78%</p>
                  <p className="text-success-400 text-sm">Focus</p>
                </div>
              </div>
              <h2 className="text-text-primary mb-2">Great Focus This Week!</h2>
              <p className="text-text-tertiary">You've been staying on task and meeting your goals</p>
              <div className="flex items-center justify-center gap-2 mt-4 text-success-400">
                <TrendingUp size={18} />
                <span>+5% from last week</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary-900/30 rounded-lg">
                <Clock size={24} className="text-primary-400" />
              </div>
              <div>
                <p className="text-text-tertiary text-sm mb-1">Focus Time Today</p>
                <p className="text-text-primary text-xl font-semibold">3h 15m</p>
                <p className="text-text-disabled text-sm">Goal: 4 hours</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-success-900/30 rounded-lg">
                <BookOpen size={24} className="text-success-400" />
              </div>
              <div>
                <p className="text-text-tertiary text-sm mb-1">Learning Sites</p>
                <p className="text-text-primary text-xl font-semibold">12 visits</p>
                <p className="text-text-disabled text-sm">Keep it up!</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-warning-900/30 rounded-lg">
                <AlertTriangle size={24} className="text-warning-400" />
              </div>
              <div>
                <p className="text-text-tertiary text-sm mb-1">Warnings Today</p>
                <p className="text-text-primary text-xl font-semibold">2</p>
                <p className="text-text-disabled text-sm">Off-task reminders</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Sessions */}
        <Card>
          <CardHeader title="Your Focus Sessions" subtitle="Recent activity and performance" />
          <div className="space-y-3">
            {mockSessions.map((session) => (
              <div 
                key={session.id}
                className="flex items-center justify-between p-4 bg-dark-800 rounded-lg transition-all duration-200 hover:bg-dark-700 cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    session.status === 'good' ? 'bg-success-900/40' :
                    session.status === 'fair' ? 'bg-warning-900/40' :
                    'bg-error-900/40'
                  }`}>
                    <Activity size={20} className={
                      session.status === 'good' ? 'text-success-400' :
                      session.status === 'fair' ? 'text-warning-400' :
                      'text-error-400'
                    } />
                  </div>
                  <div>
                    <p className="text-text-primary">{session.date}</p>
                    <p className="text-text-tertiary text-sm">{session.duration}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-semibold ${
                    session.status === 'good' ? 'text-success-400' :
                    session.status === 'fair' ? 'text-warning-400' :
                    'text-error-400'
                  }`}>
                    {session.score}%
                  </p>
                  <p className="text-text-tertiary text-sm capitalize">
                    {session.status === 'needs-improvement' ? 'Needs Work' : session.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Helpful Tips */}
        <Card className="mt-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <BookOpen size={20} className="text-white" />
              </div>
            </div>
            <div>
              <h4 className="text-text-primary mb-2">Tips for Better Focus</h4>
              <ul className="space-y-1 text-text-secondary text-sm">
                <li>• Take regular 5-minute breaks every hour</li>
                <li>• Keep educational tabs organized and close distracting ones</li>
                <li>• Use the focus timer to stay on track with assignments</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}