'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Play, Loader2, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function PayrollPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'MANAGEMENT_ADMIN';

  const currentPeriod = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const [period, setPeriod] = useState(currentPeriod);
  const [msg, setMsg] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-period', period],
    queryFn: () => api.get(`/payroll/period/${period}`).then(r => r.data),
  });

  const processMutation = useMutation({
    mutationFn: () => api.post('/payroll/process', { period }),
    onSuccess: (r) => {
      setMsg(`✅ Payroll processed — ${r.data.totalEmployees} employees · Total: ₹${Number(r.data.totalNetPay).toLocaleString()}`);
      qc.invalidateQueries({ queryKey: ['payroll-period'] });
    },
    onError: (e: any) => setMsg(`❌ ${e.response?.data?.error || 'Processing failed'}`),
  });

  const periodOptions = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-600" /> Payroll
          </h1>
          <div className="flex items-center gap-3">
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {isAdmin && (
              <button onClick={() => processMutation.mutate()} disabled={processMutation.isPending}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition">
                {processMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</> : <><Play className="w-4 h-4" />Run Payroll</>}
              </button>
            )}
          </div>
        </div>

        {msg && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg p-3 flex justify-between">
            {msg}<button onClick={() => setMsg('')} className="ml-2 text-green-600">✕</button>
          </div>
        )}

        {data && data.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Employees Paid', value: data.length.toLocaleString() },
              { label: 'Total Gross',    value: `₹${data.reduce((s: number, r: any) => s + Number(r.grossPay), 0).toLocaleString()}` },
              { label: 'Total Net Pay', value: `₹${data.reduce((s: number, r: any) => s + Number(r.netPay), 0).toLocaleString()}` },
              { label: 'Period',         value: period },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                <p className="text-lg font-bold text-gray-900">{c.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Employee','Position','Base Salary','Gross Pay','Deductions','Net Pay','Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading
                  ? Array(8).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array(7).fill(0).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-20" /></td>)}
                      </tr>
                    ))
                  : (data || []).map((r: any) => {
                      const ded = typeof r.deductions === 'string' ? JSON.parse(r.deductions) : r.deductions;
                      const totalDed = (ded?.tax || 0) + (ded?.pf || 0) + (ded?.insurance || 0);
                      return (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{r.employee?.firstName} {r.employee?.lastName}</p>
                            <p className="text-xs text-gray-400">{r.employee?.employeeId}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{r.employee?.position}</td>
                          <td className="px-4 py-3 text-gray-700">₹{Number(r.baseSalary).toLocaleString()}</td>
                          <td className="px-4 py-3 text-gray-700">₹{Number(r.grossPay).toLocaleString()}</td>
                          <td className="px-4 py-3 text-red-600">-₹{Number(totalDed).toLocaleString()}</td>
                          <td className="px-4 py-3 font-semibold text-green-700">₹{Number(r.netPay).toLocaleString()}</td>
                          <td className="px-4 py-3 text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />{r.status}</td>
                        </tr>
                      );
                    })
                }
              </tbody>
            </table>
          </div>
          {!isLoading && (!data || data.length === 0) && (
            <p className="text-center py-10 text-gray-400 text-sm">
              No payroll records for {period}.{isAdmin ? ' Click "Run Payroll" to process.' : ''}
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
