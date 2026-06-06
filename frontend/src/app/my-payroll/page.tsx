'use client';

import { useQuery } from '@tanstack/react-query';
import { DollarSign, Download } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function MyPayrollPage() {
  const { user } = useAuthStore();

  const { data: records, isLoading } = useQuery({
    queryKey: ['my-payroll', user?.id],
    queryFn: () => api.get(`/payroll/${user?.id}/history`).then(r => r.data),
    enabled: !!user?.id,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">My Pay Slips</h1>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : (
          <div className="grid gap-4">
            {(records || []).map((r: any) => {
              const ded = typeof r.deductions === 'string' ? JSON.parse(r.deductions) : r.deductions;
              return (
                <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <DollarSign className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{r.period}</p>
                        <p className="text-xs text-gray-500 capitalize">{r.status.toLowerCase()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        ₹{Number(r.netPay).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">Net Pay</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-50">
                    <div>
                      <p className="text-xs text-gray-400">Gross Pay</p>
                      <p className="text-sm font-medium text-gray-800">₹{Number(r.grossPay).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Tax</p>
                      <p className="text-sm font-medium text-red-600">-₹{Number(ded?.tax || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">PF</p>
                      <p className="text-sm font-medium text-red-600">-₹{Number(ded?.pf || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {!records?.length && (
              <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
                No payroll records found
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
