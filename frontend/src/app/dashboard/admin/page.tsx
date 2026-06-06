'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Users, Clock, DollarSign, Briefcase, TrendingUp, AlertTriangle,
  UserPlus, CheckCircle,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function AdminDashboard() {
  const { user } = useAuthStore();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/analytics/dashboard').then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: headcount } = useQuery({
    queryKey: ['headcount'],
    queryFn: () => api.get('/analytics/headcount?months=12').then(r => r.data),
  });

  const { data: payrollTrend } = useQuery({
    queryKey: ['payroll-trend'],
    queryFn: () => api.get('/analytics/payroll-trend?months=6').then(r => r.data),
  });

  const statCards = [
    { label: 'Total Employees', value: stats?.totalEmployees?.toLocaleString(), icon: Users,        color: 'bg-blue-50 text-blue-600',    delta: 'registered' },
    { label: 'Active Today',    value: stats?.todayAttendance?.toLocaleString(), icon: CheckCircle,  color: 'bg-green-50 text-green-600',  delta: 'checked in' },
    { label: 'Open Positions',  value: stats?.openJobs,                          icon: Briefcase,    color: 'bg-purple-50 text-purple-600',delta: 'accepting apps' },
    { label: 'New Hires',       value: stats?.newHires,                          icon: UserPlus,     color: 'bg-indigo-50 text-indigo-600',delta: 'this month' },
    { label: 'Pending Leaves',  value: stats?.pendingLeaves,                     icon: Clock,        color: 'bg-yellow-50 text-yellow-600',delta: 'awaiting approval' },
    { label: 'Anomalies',       value: stats?.recentAnomalies,                   icon: AlertTriangle,color: 'bg-red-50 text-red-600',      delta: 'unresolved' },
    { label: 'Active Staff',    value: stats?.activeEmployees?.toLocaleString(), icon: TrendingUp,   color: 'bg-teal-50 text-teal-600',    delta: 'currently active' },
    { label: 'Departments',     value: '12',                                     icon: DollarSign,   color: 'bg-orange-50 text-orange-600',delta: 'across org' },
  ];

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Management Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Welcome back, {user?.firstName} · {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500 font-medium">{card.label}</span>
                <div className={`p-2 rounded-lg ${card.color}`}><Icon className="w-4 h-4" /></div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value ?? '—'}</p>
              <p className="text-xs text-gray-400 mt-1">{card.delta}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Headcount Trend (12 months)</h3>
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

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Payroll Disbursement (6 months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={payrollTrend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(val: number) => [`₹${Number(val).toLocaleString()}`, 'Net Pay']} />
              <Bar dataKey="totalNetPay" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick actions — Link not <a> so auth state is preserved */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Process Payroll', href: '/payroll',     color: 'bg-blue-600'   },
          { label: 'Screen Resumes',  href: '/recruitment', color: 'bg-purple-600' },
          { label: 'View Anomalies',  href: '/attendance',  color: 'bg-red-600'    },
          { label: 'All Employees',   href: '/employees',   color: 'bg-green-600'  },
        ].map(action => (
          <Link key={action.label} href={action.href}
            className={`${action.color} text-white text-sm font-medium text-center py-3 rounded-xl hover:opacity-90 transition`}>
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
