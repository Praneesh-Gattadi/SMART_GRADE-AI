import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  FileCheck, 
  TrendingUp, 
  Award,
  ArrowUp,
  Clock,
  Sparkles,
  Camera,
  ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import api from '@/api/endpoints';
import type { AnalyticsData } from '@/api/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']; // A, B, C, D, F

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.analytics.get(30);
        setData(res);
      } catch (err) {
        console.error("Failed to load analytics", err);
      }
    };
    fetchAnalytics();
  }, []);

  const aGrades = data?.grade_distribution?.['A'] || 0;
  const { user } = useAuthStore(); // Added for role split
  
  // Format for pie chart
  const pieData = data?.grade_distribution 
    ? Object.entries(data.grade_distribution)
        .map(([key, value]) => ({ name: `Grade ${key}`, value }))
        .sort((a,b) => a.name.localeCompare(b.name))
    : [];

  if (user?.role === 'institution_admin') {
     const facultyCount = (data as any)?.faculty_breakdown?.length || 0;

     return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                         <ShieldCheck className="w-9 h-9 text-primary" />
                         {user?.school_name || "Institution Panel"}
                    </h1>
                    <p className="text-slate-500 text-base font-medium">System Administration & Faculty Operations Management</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        onClick={() => navigate('/admin/faculty')}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 px-5 shadow-md shadow-primary/20 rounded-xl border border-primary transition-all flex items-center gap-2"
                    >
                        <Users className="w-4 h-4 text-primary-foreground" />
                        <span>Manage Faculty</span>
                    </Button>
                    <Button 
                        onClick={() => navigate('/settings')}
                        variant="outline"
                        className="h-11 px-4 border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl"
                    >
                        Settings
                    </Button>
                </div>
            </div>

            {/* Insight Banner */}
            <Card className="bg-indigo-50/70 border border-indigo-100 shadow-sm p-6 rounded-2xl flex items-start gap-4">
                <div className="p-3 bg-indigo-100 rounded-xl">
                    <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h3 className="text-primary font-bold mb-1">Administrator Insight</h3>
                    <p className="text-slate-600 leading-relaxed text-sm">
                        Total aggregated Institution Average is <strong className="text-slate-900">{data?.average_score || 0}%</strong>. You are managing <strong className="text-slate-900">{data?.total_students || 0}</strong> active student records across your faculty network.
                    </p>
                </div>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { icon: FileCheck, label: 'Institution Evaluations', value: data?.total_evaluations || 0, color: 'indigo' },
                  { icon: Users, label: 'Active Faculty', value: facultyCount, color: 'purple' },
                  { icon: TrendingUp, label: 'Institution Avg', value: `${data?.average_score || 0}%`, color: 'green' },
                  { icon: Award, label: 'Total Students', value: data?.total_students || 0, color: 'yellow' },
                ].map((stat, i) => {
                  const Icon = stat.icon;
                  const colors: Record<string, string> = {
                    indigo: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
                    purple: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
                    green: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
                    yellow: 'bg-amber-50 text-amber-600 border border-amber-100',
                  };
                  return (
                    <Card key={i} className="bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-md shadow-slate-100 p-6 rounded-2xl relative overflow-hidden group">
                      <div className="flex justify-between items-start relative z-10">
                        <div>
                          <p className="text-slate-500 font-semibold text-xs mb-2 uppercase tracking-wider">{stat.label}</p>
                          <h3 className="text-3xl font-extrabold text-slate-900 mb-2">{stat.value}</h3>
                        </div>
                        <div className={`p-3 rounded-xl ${colors[stat.color]}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </div>

            {/* Faculty Comparison and Audit Log Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-md rounded-2xl p-6">
                     <div className="mb-6 flex justify-between items-center">
                          <div>
                              <h3 className="text-xl font-bold text-slate-900">Faculty Performance</h3>
                              <p className="text-sm text-slate-500 font-medium">Evaluation volume and averages comparison chart</p>
                          </div>
                     </div>
                     <div className="h-[300px] w-full">
                          {(data as any)?.faculty_breakdown?.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                     <BarChart data={(data as any).faculty_breakdown} margin={{ bottom: 20, left: 15, right: 10, top: 10 }}>
                                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                          <XAxis 
                                               dataKey="name" 
                                               stroke="#64748b" 
                                               fontSize={11} 
                                               label={{ value: 'Faculty Member', position: 'insideBottom', offset: -10, style: { fill: '#64748b', fontSize: 11, fontWeight: '600' } }}
                                          />
                                          <YAxis 
                                               stroke="#64748b" 
                                               fontSize={11}
                                               label={{ value: 'Evaluations Count', angle: -90, position: 'insideLeft', offset: -5, style: { fill: '#64748b', fontSize: 11, fontWeight: '600' } }}
                                          />
                                          <Tooltip cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                                          <Bar dataKey="evaluations" fill="#6366f1" radius={[4, 4, 0, 0]} name="Evaluations" />
                                     </BarChart>
                                </ResponsiveContainer>
                           ) : (
                               <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                                   <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-primary">
                                       <Users className="w-6 h-6" />
                                   </div>
                                   <div>
                                       <p className="text-slate-800 font-bold text-sm">No faculty comparisons data available yet</p>
                                       <p className="text-slate-500 text-xs mt-0.5">Invite faculty members to begin tracking evaluation volumes and analytics.</p>
                                   </div>
                                   <Button 
                                       onClick={() => navigate('/admin/faculty')}
                                       variant="outline"
                                       className="mt-2 text-xs font-semibold border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl"
                                   >
                                       Invite Faculty Members
                                   </Button>
                               </div>
                          )}
                     </div>
                </Card>

                <Card className="bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-md rounded-2xl p-6 flex flex-col">
                     <div className="mb-6 flex justify-between items-center">
                          <h3 className="text-xl font-bold text-slate-900">Audit Activity Logs</h3>
                          <Clock className="w-4 h-4 text-primary" />
                     </div>
                     <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-2">
                          {(data?.recent_evaluations?.length || 0) > 0 ? (
                               data?.recent_evaluations.map((evalItem) => (
                                    <div key={evalItem.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                                         <p className="font-semibold text-sm text-slate-800">{evalItem.student_name} graded {evalItem.percentage}%</p>
                                         <p className="text-xs text-slate-500 mt-1 font-medium">Processed By: {evalItem.teacher_name || "Faculty"}</p>
                                    </div>
                               ))
                          ) : (
                               <div className="h-full flex flex-col items-center justify-center text-center py-12">
                                   <p className="text-sm text-slate-400 font-medium">No recent audit activity recorded yet.</p>
                               </div>
                          )}
                     </div>
                </Card>
            </div>
        </div>
     );
  }
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Welcome Back</h1>
          <p className="text-slate-500 text-lg font-medium">Here is your live AI grading performance.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => navigate('/evaluate')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 px-5 shadow-md shadow-primary/20 rounded-xl border border-primary transition-all flex items-center gap-2"
          >
            <Camera className="w-4 h-4 text-primary-foreground" />
            <span>Scan New Exam</span>
          </Button>
        </div>
      </div>

      {/* AI Teacher Insight Banner */}
      <Card className="bg-indigo-50/70 border border-indigo-100 shadow-sm p-6 rounded-2xl flex items-start gap-4">
        <div className="p-3 bg-indigo-100 rounded-xl">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-primary font-bold mb-1">Gemini AI Insight</h3>
          <p className="text-slate-600 leading-relaxed text-sm">
            Your class average is sitting at <strong className="text-slate-900">{data?.average_score || 0}%</strong>. Most recently graded papers show strong comprehension, but <strong className="text-slate-900">{(data?.grade_distribution?.['C'] || 0) + (data?.grade_distribution?.['D'] || 0) + (data?.grade_distribution?.['F'] || 0)}</strong> students fell below a B. Consider generating a targeted review sheet using the Knowledge Base tool.
          </p>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: FileCheck, label: 'Evaluations', value: data?.total_evaluations || 0, change: '+12%', color: 'indigo' },
          { icon: Users, label: 'Students', value: data?.total_students || 0, change: '+4%', color: 'purple' },
          { icon: TrendingUp, label: 'Avg Score', value: `${data?.average_score || 0}%`, change: '+2.1%', color: 'green' },
          { icon: Award, label: 'A Grades', value: aGrades, change: '+8%', color: 'yellow' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          const colors: Record<string, string> = {
            indigo: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
            purple: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
            green: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
            yellow: 'bg-amber-50 text-amber-600 border border-amber-100',
          };
          return (
            <Card key={i} className="bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-md shadow-slate-100 p-6 rounded-2xl relative overflow-hidden group">
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-slate-500 font-semibold text-xs mb-2 uppercase tracking-wider">{stat.label}</p>
                  <h3 className="text-3xl font-extrabold text-slate-900 mb-2">{stat.value}</h3>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                    <ArrowUp className="w-3.5 h-3.5" />
                    {stat.change}
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${colors[stat.color]}`}>
                  <Icon className="w-6 h-6 stroke-[2.5]" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Chart */}
        <Card className="lg:col-span-2 bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-md rounded-2xl p-6">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-900">Score Trends</h3>
            <p className="text-sm text-slate-500 font-medium">Class average performance over the last 30 days</p>
          </div>
          <div className="h-[300px] w-full">
            {(data?.performance_trends?.length || 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.performance_trends || []} margin={{ bottom: 20, left: 15, right: 10, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    label={{ value: 'Evaluation Date', position: 'insideBottom', offset: -10, style: { fill: '#64748b', fontSize: 11, fontWeight: '600' } }}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    domain={[0, 100]} 
                    label={{ value: 'Class Average Score (%)', angle: -90, position: 'insideLeft', offset: -5, style: { fill: '#64748b', fontSize: 11, fontWeight: '600' } }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: '#0f172a' }}
                  />
                  <Line type="monotone" dataKey="average_score" stroke="#6366f1" strokeWidth={4} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium">No trend data available</div>
            )}
          </div>
        </Card>

        {/* Grade Distribution */}
        <Card className="bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-md rounded-2xl p-6 flex flex-col">
          <div className="mb-2">
            <h3 className="text-xl font-bold text-slate-900">Distribution</h3>
            <p className="text-sm text-slate-500 font-medium">Grade breakdown</p>
          </div>
          <div className="flex-1 min-h-[250px] relative flex flex-col justify-between">
            {pieData.length > 0 ? (
              <>
                <div className="h-[200px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      />
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Visual labels & legend for distribution */}
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-2 pt-3 border-t border-slate-100">
                  {pieData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <span 
                        className="w-2.5 h-2.5 rounded-full inline-block" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                      />
                      <span>{entry.name}: <strong className="text-slate-800">{entry.value}</strong></span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium">No distribution data</div>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-md rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-200/80 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900">Recent Activity</h2>
        </div>
        
        <div className="divide-y divide-slate-100">
          {(data?.recent_evaluations?.length || 0) > 0 ? (
            data!.recent_evaluations.map((evaluation) => (
              <div key={evaluation.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 hover:bg-slate-50/50 transition-colors gap-4">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-primary font-bold text-lg border border-indigo-100 shrink-0">
                    {(evaluation.student_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-semibold text-base">{evaluation.student_name || 'Anonymous'}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-8 self-end sm:self-auto">
                  <div className="text-right">
                    <div className="flex items-baseline gap-2 justify-end">
                      <span className="text-2xl font-black text-slate-900">{evaluation.percentage}%</span>
                    </div>
                    <div className="mt-1 inline-flex items-center justify-center px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                      {evaluation.grade}
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">{new Date(evaluation.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
             <div className="p-8 text-center text-slate-400 font-medium">No recent evaluations found. Feel free to evaluate your first paper!</div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;