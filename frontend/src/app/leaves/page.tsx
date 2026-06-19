'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import DashboardLayout from '@/components/layout/DashboardLayout';

const STATUS_COLOR: Record<string, string> = {
  PENDING:   'bg-yellow-50 text-yellow-700',
  APPROVED:  'bg-green-50 text-green-700',
  REJECTED:  'bg-red-50 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export default function LeavesPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('PENDING');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const canApprove = ['SENIOR_MANAGER','MANAGEMENT_ADMIN','HR_RECRUITER'].includes(user?.role || '');

  const { data, isLoading } = useQuery({
    queryKey: ['leaves', filter],
    queryFn: () => api.get(`/leaves?status=${filter}&limit=50`).then(r => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/leaves/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leaves'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.patch(`/leaves/${id}/reject`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); setRejectId(null); setRejectReason(''); },
  });

  const leaves = data?.data || [];
  const total  = data?.pagination?.total || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" /> Leave Requests
            <span className="text-sm font-normal text-gray-400">({total})</span>
          </h1>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            {['PENDING','APPROVED','REJECTED','CANCELLED'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                  filter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>{s}</button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
          ) : leaves.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">No {filter.toLowerCase()} leave requests</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {/* Header */}
              <div className="grid grid-cols-6 gap-3 px-5 py-2.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <span className="col-span-2">Employee</span>
                <span>Leave Type</span>
                <span>Dates</span>
                <span>Status</span>
                {canApprove && filter === 'PENDING' && <span>Actions</span>}
              </div>

              {leaves.map((l: any) => (
                <div key={l.id} className="grid grid-cols-6 gap-3 px-5 py-4 items-start">
                  <div className="col-span-2">
                    <p className="font-medium text-gray-900 text-sm">{l.employee?.firstName} {l.employee?.lastName}</p>
                    <p className="text-xs text-gray-400">{l.employee?.employeeId} · {l.employee?.department?.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{l.reason}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-700">{l.leaveType.replace('_',' ')}</span>
                    <p className="text-xs text-gray-400 mt-0.5">{l.days} day{l.days > 1 ? 's' : ''}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-700">{format(new Date(l.startDate), 'MMM d')}</p>
                    <p className="text-xs text-gray-400">to {format(new Date(l.endDate), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[l.status]}`}>
                      {l.status}
                    </span>
                    {l.rejectedReason && <p className="text-xs text-red-400 mt-1">{l.rejectedReason}</p>}
                  </div>
                  {canApprove && filter === 'PENDING' && (
                    <div className="flex gap-2">
                      <button onClick={() => approveMutation.mutate(l.id)}
                        disabled={approveMutation.isPending}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition font-medium disabled:opacity-50">
                        <CheckCircle className="w-3 h-3" /> Approve
                      </button>
                      <button onClick={() => setRejectId(l.id)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition font-medium">
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reject reason modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Reject Leave Request</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)…" rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setRejectId(null); setRejectReason(''); }}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={() => rejectMutation.mutate({ id: rejectId, reason: rejectReason })}
                disabled={rejectMutation.isPending}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition">
                {rejectMutation.isPending ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
