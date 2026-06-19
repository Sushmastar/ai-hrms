'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Briefcase, Users, MapPin, DollarSign, Plus, X, ChevronDown,
  ChevronUp, Bot, Loader2, FileText, Eye, MessageSquare, Send,
  CheckCircle, Star,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import DashboardLayout from '@/components/layout/DashboardLayout';

// ── Schemas ───────────────────────────────────────────────────────────────────
const jobSchema = z.object({
  title:        z.string().min(2, 'Required'),
  description:  z.string().min(10, 'Required'),
  experience:   z.string().min(1, 'Required'),
  location:     z.string().min(1, 'Required'),
  salaryMin:    z.coerce.number().optional(),
  salaryMax:    z.coerce.number().optional(),
  skills:       z.string().optional(),
  requirements: z.string().optional(),
  status:       z.enum(['OPEN','DRAFT','ON_HOLD']),
});
type JobForm = z.infer<typeof jobSchema>;

const appSchema = z.object({
  applicantName:  z.string().min(2, 'Required'),
  applicantEmail: z.string().email('Invalid email'),
  coverLetter:    z.string().optional(),
});
type AppForm = z.infer<typeof appSchema>;

const STATUS_COLOR: Record<string, string> = {
  OPEN:    'bg-green-50 text-green-700',
  CLOSED:  'bg-gray-100 text-gray-500',
  ON_HOLD: 'bg-yellow-50 text-yellow-700',
  DRAFT:   'bg-blue-50 text-blue-700',
};
const APP_STATUS_COLOR: Record<string, string> = {
  APPLIED:             'bg-gray-100 text-gray-600',
  SCREENING:           'bg-blue-50 text-blue-700',
  INTERVIEW_SCHEDULED: 'bg-purple-50 text-purple-700',
  INTERVIEW_COMPLETED: 'bg-indigo-50 text-indigo-700',
  OFFER_SENT:          'bg-yellow-50 text-yellow-700',
  HIRED:               'bg-green-50 text-green-700',
  REJECTED:            'bg-red-50 text-red-700',
};

