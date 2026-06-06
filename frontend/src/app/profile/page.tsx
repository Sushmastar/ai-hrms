'use client';

import { useQuery } from '@tanstack/react-query';
import { User, Mail, Phone, Calendar, Building2, Briefcase, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function ProfilePage() {
  const { user } = useAuthStore();

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/auth/profile').then(r => r.data),
  });

  const emp = profile || user;

  const fields = [
    { icon: Mail,       label: 'Email',       value: emp?.email },
    { icon: Phone,      label: 'Phone',       value: (emp as any)?.phone || 'Not set' },
    { icon: Briefcase,  label: 'Position',    value: emp?.position },
    { icon: Building2,  label: 'Department',  value: emp?.department?.name || '—' },
    { icon: DollarSign, label: 'Salary',      value: (emp as any)?.salary ? `₹${Number((emp as any).salary).toLocaleString()}/month` : '—' },
    { icon: Calendar,   label: 'Joined',      value: (emp as any)?.hireDate ? format(new Date((emp as any).hireDate), 'MMMM d, yyyy') : '—' },
    { icon: User,       label: 'Employee ID', value: emp?.employeeId },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
              {emp?.firstName?.[0]}{emp?.lastName?.[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{emp?.firstName} {emp?.lastName}</h2>
              <p className="text-blue-100 text-sm">{emp?.position}</p>
              <p className="text-blue-200 text-xs mt-0.5">{emp?.role?.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <div className="p-6 space-y-1">
            {fields.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.label} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                  <div className="p-2 bg-gray-50 rounded-lg"><Icon className="w-4 h-4 text-gray-500" /></div>
                  <div>
                    <p className="text-xs text-gray-400">{f.label}</p>
                    <p className="text-sm font-medium text-gray-800">{f.value || '—'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
