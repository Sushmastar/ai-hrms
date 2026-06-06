'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { Bot, FileSearch, MessageSquare, TrendingUp, Calendar, Loader2, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';

const FEATURES = [
  { icon: FileSearch,    title: 'Resume Screening',     desc: 'AI scores resumes against job descriptions automatically.',      color: 'bg-blue-50 text-blue-600'    },
  { icon: MessageSquare, title: 'Interview Bot',         desc: 'LLM-powered conversational screening interview for candidates.', color: 'bg-purple-50 text-purple-600' },
  { icon: TrendingUp,    title: 'Performance Analytics', desc: 'Predicts next-quarter performance and flags flight risk.',       color: 'bg-green-50 text-green-600'   },
  { icon: Calendar,      title: 'Shift Scheduling',      desc: 'Generates optimal weekly schedules around leaves.',             color: 'bg-orange-50 text-orange-600' },
];

export default function AIToolsPage() {
  const [empId, setEmpId] = useState('');

  // Health check via backend proxy — avoids CORS issues
  const { data: healthData } = useQuery({
    queryKey: ['ai-health'],
    queryFn: () => api.get('/ai/health').then(r => r.data).catch(() => ({ status: 'offline' })),
    refetchInterval: 15000,
    retry: false,
  });

  const isOnline = healthData?.status === 'online';

  const analysisMutation = useMutation({
    mutationFn: () => api.post(`/ai/performance/${empId}/analyze`, {
      reviewPeriod: 'Q2-2025',
      peerFeedback: 'This employee consistently delivers quality work on time. Excellent communicator and team player.',
    }),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header with live status */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="w-6 h-6 text-blue-600" /> AI Tools
          </h1>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 rounded-full shadow-sm">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-xs font-medium text-gray-600">
              AI Service: {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Status banner */}
        {!isOnline ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
            <p className="font-semibold text-amber-800 mb-1">AI Service not running</p>
            <p className="text-amber-700 mb-2">Run this in a new terminal:</p>
            <div className="bg-amber-100 rounded-lg p-2 text-xs font-mono text-amber-900 space-y-0.5">
              <p>cd C:\Users\HPP\Downloads\Hr_management\ai-service</p>
              <p>python -m uvicorn main:app --reload --port 8000</p>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-sm text-green-800">
            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
            AI Service is online — Gemini API connected
          </div>
        )}

        {/* Feature cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {FEATURES.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${f.color}`}><Icon className="w-5 h-5" /></div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{f.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{f.desc}</p>
                    <span className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${
                      isOnline ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {isOnline ? '● Active' : '○ Requires AI Service'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick performance analysis */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" /> Quick Performance Analysis
          </h2>
          <p className="text-xs text-gray-400 mb-4">Enter an Employee ID to run AI sentiment analysis</p>
          <div className="flex gap-3">
            <input
              value={empId}
              onChange={e => setEmpId(e.target.value.toUpperCase())}
              placeholder="e.g. EMP00005"              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => analysisMutation.mutate()}
              disabled={!empId || analysisMutation.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40 transition flex items-center gap-2"
            >
              {analysisMutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing…</>
                : <><Bot className="w-4 h-4" />Analyze</>}
            </button>
          </div>

          {analysisMutation.isSuccess && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-100 space-y-1.5">
              <p className="font-semibold text-green-800 text-sm mb-2">Analysis Complete</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">Sentiment:</span> <strong className="ml-1">{analysisMutation.data?.data?.sentiment_label || '—'}</strong></div>
                <div><span className="text-gray-500">Score:</span> <strong className="ml-1">{analysisMutation.data?.data?.sentiment_score?.toFixed(2) ?? '—'}</strong></div>
                <div><span className="text-gray-500">Collaboration:</span> <strong className="ml-1">{analysisMutation.data?.data?.collaboration_score ?? '—'}/100</strong></div>
                <div><span className="text-gray-500">Themes:</span> <strong className="ml-1">{(analysisMutation.data?.data?.key_themes || []).slice(0,2).join(', ') || '—'}</strong></div>
              </div>
              {analysisMutation.data?.data?.ai_insights && (
                <p className="text-xs text-gray-600 italic mt-2 pt-2 border-t border-green-100">
                  "{analysisMutation.data.data.ai_insights}"
                </p>
              )}
            </div>
          )}

          {analysisMutation.isError && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg text-xs text-red-700 border border-red-100">
              {(analysisMutation.error as any)?.response?.data?.error ||
               'Analysis failed — check AI service is running and Gemini key is valid'}
            </div>
          )}
        </div>

        {/* Recruitment shortcut */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white">
          <h2 className="font-semibold mb-1">Resume Screening & Interview Bot</h2>
          <p className="text-blue-100 text-sm mb-3">AI screening is on job applications in Recruitment.</p>
          <Link href="/recruitment"
            className="inline-block bg-white text-blue-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-50 transition">
            Go to Recruitment →
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
