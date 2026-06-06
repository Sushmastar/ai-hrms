'use client';

import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Star } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import DashboardLayout from '@/components/layout/DashboardLayout';

const RATING_COLOR: Record<string, string> = {
  EXCEPTIONAL:          'bg-purple-50 text-purple-700',
  EXCEEDS_EXPECTATIONS: 'bg-blue-50 text-blue-700',
  MEETS_EXPECTATIONS:   'bg-green-50 text-green-700',
  NEEDS_IMPROVEMENT:    'bg-yellow-50 text-yellow-700',
  UNSATISFACTORY:       'bg-red-50 text-red-700',
};

export default function MyPerformancePage() {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['my-reviews', user?.id],
    queryFn: () => api.get(`/performance/${user?.id}`).then(r => r.data),
    enabled: !!user?.id,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-purple-600" /> My Performance
        </h1>

        {isLoading ? (
          <div className="space-y-3">{Array(3).fill(0).map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : (data || []).length > 0 ? (
          <div className="space-y-4">
            {(data || []).map((r: any) => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{r.reviewPeriod}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Reviewed by {r.reviewer?.firstName} {r.reviewer?.lastName}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-lg font-bold text-gray-900">{Number(r.score).toFixed(1)}</span>
                      <span className="text-xs text-gray-400">/100</span>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RATING_COLOR[r.rating] || 'bg-gray-50 text-gray-600'}`}>
                      {r.rating?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                {r.achievements && (
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <p className="text-xs font-medium text-gray-500 mb-1">Achievements</p>
                    <p className="text-sm text-gray-700">{r.achievements}</p>
                  </div>
                )}
                {r.areasToImprove && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-500 mb-1">Areas to Improve</p>
                    <p className="text-sm text-gray-600">{r.areasToImprove}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400 text-sm shadow-sm">
            No performance reviews yet
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
