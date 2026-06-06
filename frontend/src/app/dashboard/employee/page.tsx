'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Clock, DollarSign, TrendingUp, CheckCircle, Calendar, User } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { format } from 'date-fns';

export default function EmployeeDashboard() {
  const { user } = useAuthStore();

  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/auth/profile').then(r => r.data),
  });

  const { data: attendance } = useQuery({
    queryKey: ['my-attendance', user?.id],
    queryFn: () => api.get(`/attendance/${user?.id}?limit=14`).then(r => r.data),
    enabled: !!user?.id,
  });

  const { data: payroll } = useQuery({
    queryKey: ['my-payroll', user?.id],
    queryFn: () => api.get(`/payroll/${user?.id}/history`).then(r => r.data),
    enabled: !!user?.id,
  });

  const { data: reviews } = useQuery({
    queryKey: ['my-reviews', user?.id],
    queryFn: () => api.get(`/performance/${user?.id}`).then(r => r.data),
    enabled: !!user?.id,
  });

  const latestPayroll = payroll?.[0];
  const latestReview  = reviews?.[0];
  const todayRecord   = attendance?.data?.find((a: any) =>
    new Date(a.date).toDateString() === new Date().toDateString()
  );

  // Chart data from payroll history
  const payrollChartData = (payroll || []).slice(0, 6).reverse().map((p: any) => ({
    period: p.period,
    netPay: Number(p.netPay).toFixed(0),
  }));

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold">Welcome back, {user?.firstName}!</h1>
            <p className="text-blue-100 text-sm mt-0.5">{user?.position} · {user?.department?.name}</p>
            <p className="text-blue-100 text-xs mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
        </div>
      </div>

      {/* Quick stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Today</span>
            <div className="p-1.5 bg-green-50 rounded-lg"><CheckCircle className="w-3.5 h-3.5 text-green-600" /></div>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {todayRecord ? (todayRecord.checkIn ? '✓ Checked In' : 'Not yet') : 'No record'}
          </p>
          {todayRecord?.checkIn && (
            <p className="text-xs text-gray-400 mt-0.5">
              {format(new Date(todayRecord.checkIn), 'h:mm a')}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Last Pay</span>
            <div className="p-1.5 bg-blue-50 rounded-lg"><DollarSign className="w-3.5 h-3.5 text-blue-600" /></div>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {latestPayroll ? `₹${Number(latestPayroll.netPay).toLocaleString()}` : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{latestPayroll?.period || 'No records'}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Performance</span>
            <div className="p-1.5 bg-purple-50 rounded-lg"><TrendingUp className="w-3.5 h-3.5 text-purple-600" /></div>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {latestReview ? `${latestReview.score}/100` : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{latestReview?.reviewPeriod || 'No reviews'}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Work Hours</span>
            <div className="p-1.5 bg-orange-50 rounded-lg"><Clock className="w-3.5 h-3.5 text-orange-600" /></div>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {todayRecord?.workHours ? `${Number(todayRecord.workHours).toFixed(1)}h` : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Today</p>
        </div>
      </div>

      {/* Payroll trend chart */}
      {payrollChartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-500" /> My Net Pay — Last 6 Months
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={payrollChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, 'Net Pay']} />
              <Area type="monotone" dataKey="netPay" stroke="#3b82f6" fill="#eff6ff" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent attendance */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-green-500" /> Recent Attendance
        </h3>
        {attendance?.data?.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No attendance records yet</p>
        ) : (
          <div className="space-y-2">
            {(attendance?.data || []).slice(0, 7).map((a: any) => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${
                    a.status === 'PRESENT' ? 'bg-green-500' :
                    a.status === 'LATE'    ? 'bg-yellow-500' :
                    a.status === 'ABSENT'  ? 'bg-red-500'   : 'bg-gray-300'
                  }`} />
                  <span className="text-sm text-gray-700">{format(new Date(a.date), 'EEE, MMM d')}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{a.checkIn ? format(new Date(a.checkIn), 'h:mm a') : '—'}</span>
                  <span>{a.checkOut ? format(new Date(a.checkOut), 'h:mm a') : '—'}</span>
                  <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${
                    a.status === 'PRESENT' ? 'bg-green-50 text-green-700' :
                    a.status === 'LATE'    ? 'bg-yellow-50 text-yellow-700' :
                    'bg-red-50 text-red-700'
                  }`}>{a.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/my-attendance"
          className="bg-blue-600 text-white text-sm font-medium text-center py-3 rounded-xl hover:opacity-90 transition">
          View Full Attendance
        </Link>
        <Link href="/my-payroll"
          className="bg-green-600 text-white text-sm font-medium text-center py-3 rounded-xl hover:opacity-90 transition">
          Download Pay Slip
        </Link>
      </div>
    </div>
  );
}
