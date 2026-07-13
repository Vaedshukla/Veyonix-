import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Agents } from './pages/Agents';
import { AgentDetail } from './pages/AgentDetail';
import { Policies } from './pages/Policies';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Student } from './pages/Student';

function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-dark-900">
      <Sidebar />
      {children}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Login */}
        <Route path="/" element={<Login />} />
        
        {/* Register */}
        <Route path="/register" element={<Register />} />
        
        {/* Student View */}
        <Route path="/student" element={<Student />} />
        
        {/* Admin Routes */}
        <Route
          path="/dashboard"
          element={
            <AdminLayout>
              <Dashboard />
            </AdminLayout>
          }
        />
        <Route
          path="/agents"
          element={
            <AdminLayout>
              <Agents />
            </AdminLayout>
          }
        />
        <Route
          path="/agents/:id"
          element={
            <AdminLayout>
              <AgentDetail />
            </AdminLayout>
          }
        />
        <Route
          path="/policies"
          element={
            <AdminLayout>
              <Policies />
            </AdminLayout>
          }
        />
        <Route
          path="/reports"
          element={
            <AdminLayout>
              <Reports />
            </AdminLayout>
          }
        />
        <Route
          path="/settings"
          element={
            <AdminLayout>
              <Settings />
            </AdminLayout>
          }
        />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}