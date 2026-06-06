'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, LogIn, LogOut, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function MyAttendancePage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [msg, setMsg] = useState('');

  const { data: attendance, isLoading } = useQuery({
    queryKey: ['my-attendance', user?.id],
    queryFn: () => api.get(`/attendance/${user?.id}?limit=30`).then(r => r.data),
    enabled: !!user?.id,
  });

  const checkIn = useMutation({
    mutationFn: () => api.post('/attendance/check-in'),
    onSuccess: () => { setMsg('✅ Checked in successfully'); qc.invalidateQueries({ queryKey: ['my-attendance'] }); },
    onError: (e: any) => setMsg(`❌ ${e.response?.data?.error || 'Check-in failed'}`),
  });

  const checkOut = useMutation({
    mutationFn: () => api.post('/attendance/check-out'),
    onSuccess: () => { setMsg('✅ Checked out successfully'); qc.invalidateQueries({ queryKey: ['my-attendance'] }); },
    onError: (e: any) => setMsg(`❌ ${e.response?.data?.error || 'Check-out failed'}`),
  });

  const today = attendance?.data?.find((a: any) =>
    new Date(a.date).toDateString() === new Date().toDateString()
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>

        {/* Today's card */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            Today — {format(new Date(), 'EEEE, MMMM d')}
          </h2>

          {msg && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">{msg}</div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Check In</p>
              <p className="font-semibold text-gray-900">
                {today?.checkIn ? format(new Date(today.checkIn), 'hh:mm a') : '—'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Check Out</p>
              <p className="font-semibold text-gray-900">
                {today?.checkOut ? format(new Date(today.checkOut), 'hh:mm a') : '—'}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => checkIn.mutate()}
              disabled={!!today?.checkIn || checkIn.isPending}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <LogIn className="w-4 h-4" />
              {checkIn.isPending ? 'Checking in...' : 'Check In'}
            </button>
            <button
              onClick={() => checkOut.mutate()}
              disabled={!today?.checkIn || !!today?.checkOut || checkOut.isPending}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <LogOut className="w-4 h-4" />
              {checkOut.isPending ? 'Checking out...' : 'Check Out'}
            </button>
          </div>
        </div>

        {/* History */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-50">
            <h2 className="font-semibold text-gray-800">Attendance History</h2>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {(attendance?.data || []).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {format(new Date(a.date), 'EEE, MMM d yyyy')}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a.checkIn ? format(new Date(a.checkIn), 'h:mm a') : '—'} →{' '}
                      {a.checkOut ? format(new Date(a.checkOut), 'h:mm a') : '—'}
                      {a.workHours ? ` · ${Number(a.workHours).toFixed(1)}h` : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    a.status === 'PRESENT'       ? 'bg-green-50 text-green-700' :
                    a.status === 'LATE'          ? 'bg-yellow-50 text-yellow-700' :
                    a.status === 'ON_LEAVE'      ? 'bg-blue-50 text-blue-700' :
                    a.status === 'WORK_FROM_HOME'? 'bg-purple-50 text-purple-700' :
                    'bg-red-50 text-red-700'
                  }`}>{a.status.replace('_', ' ')}</span>
                </div>
              ))}
              {!attendance?.data?.length && (
                <p className="p-8 text-center text-gray-400 text-sm">No records found</p>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
