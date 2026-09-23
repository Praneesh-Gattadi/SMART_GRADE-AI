import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Eye, Search, FileCheck, Award, TrendingUp, Sparkles, X, Calendar, User, Grid, FolderOpen, BookOpen } from 'lucide-react';
import { evaluationAPI, studentAPI } from '@/api/endpoints';
import { Evaluation } from '@/api/types';
import { QuestionBreakdown } from '@/components/evaluation/QuestionBreakdown';
import toast from 'react-hot-toast';

export const History: React.FC = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [drawerEvaluation, setDrawerEvaluation] = useState<Evaluation | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sections, setSections] = useState<string[]>([]);
  const limit = 15;

  const fetchEvaluations = async () => {
    try {
      setIsLoading(true);
      const data = await evaluationAPI.getAll((page - 1) * limit, limit);
      setEvaluations(data.evaluations || []);
      setTotalCount(data.total || 0);
    } catch (error) {
      console.error('Failed to load history:', error);
      toast.error('Could not load evaluation history.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      const data = await studentAPI.getAll();
      const studentList = data.students || [];
      const distinctSections = Array.from(new Set(studentList.map((s: any) => s.class_section).filter(Boolean))) as string[];
      const localSections = JSON.parse(localStorage.getItem('custom_sections') || '[]');
      setSections(Array.from(new Set([...distinctSections, ...localSections])));
    } catch (e) {
      console.error("Failed to load sections", e);
    }
  };

  useEffect(() => {
    fetchEvaluations();
  }, [page]);

  useEffect(() => {
    fetchSections();
  }, []);

  // Filter Logic
  const filteredEvaluations = evaluations.filter((item: any) => {
    const matchesSearch = item.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id?.toString().includes(searchQuery);
    const matchesGrade = selectedGrade === 'all' || item.grade === selectedGrade;
    const matchesSection = item.student_section === selectedSection; // Or if item.student_name is matches against student profile section lookup
    return matchesSearch && matchesGrade && (selectedSection === 'all' || matchesSection);
  });

  const handleExportCSV = () => {
    if (filteredEvaluations.length === 0) {
      toast.error("No items to export.");
      return;
    }
    const headers = ["ID", "Student", "Score", "Grade", "Confidence", "Date"];
    const rows = filteredEvaluations.map(e => [
      e.id,
      e.student_name || 'Anonymous',
      `${e.percentage}%`,
      e.grade,
      `${e.ai_confidence}%`,
      e.created_at ? new Date(e.created_at).toLocaleDateString() : '—'
    ]);

    const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Evaluation_History_Export_${new Date().toLocaleDateString()}.csv`);
    link.click();
    toast.success("CSV Export Triggered!");
  };

  const handleDownloadReport = (e: Evaluation) => {
    const report = `Evaluation Report #${e.id}\nStudent: ${e.student_name}\nScore: ${e.percentage}%\nGrade: ${e.grade}\nOverall Feedback: ${e.overall_feedback}`;
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Report_Eval_${e.id}.txt`);
    link.click();
    toast.success("Individual Report Downloaded!");
  };

  // Analytics Computation (computed on filtered list)
  const avgScore = filteredEvaluations.length
    ? Math.round(filteredEvaluations.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / filteredEvaluations.length)
    : 0;

  const avgConfidence = filteredEvaluations.length
    ? Math.round(filteredEvaluations.reduce((acc, curr) => acc + (curr.ai_confidence || 0), 0) / filteredEvaluations.length)
    : 0;

  const countA = filteredEvaluations.filter(e => e.grade?.startsWith('A')).length;

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
    if (grade.startsWith('B')) return 'bg-primary/10 border-primary/20 text-primary';
    if (grade.startsWith('C')) return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    if (grade.startsWith('D')) return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
    return 'bg-rose-500/10 border-rose-500/20 text-rose-400';
  };

  return (
    <div className="min-h-screen bg-background p-8 relative flex flex-col overflow-hidden animate-in fade-in duration-700">


      {/* Header */}
      <div className="flex items-center justify-between mb-8 max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 shadow-sm">
            <FileCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Evaluation History</h1>
            <p className="text-muted-foreground text-sm font-medium mt-0.5">Stream and review previous grading manifests.</p>
          </div>
        </div>

        <Button onClick={handleExportCSV} className="bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 font-bold rounded-xl h-11 px-4 text-xs flex items-center gap-2">
          <Download className="w-4 h-4" /> Export Filtered CSV
        </Button>
      </div>

      <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">

        {/* Left column: Section Folders (Added for students style UI) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-500 flex items-center gap-2">
              <Grid className="w-4 h-4" /> Class Sections
            </h3>
          </div>

          <div className="space-y-2">
            <Card
              onClick={() => setSelectedSection('all')}
              className={`p-4 cursor-pointer border transition-all flex items-center justify-between rounded-xl select-none ${selectedSection === 'all'
                ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 font-bold'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-3">
                <FolderOpen className={`w-5 h-5 ${selectedSection === 'all' ? 'text-primary-foreground' : 'text-slate-500'}`} />
                <span className={`font-semibold text-sm ${selectedSection === 'all' ? 'text-primary-foreground' : 'text-slate-800'}`}>All Histories</span>
              </div>
            </Card>

            {sections.map((section, idx) => {
              const isSelected = selectedSection === section;
              return (
                <Card
                  key={idx}
                  onClick={() => setSelectedSection(section)}
                  className={`p-4 cursor-pointer border transition-all flex items-center justify-between rounded-xl select-none ${isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 font-bold'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className={`w-5 h-5 ${isSelected ? 'text-primary-foreground' : 'text-slate-500'}`} />
                    <span className={`font-semibold text-sm ${isSelected ? 'text-primary-foreground' : 'text-slate-800'}`}>{section}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right column: Analytics + Table */}
        <div className="lg:col-span-3 space-y-4 flex flex-col h-full">

          {/* AI Insight Banner */}
          <Card className="bg-indigo-50/80 border-indigo-100 p-4 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-3 duration-500 shadow-xs">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h4 className="text-primary font-bold text-xs mb-0.5">AI History Assistant</h4>
              <p className="text-indigo-900/90 text-xs leading-relaxed">
                Currently viewing <strong>{selectedSection === 'all' ? 'All Sections' : selectedSection}</strong> logs.
                The aggregate AI scoring confidence index averages sits at **{avgConfidence}%**.
                {avgConfidence < 80 ? 'Ensure you augment context maps on evaluate builds with detailed Knowledge Bases for optimization.' : 'AI Assurance rates meet standard production benchmarks.'}
              </p>
            </div>
          </Card>

          {/* Analytics Top Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Supervised', value: filteredEvaluations.length, icon: FileCheck, color: 'blue' },
              { label: 'Class Average', value: `${avgScore}%`, icon: TrendingUp, color: 'emerald' },
              { label: 'Modal Index (A Grades)', value: countA, icon: Award, color: 'amber' }
            ].map((stat, i) => {
              const Icon = stat.icon;
              const colorMap: any = {
                blue: 'bg-indigo-50 border-indigo-100 text-indigo-600',
                emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
                amber: 'bg-amber-50 border-amber-100 text-amber-600'
              };
              return (
                <Card key={i} className="p-4 bg-white border-slate-200 rounded-2xl flex items-center justify-between shadow-sm group overflow-hidden cursor-pointer hover:border-slate-300 transition-all duration-300">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
                    <h2 className="text-2xl font-black text-slate-900 mt-1">{stat.value}</h2>
                  </div>
                  <div className={`p-2.5 rounded-xl ${colorMap[stat.color].split(' ')[0]} border ${colorMap[stat.color].split(' ')[1]}`}>
                    <Icon className={`w-5 h-5 ${colorMap[stat.color].split(' ')[2]}`} />
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Search & Grade Filters */}
          <div className="flex items-center gap-3">
            <Card className="bg-white border-slate-200 shadow-sm p-3 rounded-xl flex items-center flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search student or evaluation ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-10"
                />
              </div>
            </Card>

            <Select value={selectedGrade} onValueChange={setSelectedGrade}>
              <SelectTrigger className="w-32 bg-white border-slate-200 text-slate-900 rounded-xl h-12 text-sm shadow-sm">
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 text-slate-900 rounded-xl">
                <SelectItem value="all">Grade All</SelectItem>
                <SelectItem value="A">Grade A</SelectItem>
                <SelectItem value="B">Grade B</SelectItem>
                <SelectItem value="C">Grade C</SelectItem>
                <SelectItem value="F">Grade F</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table View */}
          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden flex-1 relative group overflow-y-auto no-scrollbar">
            {filteredEvaluations.length === 0 ? (
              <div className="p-16 text-center text-slate-500 font-medium">
                <FileCheck className="w-11 h-11 mx-auto mb-3 opacity-40 text-primary" /> No evaluation logs found.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto h-full">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                        <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase">ID</th>
                        <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase">Student Name</th>
                        <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase text-center">Score</th>
                        <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase text-center">Confidence</th>
                        <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase text-center">Grade</th>
                        <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEvaluations.map((item) => (
                        <tr key={item.id} onClick={() => setDrawerEvaluation(item)} className="hover:bg-slate-50/80 transition-all group cursor-pointer">
                          <td className="px-6 py-4 text-sm font-semibold text-slate-600">#{item.id}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-primary opacity-70" />
                              {item.student_name || 'Anonymous Student'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-center text-slate-900">{item.percentage}%</td>
                          <td className="px-6 py-4 text-sm text-center">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">{item.ai_confidence || 100}%</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${getGradeColor(item.grade || 'C')}`}>
                              {item.grade || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm flex justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" onClick={() => setDrawerEvaluation(item)} className="text-primary hover:text-primary hover:bg-indigo-50 w-8 h-8 p-0"><Eye className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDownloadReport(item)} className="text-primary hover:text-primary hover:bg-indigo-50 w-8 h-8 p-0"><Download className="w-4 h-4" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-500">Showing {evaluations.length} of {totalCount} records</p>
                  <div className="flex items-center gap-2">
                    <Button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} size="sm" variant="outline" className="border-slate-200 bg-white h-8 text-xs">Previous</Button>
                    <span className="text-xs font-bold text-slate-800 px-2">Page {page} / {Math.ceil(totalCount / limit) || 1}</span>
                    <Button disabled={evaluations.length < limit || (page * limit) >= totalCount} onClick={() => setPage(p => p + 1)} size="sm" variant="outline" className="border-slate-200 bg-white h-8 text-xs">Next</Button>
                  </div>
                </div>
              </>
            )}
          </Card>

        </div>
      </div>

      {/* --- SIDE DRAWER: Full Evaluation Breakdown --- */}
      {drawerEvaluation && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setDrawerEvaluation(null)} />
          <div className="w-full max-w-2xl bg-white border-l border-slate-200 shadow-2xl h-full relative z-10 animate-in slide-in-from-right duration-300 overflow-y-auto no-scrollbar flex flex-col rounded-none">

            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setDrawerEvaluation(null)} className="rounded-full w-8 h-8 p-0"><X className="w-4 h-4" /></Button>
                <h2 className="text-xl font-extrabold text-slate-900">Evaluation Summary</h2>
              </div>
              <span className={`px-3 py-1 rounded-full border text-sm font-black ${getGradeColor(drawerEvaluation.grade || 'C')}`}>{drawerEvaluation.grade}</span>
            </div>

            <div className="p-6 space-y-6 flex-1">
              {/* Top highlights */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center"> <span className="text-xs font-semibold text-slate-500">Score Percentage</span> <h3 className="text-2xl font-black mt-1 text-slate-900">{drawerEvaluation.percentage}%</h3> </Card>
                <Card className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center"> <span className="text-xs font-semibold text-slate-500">Marks Obtained</span> <h3 className="text-2xl font-black mt-1 text-primary">{drawerEvaluation.total_earned} / {drawerEvaluation.total_max}</h3> </Card>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="text-xs text-slate-600 flex items-center gap-2"><User className="w-4 h-4" /> Student: <strong className="text-slate-900">{drawerEvaluation.student_name || 'Anonymous'}</strong></p>
                <p className="text-xs text-slate-600 flex items-center gap-2"><Calendar className="w-4 h-4" /> Created Date: <strong className="text-slate-900">{drawerEvaluation.created_at ? new Date(drawerEvaluation.created_at).toLocaleDateString() : '—'}</strong></p>
                {drawerEvaluation.overall_feedback && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <span className="text-xs font-bold text-primary">Overall Feedback:</span>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">{drawerEvaluation.overall_feedback}</p>
                  </div>
                )}
              </div>

              {/* Question breakdown mapping */}
              <div>
                <QuestionBreakdown questions={drawerEvaluation.questions_results || []} />
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default History;
