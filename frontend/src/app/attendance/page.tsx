'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function AttendancePage() {
  const { data: daily } = useQuery({
    queryKey: ['daily-attendance'],
    queryFn: () => api.get('/attendance/daily').then(r => r.data),
    refetchInterval: 60000,
  });

  const { data: anomalies } = useQuery({
    queryKey: ['anomalies'],
    queryFn: () => api.get('/attendance/anomalies?resolved=false').then(r => r.data),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendance Overview</h1>

        {/* Today's stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Present',   value: daily?.present,   color: 'text-green-600',  bg: 'bg-green-50',  icon: CheckCircle  },
            { label: 'Late',      value: daily?.late,      color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Clock        },
            { label: 'Absent',    value: daily?.absent,    color: 'text-red-600',    bg: 'bg-red-50',    icon: AlertTriangle},
            { label: 'On Leave',  value: daily?.onLeave,   color: 'text-blue-600',   bg: 'bg-blue-50',   icon: Clock        },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-medium">{s.label}</span>
                  <div className={`p-2 rounded-lg ${s.bg}`}><Icon className={`w-4 h-4 ${s.color}`} /></div>
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value ?? '—'}</p>
              </div>
            );
          })}
        </div>

        {/* Anomalies list */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-50">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              AI-Detected Anomalies
              {anomalies?.pagination?.total > 0 && (
                <span className="ml-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {anomalies.pagination.total}
                </span>
              )}
            </h2>
          </div>

          <div className="divide-y divide-gray-50">
            {(anomalies?.data || []).map((a: any) => (
              <div key={a.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                    a.severity >= 3 ? 'bg-red-500' : a.severity === 2 ? 'bg-yellow-500' : 'bg-blue-400'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {a.employee?.firstName} {a.employee?.lastName}
                      <span className="ml-2 text-xs text-gray-400">({a.employee?.employeeId})</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {a.attendance?.date ? format(new Date(a.attendance.date), 'MMM d, yyyy') : ''}
                      {' · '}AI confidence: {(a.aiConfidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
                <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${
                  a.severity >= 3 ? 'bg-red-50 text-red-700' :
                  a.severity === 2 ? 'bg-yellow-50 text-yellow-700' :
                  'bg-blue-50 text-blue-700'
                }`}>
                  {a.anomalyType.replace(/_/g,' ')}
                </span>
              </div>
            ))}
            {!anomalies?.data?.length && (
              <p className="p-8 text-center text-gray-400 text-sm">No unresolved anomalies 🎉</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
