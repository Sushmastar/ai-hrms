'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, Plus, X, Loader2, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';

const schema = z.object({
  leaveType:  z.enum(['ANNUAL','SICK','CASUAL','MATERNITY','PATERNITY','UNPAID']),
  startDate:  z.string().min(1, 'Required'),
  endDate:    z.string().min(1, 'Required'),
  reason:     z.string().min(5, 'Please provide a reason'),
}).refine(d => new Date(d.endDate) >= new Date(d.startDate), {
  message: 'End date must be on or after start date', path: ['endDate'],
});
type LeaveForm = z.infer<typeof schema>;

const STATUS_COLOR: Record<string, string> = {
  PENDING:   'bg-yellow-50 text-yellow-700',
  APPROVED:  'bg-green-50 text-green-700',
  REJECTED:  'bg-red-50 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};
const STATUS_ICON: Record<string, any> = {
  PENDING:   Clock,
  APPROVED:  CheckCircle,
  REJECTED:  XCircle,
  CANCELLED: X,
};

export default function MyLeavesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['my-leaves'],
    queryFn: () => api.get('/leaves').then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<LeaveForm>({ resolver: zodResolver(schema), defaultValues: { leaveType: 'ANNUAL' } });

  const submitMutation = useMutation({
    mutationFn: (d: LeaveForm) => api.post('/leaves', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-leaves'] });
      setShowForm(false); reset();
      setMsg('✅ Leave request submitted successfully');
      setTimeout(() => setMsg(''), 4000);
    },
    onError: (e: any) => setMsg(`❌ ${e.response?.data?.error || 'Failed to submit'}`),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/leaves/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-leaves'] }),
  });

  const leaves = data?.data || [];
  const pending  = leaves.filter((l: any) => l.status === 'PENDING').length;
  const approved = leaves.filter((l: any) => l.status === 'APPROVED').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" /> My Leave Requests
          </h1>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" /> Request Leave
          </button>
        </div>

        {msg && (
          <div className={`text-sm rounded-lg p-3 flex justify-between ${msg.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {msg}<button onClick={() => setMsg('')}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Requests', value: leaves.length, color: 'text-gray-900' },
            { label: 'Pending',        value: pending,        color: 'text-yellow-600' },
            { label: 'Approved',       value: approved,       color: 'text-green-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Leave list */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
          ) : leaves.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">No leave requests yet. Click "Request Leave" to submit one.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {leaves.map((l: any) => {
                const Icon = STATUS_ICON[l.status] || Clock;
                return (
                  <div key={l.id} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-1.5 rounded-lg ${STATUS_COLOR[l.status]}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {l.leaveType.replace('_', ' ')}
                          <span className="text-gray-400 font-normal ml-2">({l.days} day{l.days > 1 ? 's' : ''})</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {format(new Date(l.startDate), 'MMM d')} – {format(new Date(l.endDate), 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 max-w-sm truncate">{l.reason}</p>
                        {l.rejectedReason && (
                          <p className="text-xs text-red-500 mt-0.5">Reason: {l.rejectedReason}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOR[l.status]}`}>
                        {l.status}
                      </span>
                      {l.status === 'PENDING' && (
                        <button onClick={() => cancelMutation.mutate(l.id)}
                          disabled={cancelMutation.isPending}
                          className="text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-50">
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Request Leave Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Request Leave</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit(d => submitMutation.mutate(d))} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Leave Type *</label>
                <select {...register('leaveType')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  {['ANNUAL','SICK','CASUAL','MATERNITY','PATERNITY','UNPAID'].map(t => (
                    <option key={t} value={t}>{t.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Start Date *</label>
                  <input {...register('startDate')} type="date"
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">End Date *</label>
                  <input {...register('endDate')} type="date"
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Reason *</label>
                <textarea {...register('reason')} rows={3} placeholder="Explain the reason for your leave…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason.message}</p>}
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" disabled={isSubmitting || submitMutation.isPending}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
                  {submitMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitMutation.isPending ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
