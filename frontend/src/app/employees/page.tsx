'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Users, Search, ChevronLeft, ChevronRight, Plus, X, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';

// ── Validation schema ─────────────────────────────────────────────────────────
const employeeSchema = z.object({
  firstName:    z.string().min(1, 'First name required'),
  lastName:     z.string().min(1, 'Last name required'),
  email:        z.string().email('Invalid email'),
  password:     z.string().min(8, 'Min 8 characters').optional().or(z.literal('')),
  phone:        z.string().optional(),
  position:     z.string().min(1, 'Position required'),
  departmentId: z.string().optional(),
  role:         z.enum(['EMPLOYEE','HR_RECRUITER','SENIOR_MANAGER','MANAGEMENT_ADMIN']),
  salary:       z.coerce.number().min(1, 'Salary required'),
  hireDate:     z.string().min(1, 'Hire date required'),
  status:       z.enum(['ACTIVE','PROBATION','ON_LEAVE','INACTIVE','TERMINATED']),
  gender:       z.string().optional(),
});

type EmployeeForm = z.infer<typeof employeeSchema>;

const DEPARTMENTS = [
  { name: 'Engineering',       code: 'ENG' },
  { name: 'Human Resources',   code: 'HR'  },
  { name: 'Finance',           code: 'FIN' },
  { name: 'Marketing',         code: 'MKT' },
  { name: 'Sales',             code: 'SLS' },
  { name: 'Operations',        code: 'OPS' },
  { name: 'Product Management',code: 'PM'  },
  { name: 'Customer Success',  code: 'CS'  },
  { name: 'Legal',             code: 'LGL' },
  { name: 'Design',            code: 'DES' },
  { name: 'Data Science',      code: 'DS'  },
  { name: 'IT Infrastructure', code: 'IT'  },
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:     'bg-green-50 text-green-700',
  ON_LEAVE:   'bg-blue-50 text-blue-700',
  PROBATION:  'bg-yellow-50 text-yellow-700',
  INACTIVE:   'bg-gray-100 text-gray-500',
  TERMINATED: 'bg-red-50 text-red-700',
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const qc = useQueryClient();

  // ── Fetch employees ──────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['employees', page, search],
    queryFn: () => api.get(`/employees?page=${page}&limit=20&search=${encodeURIComponent(search)}`).then(r => r.data),
    placeholderData: (prev) => prev,
  });

  // ── Fetch departments for dropdown ───────────────────────────────────────
  const { data: deptData } = useQuery({
    queryKey: ['departments-list'],
    queryFn: () => api.get('/employees?limit=1').then(() =>
      // Departments come from the analytics or a dedicated endpoint
      // Using static list as fallback since we have 12 fixed departments
      { return { departments: DEPARTMENTS }; }
    ),
  });

  // ── Create employee mutation ─────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: EmployeeForm) => api.post('/employees', data),
    onSuccess: (res) => {
      const emp = res.data;
      setSuccessMsg(`✅ ${emp.firstName} ${emp.lastName} (${emp.employeeId}) added successfully`);
      qc.invalidateQueries({ queryKey: ['employees'] });
      setShowForm(false);
      reset();
      setTimeout(() => setSuccessMsg(''), 5000);
    },
    onError: (e: any) => {
      const msg = e.response?.data?.error || 'Failed to create employee';
      setFieldError('email', { message: msg });
    },
  });

  // ── Form ─────────────────────────────────────────────────────────────────
  const {
    register, handleSubmit, reset, setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { role: 'EMPLOYEE', status: 'ACTIVE', gender: '' },
  });

  const onSubmit = (data: EmployeeForm) => {
    const payload = {
      ...data,
      hireDate: new Date(data.hireDate).toISOString(),
      password: data.password || 'Welcome@123',
    };
    createMutation.mutate(payload);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" /> Employees
            <span className="text-sm font-normal text-gray-400 ml-1">
              ({data?.pagination?.total?.toLocaleString() ?? '…'})
            </span>
          </h1>
          <button
            onClick={() => { setShowForm(true); reset(); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        </div>

        {/* Success banner */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg p-3 flex items-center justify-between">
            {successMsg}
            <button onClick={() => setSuccessMsg('')}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by name, email or employee ID…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button type="submit"
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
            Search
          </button>
          {search && (
            <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition">
              Clear
            </button>
          )}
        </form>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['ID','Name','Position','Department','Status','Salary','Joined'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading
                  ? Array(10).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array(7).fill(0).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                        ))}
                      </tr>
                    ))
                  : (data?.data || []).map((emp: any) => (
                      <tr key={emp.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{emp.employeeId}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {emp.firstName[0]}{emp.lastName[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 leading-tight">{emp.firstName} {emp.lastName}</p>
                              <p className="text-xs text-gray-400">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{emp.position}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{emp.department?.name || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[emp.status] || 'bg-gray-50 text-gray-600'}`}>
                            {emp.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 text-xs">
                          ₹{Number(emp.salary).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(emp.hireDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data?.pagination && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50">
              <p className="text-xs text-gray-500">
                Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, data.pagination.total)} of {data.pagination.total.toLocaleString()}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg">
                  {page} / {data.pagination.pages}
                </span>
                <button onClick={() => setPage(p => Math.min(data.pagination.pages, p + 1))}
                  disabled={page >= data.pagination.pages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Employee Modal ──────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Add New Employee</h2>
              <button onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">First Name *</label>
                  <input {...register('firstName')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John" />
                  {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Last Name *</label>
                  <input {...register('lastName')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Doe" />
                  {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Email *</label>
                  <input {...register('email')} type="email"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="john@fwcinc.com" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone</label>
                  <input {...register('phone')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+91 98765 43210" />
                </div>
              </div>

              {/* Position & Department */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Position *</label>
                  <input {...register('position')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Software Engineer" />
                  {errors.position && <p className="text-red-500 text-xs mt-1">{errors.position.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Department</label>
                  <select {...register('departmentId')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">— Select department —</option>
                    {DEPARTMENTS.map(d => (
                      <option key={d.code} value={d.code}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Role & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Role *</label>
                  <select {...register('role')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="EMPLOYEE">Employee</option>
                    <option value="HR_RECRUITER">HR Recruiter</option>
                    <option value="SENIOR_MANAGER">Senior Manager</option>
                    <option value="MANAGEMENT_ADMIN">Management Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Status *</label>
                  <select {...register('status')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="ACTIVE">Active</option>
                    <option value="PROBATION">Probation</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="TERMINATED">Terminated</option>
                  </select>
                </div>
              </div>

              {/* Salary, Hire Date, Gender */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Salary (₹/month) *</label>
                  <input {...register('salary')} type="number" min="1"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="60000" />
                  {errors.salary && <p className="text-red-500 text-xs mt-1">{errors.salary.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Hire Date *</label>
                  <input {...register('hireDate')} type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {errors.hireDate && <p className="text-red-500 text-xs mt-1">{errors.hireDate.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Gender</label>
                  <select {...register('gender')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">— Select —</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Initial Password <span className="text-gray-400">(leave blank for Welcome@123)</span>
                </label>
                <input {...register('password')} type="password"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave blank for default" />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting || createMutation.isPending}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
                  {(isSubmitting || createMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {createMutation.isPending ? 'Adding...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
