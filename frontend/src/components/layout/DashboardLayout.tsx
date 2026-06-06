'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, Clock, DollarSign, TrendingUp, Briefcase,
  Bot, Settings, LogOut, Bell, Menu, X, ChevronDown, Building2,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';

const NAV_BY_ROLE = {
  MANAGEMENT_ADMIN: [
    { label: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
    { label: 'Employees', href: '/employees', icon: Users },
    { label: 'Attendance', href: '/attendance', icon: Clock },
    { label: 'Payroll', href: '/payroll', icon: DollarSign },
    { label: 'Performance', href: '/performance', icon: TrendingUp },
    { label: 'Recruitment', href: '/recruitment', icon: Briefcase },
    { label: 'AI Tools', href: '/ai', icon: Bot },
    { label: 'Settings', href: '/settings', icon: Settings },
  ],
  SENIOR_MANAGER: [
    { label: 'Dashboard', href: '/dashboard/manager', icon: LayoutDashboard },
    { label: 'My Team', href: '/employees', icon: Users },
    { label: 'Attendance', href: '/attendance', icon: Clock },
    { label: 'Performance', href: '/performance', icon: TrendingUp },
    { label: 'AI Analytics', href: '/ai/analytics', icon: Bot },
  ],
  HR_RECRUITER: [
    { label: 'Dashboard', href: '/dashboard/hr', icon: LayoutDashboard },
    { label: 'Employees', href: '/employees', icon: Users },
    { label: 'Attendance', href: '/attendance', icon: Clock },
    { label: 'Payroll', href: '/payroll', icon: DollarSign },
    { label: 'Recruitment', href: '/recruitment', icon: Briefcase },
    { label: 'AI Tools', href: '/ai', icon: Bot },
  ],
  EMPLOYEE: [
    { label: 'Dashboard', href: '/dashboard/employee', icon: LayoutDashboard },
    { label: 'My Profile', href: '/profile', icon: Users },
    { label: 'Attendance', href: '/my-attendance', icon: Clock },
    { label: 'Pay Slips', href: '/my-payroll', icon: DollarSign },
    { label: 'Performance', href: '/my-performance', icon: TrendingUp },
  ],
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState(0);

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* ignore */ }
    logout();
    router.push('/login');
  };

  if (!user) return null;

  const navItems = NAV_BY_ROLE[user.role] || NAV_BY_ROLE.EMPLOYEE;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">AI-HRMS</p>
            <p className="text-xs text-gray-500">FWC Inc.</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.role.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center justify-between">
          <button
            className="lg:hidden p-1 rounded-lg text-gray-500 hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 lg:flex-none" />

          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100">
              <Bell className="w-5 h-5" />
              {notifications > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="hidden sm:block">{user.firstName} {user.lastName}</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
