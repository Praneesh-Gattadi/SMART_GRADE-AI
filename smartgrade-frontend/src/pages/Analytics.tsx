import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { 
  TrendingUp, Users, Award, Target, Sparkles, FolderOpen, BookOpen, 
  Grid, CheckCircle
} from 'lucide-react';
import { evaluationAPI, studentAPI } from '@/api/endpoints';
import { Evaluation } from '@/api/types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';

export const Analytics: React.FC = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalyticsData = async () => {
     try {
        setIsLoading(true);
        const data = await evaluationAPI.getAll(0, 1000);
        const studentData = await studentAPI.getAll();
        const studentList = studentData.students || [];
        setStudents(studentList);

        const activeStudentIds = new Set(studentList.map((s: any) => s.id));
        const activeStudentNames = new Set(studentList.map((s: any) => (s.full_name || '').trim().toLowerCase()));

        // Exclude evaluations of deleted/inactive previous students
        const activeEvals = (data.evaluations || []).filter((e: any) => {
           if (e.student_id && activeStudentIds.has(e.student_id)) return true;
           if (e.student_name && activeStudentNames.has((e.student_name || '').trim().toLowerCase())) return true;
           if (!e.student_id && !e.student_name) return true;
           return false;
        });

        setEvaluations(activeEvals);

        // Derive unique sections from active students list for layout consistency
        const distinct = Array.from(new Set(studentList.map((s: any) => s.class_section).filter(Boolean))) as string[];
        setSections(distinct);
     } catch (e) {
        console.error("Failed to fetch analytics", e);
     } finally {
        setIsLoading(false);
     }
  };

  useEffect(() => {
     fetchAnalyticsData();
  }, []);

  // Filter Logic
  const filtered = evaluations.filter((e: any) => selectedSection === 'all' || (e.student_section || '').trim().toLowerCase() === selectedSection.trim().toLowerCase());

  // Statistics Computations
  const totalEvals = filtered.length;
  const avgScore = totalEvals ? Math.round(filtered.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / totalEvals) : 0;
  const avgConfidence = totalEvals ? Math.round(filtered.reduce((acc, curr) => acc + (curr.ai_confidence || 0), 0) / totalEvals) : 0;
  const passingEvals = filtered.filter(e => (e.percentage || 0) >= 50).length;
  const passingRate = totalEvals ? Math.round((passingEvals / totalEvals) * 100) : 0;

  const sectionStudents = selectedSection === 'all'
    ? students
    : students.filter((s: any) => (s.class_section || '').trim().toLowerCase() === selectedSection.trim().toLowerCase());
  const activeStudents = sectionStudents.length;

  // Grade Counts
  const countA = filtered.filter(e => e.grade?.startsWith('A')).length;
  const countB = filtered.filter(e => e.grade?.startsWith('B')).length;
  const countC = filtered.filter(e => e.grade?.startsWith('C')).length;
  const countD = filtered.filter(e => e.grade?.startsWith('D')).length;
  const countF = filtered.filter(e => e.grade === 'F').length;

  // Recharts Data Mapping (Grouped by Date to aggregate duplicates)
  const dateGroups = filtered.reduce((acc: any, curr: any) => {
     const dateObj = curr.created_at ? new Date(curr.created_at) : new Date();
     const dStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
     if (!acc[dStr]) acc[dStr] = { dateObj, sum: 0, count: 0 };
     acc[dStr].sum += (curr.percentage || 0);
     acc[dStr].count += 1;
     return acc;
  }, {});

  const trendData = Object.values(dateGroups)
     .sort((a: any, b: any) => a.dateObj.getTime() - b.dateObj.getTime())
     .map((g: any) => ({
         name: g.dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' }),
         score: Math.round(g.sum / g.count)
     }));

  const pieData = [
     { name: 'Grade A', value: countA, color: '#10b981' },
     { name: 'Grade B', value: countB, color: '#3b82f6' },
     { name: 'Grade C', value: countC, color: '#f59e0b' },
     { name: 'Grade D', value: countD, color: '#f97316' },
     { name: 'Grade F', value: countF, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Section Averages (New)
  const sectionAverages = sections.map(sec => {
      const secEvals = evaluations.filter((e: any) => (e.student_section || '').trim().toLowerCase() === sec.trim().toLowerCase());
      const avg = secEvals.length ? Math.round(secEvals.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / secEvals.length) : 0;
      return { name: sec, score: avg };
  });

  const handleExportCSV = () => {
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Student,Section,Grade,Percentage,Confidence,Feedback\n";
      filtered.forEach((e: any) => {
          const row = [
              e.student_name || 'Anonymous',
              e.student_section || '',
              e.grade || '',
              `${e.percentage || 0}%`,
              `${e.ai_confidence || 0}%`,
              `"${(e.overall_feedback || '').replace(/"/g, '""')}"`
          ];
          csvContent += row.join(",") + "\n";
      });
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `analytics_${selectedSection}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-primary shadow-xs">
            <Target className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Institution Stats & Analytics</h1>
            <p className="text-slate-500 text-base font-medium mt-0.5">Comprehensive aggregate performance graphs and trends overview.</p>
          </div>
        </div>

        {/* Export Button */}
        <button 
          onClick={handleExportCSV}
          className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm flex items-center gap-2 shadow-md shadow-primary/20 transition-all border border-primary"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export Report (CSV)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
         
         {/* Left column: Section Folders */}
         <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
               <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Grid className="w-4 h-4 text-primary" /> Class Sections
               </h3>
            </div>
            <div className="space-y-2">
               <Card 
                 onClick={() => setSelectedSection('all')}
                 className={`p-4 cursor-pointer border transition-all flex items-center justify-between rounded-2xl ${
                   selectedSection === 'all' 
                     ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20' 
                     : 'bg-white/90 border-slate-200/80 text-slate-700 hover:bg-slate-50'
                 }`}
               >
                  <div className="flex items-center gap-3">
                     <FolderOpen className={`w-5 h-5 ${selectedSection === 'all' ? 'text-primary-foreground' : 'text-slate-400'}`} />
                     <span className="font-bold text-sm">All Sections</span>
                  </div>
               </Card>

               {sections.map((section, idx) => (
                 <Card 
                   key={idx}
                   onClick={() => setSelectedSection(section)}
                   className={`p-4 cursor-pointer border transition-all flex items-center justify-between rounded-2xl ${
                     selectedSection === section 
                       ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20' 
                       : 'bg-white/90 border-slate-200/80 text-slate-700 hover:bg-slate-50'
                   }`}
                 >
                    <div className="flex items-center gap-3">
                       <BookOpen className={`w-5 h-5 ${selectedSection === section ? 'text-white' : 'text-slate-400'}`} />
                       <span className="font-bold text-sm">{section}</span>
                    </div>
                 </Card>
               ))}
            </div>
         </div>

         {/* Right column: Analytics content */}
         <div className="lg:col-span-3 space-y-6 flex flex-col">

            {/* AI Highlight Banner */}
            <Card className="bg-indigo-50/70 border border-indigo-100 shadow-xs p-5 rounded-2xl flex items-start gap-4">
               <div className="p-3 bg-indigo-100 rounded-xl">
                  <Sparkles className="w-5 h-5 text-primary" />
               </div>
               <div>
                  <h4 className="text-primary font-bold text-sm mb-1">AI Insights & Performance Trends</h4>
                  <p className="text-slate-600 text-sm font-medium leading-relaxed">
                     Section <strong className="text-slate-900">{selectedSection === 'all' ? 'Aggregate' : selectedSection}</strong> currently maintains an average passing rate of <strong className="text-slate-900">{passingRate}%</strong>. 
                     {passingRate < 60 ? ' Consider reviewing weak subject areas and scheduling recap evaluations.' : ' General performance maintains robust quality benchmarks across all criteria.'}
                  </p>
               </div>
            </Card>

            {/* Stats Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               {[
                 { label: 'Average Score', value: `${avgScore}%`, icon: TrendingUp, color: 'indigo' },
                 { label: 'Passing Rate', value: `${passingRate}%`, icon: CheckCircle, color: 'green' },
                 { label: 'Active Students', value: activeStudents, icon: Users, color: 'purple' },
                 { label: 'AI Confidence', value: `${avgConfidence}%`, icon: Award, color: 'yellow' }
               ].map((stat, i) => {
                  const Icon = stat.icon;
                  const colors: Record<string, string> = {
                    indigo: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
                    purple: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
                    green: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
                    yellow: 'bg-amber-50 text-amber-600 border border-amber-100',
                  };
                  return (
                    <Card key={i} className="p-5 bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-md">
                       <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                          <h2 className="text-2xl font-black text-slate-900 mt-1">{stat.value}</h2>
                       </div>
                       <div className={`p-3 rounded-xl ${colors[stat.color]}`}>
                          <Icon className="w-5 h-5" />
                       </div>
                    </Card>
                  );
               })}
            </div>

            {/* Charts View */}
            {filtered.length === 0 ? (
               <Card className="bg-white/90 backdrop-blur-xl border border-slate-200/80 p-16 text-center text-slate-400 font-medium flex-1 flex justify-center items-center flex-col shadow-md rounded-2xl space-y-3">
                  <div className="p-4 rounded-2xl bg-indigo-50 text-primary border border-indigo-100">
                    <Target className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-slate-800 font-bold text-base">No analytics data found for this segment</p>
                    <p className="text-slate-500 text-xs mt-1 font-medium">Evaluations completed by faculty members will automatically appear here.</p>
                  </div>
               </Card>
            ) : (
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Line Chart */}
                  <Card className="bg-white/90 backdrop-blur-xl border border-slate-200/80 p-6 rounded-2xl flex flex-col shadow-md">
                     <h3 className="text-base font-bold text-slate-900 mb-4">Performance Score Trend</h3>
                     <div className="flex-1 min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                              <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '11px', color: '#0f172a', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                              <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5} fill="url(#scoreGrad)" />
                           </AreaChart>
                        </ResponsiveContainer>
                     </div>
                  </Card>

                  {/* Pie Chart Grade Spreads */}
                  <Card className="bg-white/90 backdrop-blur-xl border border-slate-200/80 p-6 rounded-2xl flex flex-col shadow-md">
                     <h3 className="text-base font-bold text-slate-900 mb-4">Grade Distribution Breakdown</h3>
                     <div className="flex-1 min-h-[250px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4}>
                                 {pieData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.color} /> ))}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '11px', color: '#0f172a' }} />
                              <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-xs font-bold text-slate-700">{value}</span>} />
                           </PieChart>
                        </ResponsiveContainer>
                     </div>
                  </Card>

                  {/* Bar Chart Section Comparisons */}
                  {selectedSection === 'all' && sectionAverages.length > 0 && (
                    <Card className="bg-white/90 backdrop-blur-xl border border-slate-200/80 p-6 rounded-2xl flex flex-col lg:col-span-2 shadow-md">
                       <h3 className="text-base font-bold text-slate-900 mb-4">Class Section Average Comparison</h3>
                       <div className="flex-1 min-h-[250px]">
                          <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={sectionAverages} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} fontWeight={700} />
                                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '11px', color: '#0f172a' }} />
                                <Bar dataKey="score" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40} />
                             </BarChart>
                          </ResponsiveContainer>
                       </div>
                    </Card>
                  )}

               </div>
            )}

         </div>
      </div>
    </div>
  );
};

export default Analytics;
