'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Settings, Lock, Loader2, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import DashboardLayout from '@/components/layout/DashboardLayout';

const schema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword:     z.string().min(8, 'Min 8 characters').regex(/[A-Z]/, 'Needs uppercase').regex(/[0-9]/, 'Needs a number'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] });

type Form = z.infer<typeof schema>;

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [done, setDone] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (d: Form) => api.put('/auth/password', { currentPassword: d.currentPassword, newPassword: d.newPassword }),
    onSuccess: () => { setDone(true); reset(); setTimeout(() => setDone(false), 4000); },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-gray-600" /> Settings
        </h1>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-500" /> Change Password
          </h2>

          {done && (
            <div className="mb-4 flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
              <CheckCircle className="w-4 h-4" /> Password changed successfully
            </div>
          )}
          {mutation.isError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {(mutation.error as any)?.response?.data?.error || 'Failed to change password'}
            </div>
          )}

          <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
            {([
              { name: 'currentPassword' as const, label: 'Current Password'    },
              { name: 'newPassword'     as const, label: 'New Password'        },
              { name: 'confirmPassword' as const, label: 'Confirm New Password'},
            ]).map(f => (
              <div key={f.name}>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">{f.label}</label>
                <input {...register(f.name)} type="password" placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {errors[f.name] && <p className="text-red-500 text-xs mt-1">{errors[f.name]?.message}</p>}
              </div>
            ))}
            <button type="submit" disabled={mutation.isPending}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {mutation.isPending ? 'Saving…' : 'Update Password'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-3">Account Info</h2>
          <div className="space-y-0 text-sm">
            {[
              { label: 'Name',        value: `${user?.firstName} ${user?.lastName}` },
              { label: 'Email',       value: user?.email },
              { label: 'Role',        value: user?.role?.replace(/_/g, ' ') },
              { label: 'Employee ID', value: user?.employeeId },
            ].map(r => (
              <div key={r.label} className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-gray-400">{r.label}</span>
                <span className="font-medium text-gray-800 font-mono text-xs">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
