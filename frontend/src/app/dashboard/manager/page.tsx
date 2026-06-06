'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Users, TrendingUp, Clock, AlertTriangle, CheckCircle, BarChart2,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function ManagerDashboard() {
  const { user } = useAuthStore();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/analytics/dashboard').then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: headcount } = useQuery({
    queryKey: ['headcount'],
    queryFn: () => api.get('/analytics/headcount?months=6').then(r => r.data),
  });

  const cards = [
    { label: 'Active Employees',  value: stats?.activeEmployees,   icon: Users,       color: 'bg-blue-50 text-blue-600'   },
    { label: 'Present Today',     value: stats?.todayAttendance,   icon: CheckCircle, color: 'bg-green-50 text-green-600' },
    { label: 'Pending Leaves',    value: stats?.pendingLeaves,     icon: Clock,       color: 'bg-yellow-50 text-yellow-600'},
    { label: 'Open Anomalies',    value: stats?.recentAnomalies,   icon: AlertTriangle,color:'bg-red-50 text-red-600'      },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.firstName}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500 font-medium">{c.label}</span>
                <div className={`p-2 rounded-lg ${c.color}`}><Icon className="w-4 h-4" /></div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{c.value ?? '—'}</p>
            </div>
          );
        })}
      </div>

      {/* Headcount chart */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-blue-500" /> Headcount Trend (6 months)
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={headcount || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#eff6ff" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'View My Team',        href: '/employees',   color: 'bg-blue-600'   },
          { label: 'Performance Reports', href: '/performance', color: 'bg-purple-600' },
          { label: 'Attendance Overview', href: '/attendance',  color: 'bg-green-600'  },
        ].map(a => (
          <Link key={a.label} href={a.href}
            className={`${a.color} text-white text-sm font-medium text-center py-3 rounded-xl hover:opacity-90 transition`}>
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