// ── Interview Chat Component ──────────────────────────────────────────────────
function InterviewChat({ application, onClose }: { application: any; onClose: () => void }) {
  const [sessionId, setSessionId]     = useState<string | null>(null);
  const [messages, setMessages]       = useState<{ role: 'ai' | 'user'; text: string }[]>([]);
  const [input, setInput]             = useState('');
  const [isComplete, setIsComplete]   = useState(false);
  const [result, setResult]           = useState<any>(null);
  const [starting, setStarting]       = useState(false);

  const sendMutation = useMutation({
    mutationFn: (msg: string) => api.post(`/ai/interview/${sessionId}/message`, { message: msg }),
    onSuccess: (r) => {
      setMessages(prev => [...prev, { role: 'ai', text: r.data.response }]);
      if (r.data.is_complete) setIsComplete(true);
    },
  });

  const endMutation = useMutation({
    mutationFn: () => api.post(`/ai/interview/${sessionId}/end`),
    onSuccess: (r) => { setResult(r.data); setIsComplete(true); },
  });

  const startInterview = async () => {
    setStarting(true);
    try {
      const r = await api.post('/ai/interview/start', { applicationId: application.id });
      setSessionId(r.data.sessionId);
      const raw = r.data.openingMessage;
      const opening = typeof raw === 'string' ? raw
        : typeof raw === 'object' && raw !== null
          ? (raw.text || raw.content || raw.message || JSON.stringify(raw))
          : String(raw);
      setMessages([{ role: 'ai', text: opening }]);
    } catch (e: any) {
      setMessages([{ role: 'ai', text: e.response?.data?.error || 'Failed to start interview. Make sure AI service is running.' }]);
    }
    setStarting(false);
  };

  const sendMessage = () => {
    if (!input.trim() || !sessionId) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    sendMutation.mutate(msg);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ height: '85vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-500" /> AI Interview
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{application.applicantName} — {application.job?.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>

        {/* Result panel */}
        {result && (
          <div className="mx-5 mt-4 p-4 bg-green-50 rounded-xl border border-green-100">
            <p className="font-semibold text-green-800 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Interview Complete
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-gray-500">Overall Score:</span> <strong className="ml-1">{result.score}/100</strong></div>
              <div><span className="text-gray-500">Recommendation:</span> <strong className="ml-1">{result.recommendation}</strong></div>
            </div>
            {result.summary && <p className="text-xs text-gray-600 mt-2 italic">"{result.summary}"</p>}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {messages.length === 0 && !sessionId && (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm mb-4">Start the AI interview for {application.applicantName}</p>
              <button onClick={startInterview} disabled={starting}
                className="bg-purple-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition flex items-center gap-2 mx-auto">
                {starting ? <><Loader2 className="w-4 h-4 animate-spin" />Starting…</> : <><Bot className="w-4 h-4" />Start Interview</>}
              </button>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                m.role === 'ai'
                  ? 'bg-gray-100 text-gray-800 rounded-tl-sm'
                  : 'bg-purple-600 text-white rounded-tr-sm'
              }`}>
                {m.role === 'ai' && <p className="text-xs font-semibold text-purple-600 mb-1">Alex (AI Interviewer)</p>}
                {m.text}
              </div>
            </div>
          ))}
          {sendMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-gray-100 px-4 py-2.5 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1">
                  {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        {sessionId && !isComplete && (
          <div className="p-4 border-t border-gray-100 flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Type your response…"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            <button onClick={sendMessage} disabled={!input.trim() || sendMutation.isPending}
              className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-40 transition">
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
        {sessionId && isComplete && !result && (
          <div className="p-4 border-t border-gray-100">
            <button onClick={() => endMutation.mutate()} disabled={endMutation.isPending}
              className="w-full py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
              {endMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Evaluating…</> : <><CheckCircle className="w-4 h-4" />End & Evaluate</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function RecruitmentPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isHR = ['HR_RECRUITER','SENIOR_MANAGER','MANAGEMENT_ADMIN'].includes(user?.role || '');

  const [showJobForm,   setShowJobForm]   = useState(false);
  const [expandedJob,   setExpandedJob]   = useState<string | null>(null);
  const [showAppForm,   setShowAppForm]   = useState<string | null>(null);
  const [interviewApp,  setInterviewApp]  = useState<any | null>(null);
  const [screeningId,   setScreeningId]   = useState<string | null>(null);
  const [screenResult,  setScreenResult]  = useState<Record<string, any>>({});
  const [successMsg,    setSuccessMsg]    = useState('');

  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.get('/recruitment/jobs?status=').then(r => r.data),
  });

  const { data: appsData } = useQuery({
    queryKey: ['applications', expandedJob],
    queryFn: () => api.get(`/recruitment/applications?jobId=${expandedJob}`).then(r => r.data),
    enabled: !!expandedJob && isHR,
  });

  const { register: regJob, handleSubmit: hsJob, reset: resetJob, formState: { errors: errJob, isSubmitting: subJob } } =
    useForm<JobForm>({ resolver: zodResolver(jobSchema), defaultValues: { status: 'OPEN' } });

  const createJob = useMutation({
    mutationFn: (d: JobForm) => api.post('/recruitment/jobs', {
      ...d,
      skills:       d.skills ? d.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
      requirements: d.requirements ? d.requirements.split('\n').filter(Boolean) : [],
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] });
      setShowJobForm(false); resetJob();
      setSuccessMsg('✅ Job posted successfully');
      setTimeout(() => setSuccessMsg(''), 4000);
    },
  });

  const { register: regApp, handleSubmit: hsApp, reset: resetApp, formState: { errors: errApp, isSubmitting: subApp } } =
    useForm<AppForm>({ resolver: zodResolver(appSchema) });

  const submitApp = useMutation({
    mutationFn: (d: AppForm) => api.post(`/recruitment/apply/${showAppForm}`, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      setShowAppForm(null); resetApp();
      setSuccessMsg('✅ Application submitted');
      setTimeout(() => setSuccessMsg(''), 4000);
    },
  });

  const screenAll = useMutation({
    mutationFn: (jobId: string) => api.post(`/recruitment/jobs/${jobId}/screen-all`),
    onSuccess: (r, jobId) => {
      qc.invalidateQueries({ queryKey: ['applications', jobId] });
      setScreenResult(prev => ({ ...prev, [jobId]: r.data }));
    },
  });

  const screenOne = useMutation({
    mutationFn: (appId: string) => api.post(`/recruitment/applications/${appId}/screen`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['applications'] }); setScreeningId(null); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/recruitment/applications/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications'] }),
  });

  const jobs = jobsData?.data || [];
  const apps = appsData?.data || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-purple-600" /> Recruitment
            <span className="text-sm font-normal text-gray-400">({jobs.length} jobs)</span>
          </h1>
          {isHR && (
            <button onClick={() => setShowJobForm(true)}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition">
              <Plus className="w-4 h-4" /> Post Job
            </button>
          )}
        </div>

        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg p-3 flex justify-between">
            {successMsg}<button onClick={() => setSuccessMsg('')}><X className="w-4 h-4" /></button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">{Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100 text-gray-400 text-sm">
            No jobs posted yet.{isHR && ' Click "Post Job" to create one.'}
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job: any) => {
              const isExpanded = expandedJob === job.id;
              return (
                <div key={job.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{job.title}</h3>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[job.status]}`}>{job.status}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{job._count?.applications || 0} applicants</span>
                          {job.salaryMin && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />₹{Number(job.salaryMin).toLocaleString()} – ₹{Number(job.salaryMax).toLocaleString()}</span>}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {(job.skills || []).slice(0, 5).map((s: string) => (
                            <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{s}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        {!isHR && (
                          <button onClick={() => setShowAppForm(job.id)}
                            className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition font-medium">Apply</button>
                        )}
                        {isHR && (
                          <>
                            <button onClick={() => { screenAll.mutate(job.id); setExpandedJob(job.id); }} disabled={screenAll.isPending}
                              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition font-medium disabled:opacity-50">
                              {screenAll.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}AI Screen All
                            </button>
                            <button onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                              className="flex items-center gap-1 text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition">
                              <Eye className="w-3 h-3" />{isExpanded ? 'Hide' : 'View Apps'}
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {screenResult[job.id] && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg text-xs text-blue-800 border border-blue-100">
                        ✅ AI screening complete — {screenResult[job.id].processed} applications ranked
                      </div>
                    )}
                  </div>

                  {isExpanded && isHR && (
                    <div className="border-t border-gray-100 bg-gray-50">
                      {apps.length === 0 ? (
                        <p className="text-center py-6 text-sm text-gray-400">No applications yet</p>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          <div className="grid grid-cols-6 gap-2 px-5 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            <span className="col-span-2">Applicant</span>
                            <span>AI Score</span>
                            <span>Status</span>
                            <span>Update</span>
                            <span>Interview</span>
                          </div>
                          {apps.map((app: any) => (
                            <div key={app.id} className="grid grid-cols-6 gap-2 px-5 py-3 items-center text-sm">
                              <div className="col-span-2">
                                <p className="font-medium text-gray-900">{app.applicantName}</p>
                                <p className="text-xs text-gray-400">{app.applicantEmail}</p>
                              </div>
                              <div>
                                {app.aiScore != null ? (
                                  <span className={`font-bold text-sm ${app.aiScore >= 75 ? 'text-green-600' : app.aiScore >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                                    {Number(app.aiScore).toFixed(1)}<span className="text-xs text-gray-400 font-normal">/100</span>
                                  </span>
                                ) : (
                                  <button onClick={() => { setScreeningId(app.id); screenOne.mutate(app.id); }}
                                    disabled={screenOne.isPending && screeningId === app.id}
                                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline disabled:opacity-50">
                                    {screenOne.isPending && screeningId === app.id ? <><Loader2 className="w-3 h-3 animate-spin" />Screening…</> : <><Bot className="w-3 h-3" />Screen</>}
                                  </button>
                                )}
                              </div>
                              <div>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${APP_STATUS_COLOR[app.status] || 'bg-gray-100 text-gray-600'}`}>
                                  {app.status.replace(/_/g, ' ')}
                                </span>
                              </div>
                              <div>
                                <select defaultValue={app.status}
                                  onChange={e => updateStatus.mutate({ id: app.id, status: e.target.value })}
                                  className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none">
                                  {['APPLIED','SCREENING','INTERVIEW_SCHEDULED','INTERVIEW_COMPLETED','OFFER_SENT','HIRED','REJECTED'].map(s => (
                                    <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <button
                                  onClick={() => setInterviewApp({ ...app, job: jobs.find((j: any) => j.id === job.id) })}
                                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition font-medium">
                                  <MessageSquare className="w-3 h-3" /> Interview
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interview Modal */}
      {interviewApp && <InterviewChat application={interviewApp} onClose={() => setInterviewApp(null)} />}

      {/* Post Job Modal */}
      {showJobForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Post New Job</h2>
              <button onClick={() => setShowJobForm(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={hsJob(d => createJob.mutate(d))} className="p-6 space-y-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Job Title *</label>
                <input {...regJob('title')} placeholder="e.g. Senior Software Engineer"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                {errJob.title && <p className="text-red-500 text-xs mt-1">{errJob.title.message}</p>}
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Description *</label>
                <textarea {...regJob('description')} rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
                {errJob.description && <p className="text-red-500 text-xs mt-1">{errJob.description.message}</p>}
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Requirements (one per line)</label>
                <textarea {...regJob('requirements')} rows={3} placeholder="Bachelor's degree&#10;3+ years experience"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Experience *</label>
                  <select {...regJob('experience')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                    <option value="">Select…</option>
                    {['0-1 years','1-3 years','3-5 years','5-8 years','8+ years'].map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                  {errJob.experience && <p className="text-red-500 text-xs mt-1">{errJob.experience.message}</p>}
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Location *</label>
                  <select {...regJob('location')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                    <option value="">Select…</option>
                    {['Mumbai','Bangalore','Delhi','Hyderabad','Chennai','Pune','Remote','Hybrid'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  {errJob.location && <p className="text-red-500 text-xs mt-1">{errJob.location.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Min Salary (₹)</label>
                  <input {...regJob('salaryMin')} type="number" placeholder="40000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Max Salary (₹)</label>
                  <input {...regJob('salaryMax')} type="number" placeholder="120000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Skills (comma-separated)</label>
                <input {...regJob('skills')} placeholder="React, Node.js, SQL, AWS"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
                <select {...regJob('status')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                  <option value="OPEN">Open</option><option value="DRAFT">Draft</option><option value="ON_HOLD">On Hold</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowJobForm(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" disabled={subJob || createJob.isPending}
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
                  {createJob.isPending && <Loader2 className="w-4 h-4 animate-spin" />}{createJob.isPending ? 'Posting…' : 'Post Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {showAppForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-5 h-5 text-purple-500" />Apply for Job</h2>
              <button onClick={() => setShowAppForm(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={hsApp(d => submitApp.mutate(d))} className="p-6 space-y-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Full Name *</label>
                <input {...regApp('applicantName')} placeholder="Your full name"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                {errApp.applicantName && <p className="text-red-500 text-xs mt-1">{errApp.applicantName.message}</p>}
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Email *</label>
                <input {...regApp('applicantEmail')} type="email" placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                {errApp.applicantEmail && <p className="text-red-500 text-xs mt-1">{errApp.applicantEmail.message}</p>}
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Cover Letter</label>
                <textarea {...regApp('coverLetter')} rows={4} placeholder="Why are you a good fit?"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAppForm(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" disabled={subApp || submitApp.isPending}
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
                  {submitApp.isPending && <Loader2 className="w-4 h-4 animate-spin" />}{submitApp.isPending ? 'Submitting…' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
