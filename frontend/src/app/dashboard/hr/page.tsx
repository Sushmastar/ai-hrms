'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Users, Briefcase, Clock, AlertTriangle, UserPlus, FileSearch,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function HRDashboard() {
  const { user } = useAuthStore();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/analytics/dashboard').then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: heatmap } = useQuery({
    queryKey: ['attendance-heatmap'],
    queryFn: () => api.get('/analytics/attendance-heatmap?days=14').then(r => r.data),
  });

  const cards = [
    { label: 'Total Employees',  value: stats?.totalEmployees,  icon: Users,         color: 'bg-blue-50 text-blue-600'    },
    { label: 'New Hires',        value: stats?.newHires,        icon: UserPlus,      color: 'bg-green-50 text-green-600'  },
    { label: 'Open Positions',   value: stats?.openJobs,        icon: Briefcase,     color: 'bg-purple-50 text-purple-600'},
    { label: 'Pending Leaves',   value: stats?.pendingLeaves,   icon: Clock,         color: 'bg-yellow-50 text-yellow-600'},
    { label: 'Anomalies',        value: stats?.recentAnomalies, icon: AlertTriangle, color: 'bg-red-50 text-red-600'      },
    { label: 'Present Today',    value: stats?.todayAttendance, icon: FileSearch,    color: 'bg-teal-50 text-teal-600'    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">HR Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.firstName}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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

      {/* Attendance bar chart */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">Attendance — Last 14 Days</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={heatmap || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d?.slice(5) ?? ''} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="PRESENT" fill="#22c55e" name="Present" />
            <Bar dataKey="LATE"    fill="#f59e0b" name="Late" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quick actions — using Link not <a> */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Add Employee',    href: '/employees',   color: 'bg-blue-600'   },
          { label: 'Post Job',        href: '/recruitment', color: 'bg-purple-600' },
          { label: 'View Anomalies',  href: '/attendance',  color: 'bg-red-600'    },
          { label: 'Process Payroll', href: '/payroll',     color: 'bg-green-600'  },
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
