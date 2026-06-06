'use client';

import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Star } from 'lucide-react';
import api from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';

const RATING_COLOR: Record<string, string> = {
  EXCEPTIONAL:          'bg-purple-50 text-purple-700',
  EXCEEDS_EXPECTATIONS: 'bg-blue-50 text-blue-700',
  MEETS_EXPECTATIONS:   'bg-green-50 text-green-700',
  NEEDS_IMPROVEMENT:    'bg-yellow-50 text-yellow-700',
  UNSATISFACTORY:       'bg-red-50 text-red-700',
};

export default function PerformancePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['performance-reviews'],
    queryFn: () => api.get('/performance?limit=30').then(r => r.data),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-purple-600" /> Performance Reviews
        </h1>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Employee','Period','Score','Rating','Sentiment','Notes'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading
                  ? Array(8).fill(0).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array(6).fill(0).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-20" /></td>)}
                      </tr>
                    ))
                  : (data?.data || []).map((r: any) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{r.employee?.firstName} {r.employee?.lastName}</p>
                          <p className="text-xs text-gray-400">{r.employee?.position}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{r.reviewPeriod}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                            <span className="font-semibold">{Number(r.score).toFixed(1)}</span>
                            <span className="text-xs text-gray-400">/100</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RATING_COLOR[r.rating] || 'bg-gray-50 text-gray-600'}`}>
                            {r.rating?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {r.sentimentScore != null
                            ? <span className={Number(r.sentimentScore) > 0.2 ? 'text-green-600' : Number(r.sentimentScore) < -0.1 ? 'text-red-600' : 'text-gray-500'}>
                                {Number(r.sentimentScore) > 0.2 ? '😊 Positive' : Number(r.sentimentScore) < -0.1 ? '😟 Negative' : '😐 Neutral'}
                              </span>
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">{r.areasToImprove || '—'}</td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
          {!isLoading && !data?.data?.length && (
            <p className="text-center py-10 text-gray-400 text-sm">No performance reviews found</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
