import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  FileCheck, Search, Save, 
  ArrowLeft, Edit3, ClipboardList, PenTool, BookOpen, Sparkles, FolderOpen, Grid,
  ZoomIn, ZoomOut, RotateCw, EyeOff, Eye
} from 'lucide-react';
import { evaluationAPI, studentAPI } from '@/api/endpoints';
import { Evaluation } from '@/api/types';
import toast from 'react-hot-toast';

export const ManualReview: React.FC = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Editable States
  const [questionsResults, setQuestionsResults] = useState<any[]>([]);
  const [overallFeedback, setOverallFeedback] = useState('');
  const [totalEarned, setTotalEarned] = useState(0);

  // Sections State
  const [sections, setSections] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [studentsMap, setStudentsMap] = useState<any>({});

  // UX Enhancements
  const [zoom, setZoom] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [isBlindGrading, setIsBlindGrading] = useState(false);

  const fetchSections = async () => {
     try {
        const data = await studentAPI.getAll();
        const list = data.students || [];
        const secs = Array.from(new Set(list.map((s: any) => s.class_section))).filter(Boolean) as string[];
        setSections(secs);
        
        const map: any = {};
        list.forEach((s: any) => {
           if (s.full_name) map[s.full_name] = s.class_section || 'Unassigned';
        });
        setStudentsMap(map);
     } catch (e) {}
  };

  const fetchEvaluations = async () => {
     try {
        setIsLoading(true);
        const data = await evaluationAPI.getAll(0, 50); 
        setEvaluations(data.evaluations || []);
     } catch (e) {
        toast.error("Failed to load evaluations list.");
     } finally {
        setIsLoading(false);
     }
  };

  useEffect(() => {
     fetchEvaluations();
     fetchSections();
  }, []);

  // Hotkeys
  useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        
        // Shift + S to save
        if (e.key === 'S' && e.shiftKey) {
           e.preventDefault();
           handleSaveOverrides();
        }
     };
     window.addEventListener('keydown', handleKeyDown);
     return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEvaluation, totalEarned, questionsResults, overallFeedback]);

  const handleSelectEvaluation = async (id: number) => {
     try {
        setIsLoading(true);
        const detail = await evaluationAPI.getById(id) as any as Evaluation;
        setSelectedEvaluation(detail);
        setQuestionsResults(detail.questions_results || []);
        setOverallFeedback(detail.overall_feedback || '');
        setTotalEarned(detail.total_earned || 0);
        setZoom(1); // reset controls
        setRotate(0);
     } catch (e) {
        toast.error("Failed to fetch evaluation details.");
     } finally {
        setIsLoading(false);
     }
  };

  const handleQuestionMarkChange = (idx: number, value: string) => {
     const num = parseFloat(value) || 0;
     const updated = [...questionsResults];
     updated[idx].earned = num;
     setQuestionsResults(updated);
     
     // Recalculate Total
     const newTotal = updated.reduce((acc: number, curr: any) => acc + (curr.earned || 0), 0);
     setTotalEarned(newTotal);
  };

  const handleQuestionFeedbackChange = (idx: number, value: string) => {
     const updated = [...questionsResults];
     updated[idx].feedback = value;
     setQuestionsResults(updated);
  };

  const handleSaveOverrides = async () => {
     const currentEval = selectedEvaluation; // use local scope safe pointer
     if (!currentEval) return;
     try {
        setIsSaving(true);
        const totalMax = currentEval.total_max || 100;
        const percentage = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
        
        let grade: "A" | "B" | "C" | "D" | "F" = "C";
        if (percentage >= 85) grade = "A";
        else if (percentage >= 70) grade = "B";
        else if (percentage >= 50) grade = "C";
        else grade = "F";

        const payload = {
           total_earned: totalEarned,
           percentage,
           grade,
           overall_feedback: overallFeedback,
           questions_results: questionsResults
        };

        await evaluationAPI.update(currentEval.id, payload);
        toast.success("Evaluation Saved & Updated Successfully!");
        
        setSelectedEvaluation({ ...currentEval, ...payload } as Evaluation);
     } catch (e) {
        toast.error("Failed to save overrides.");
     } finally {
        setIsSaving(false);
     }
  };

  const filtered = evaluations.filter(e => {
     const matchesSearch = e.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) || e.id.toString().includes(searchQuery);
     if (selectedSection === 'All') return matchesSearch;
     const studentSection = studentsMap[e.student_name || ''] || 'Unassigned';
     return matchesSearch && studentSection === selectedSection;
  });

  return (
    <div className="min-h-screen bg-background p-8 relative flex flex-col overflow-hidden animate-in fade-in duration-700">

      
      {/* Header */}
      <div className="flex items-center justify-between mb-8 max-w-7xl w-full mx-auto border-b border-slate-200 pb-5">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 shadow-sm">
            <ClipboardList className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Manual Review Board</h1>
            <p className="text-slate-500 text-sm font-medium mt-0.5">Override AI grades and adjust feedback scores.</p>
          </div>
        </div>

        {selectedEvaluation ? (
           <div className="flex items-center gap-3">
              <Button 
                 onClick={() => setIsBlindGrading(!isBlindGrading)} 
                 variant="outline" 
                 size="sm"
                 className={`border-slate-200 rounded-xl flex items-center gap-1.5 h-11 px-4 font-bold ${isBlindGrading ? 'bg-amber-50 text-amber-700 border-amber-200' : 'text-slate-700'}`}
              >
                 {isBlindGrading ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                 Blind Grading
              </Button>
              <Button onClick={() => { setSelectedEvaluation(null); fetchEvaluations(); }} variant="outline" className="border-slate-200 text-slate-700 rounded-xl flex items-center gap-2 h-11 px-4 font-bold hover:bg-slate-50">
                 <ArrowLeft className="w-4 h-4" /> Back to List
              </Button>
           </div>
        ) : null }
      </div>

      <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col">
         
         {!selectedEvaluation ? (
            /* ================== LIST SELECTION MODE ================== */
            <div className="flex gap-6 flex-1 h-full">
               
               {/* Sidebar: Sections */}
               <Card className="w-64 bg-white border border-slate-200 p-4 rounded-xl flex flex-col space-y-2 h-[calc(100vh-190px)] overflow-y-auto no-scrollbar relative z-10 shadow-sm">
                  <h3 className="text-xs font-black text-primary uppercase px-2 mb-2 flex items-center gap-1.5"><Grid className="w-4 h-4" /> Class Sections</h3>
                  
                  <Button 
                     variant="ghost" 
                     onClick={() => setSelectedSection('All')}
                     className={`w-full justify-start text-sm rounded-xl h-10 px-3 ${selectedSection === 'All' 
                       ? 'bg-primary text-primary-foreground border border-primary font-bold shadow-md shadow-primary/20 hover:bg-primary/95 hover:text-primary-foreground' 
                       : 'text-slate-600 hover:bg-slate-50 font-semibold'}`}
                  >
                     All Sections
                  </Button>

                  {sections.map((sec, i) => {
                      const isSelected = selectedSection === sec;
                      return (
                        <Button 
                           key={i}
                           variant="ghost" 
                           onClick={() => setSelectedSection(sec)}
                           className={`w-full justify-start text-sm rounded-xl h-10 px-3 ${isSelected 
                             ? 'bg-primary text-primary-foreground border border-primary font-bold shadow-md shadow-primary/20 hover:bg-primary/95 hover:text-primary-foreground' 
                             : 'text-slate-600 hover:bg-slate-50 font-semibold'}`}
                        >
                           <FolderOpen className={`w-4 h-4 mr-2 ${isSelected ? 'text-primary-foreground' : 'opacity-60'}`} /> 
                           <span>{sec}</span>
                        </Button>
                      );
                  })}
               </Card>

               {/* Main Card Grid feeds */}
               <Card className="flex-1 bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden relative flex flex-col no-scrollbar">
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                      <div className="relative flex-1 max-w-md">
                         <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                         <Input
                           placeholder="Search Student or Evaluation ID..."
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           className="pl-11 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-10"
                         />
                      </div>
                  </div>

                  {filtered.length === 0 ? (
                     <div className="p-16 text-center text-slate-500 font-medium flex-1 flex justify-center items-center flex-col">
                        <FileCheck className="w-11 h-11 mb-3 opacity-40 text-primary" /> No evaluation logs found to review.
                     </div>
                  ) : (
                     <div className="overflow-x-auto h-full flex-1">
                        <table className="w-full text-left">
                           <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                 <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase">ID</th>
                                 <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase">Student Name</th>
                                 <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase text-center">Score</th>
                                 <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase text-center">Grade</th>
                                 <th className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase text-center">Action</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {filtered.map((item) => (
                                 <tr key={item.id} className="hover:bg-slate-50/80 transition-all group">
                                    <td className="px-6 py-4 text-sm font-semibold text-slate-600">#{item.id}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-900">
                                       {isBlindGrading ? `Student #${item.id}` : item.student_name || 'Anonymous Student'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-center text-slate-700 font-semibold">{item.percentage}%</td>
                                    <td className="px-6 py-4 text-center">
                                       <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-xs font-bold text-primary">{item.grade || '—'}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                       <Button size="sm" onClick={() => handleSelectEvaluation(item.id)} className="bg-primary hover:bg-primary/90 rounded-xl font-bold h-8 text-xs flex items-center gap-1.5 mx-auto text-white shadow-sm">
                                          <Edit3 className="w-3.5 h-3.5" /> Review
                                       </Button>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  )}
               </Card>

            </div>
         ) : (
            /* ================== EDITOR WORKSPACE MODE ================== */
            <div className={`grid grid-cols-1 ${selectedEvaluation?.sheet_image_path ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-6 flex-1 h-full mb-6`}>
               
               {/* Left Column (1/3): Original Answer Sheet Preview */}
               {selectedEvaluation?.sheet_image_path && (
                  <Card className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col max-h-[calc(100vh-160px)] shadow-sm">
                     <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm"><BookOpen className="w-4 h-4 text-primary" /> Answer Sheet</h3>
                        <div className="flex items-center gap-1">
                           <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-slate-900" onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}><ZoomOut className="w-4 h-4" /></Button>
                           <span className="text-xs text-slate-500 font-mono w-8 text-center">{Math.round(zoom * 100)}%</span>
                           <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-slate-900" onClick={() => setZoom(Math.min(3, zoom + 0.25))}><ZoomIn className="w-4 h-4" /></Button>
                           <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-slate-900 ml-1" onClick={() => setRotate((rotate + 90) % 360)}><RotateCw className="w-4 h-4" /></Button>
                        </div>
                     </div>
                     <div className="overflow-auto p-4 flex-1 flex justify-center items-center bg-slate-100/70 no-scrollbar">
                        <img 
                          src={`http://localhost:8001${selectedEvaluation.sheet_image_path}`} 
                          alt="Answer Sheet" 
                          style={{ transform: `scale(${zoom}) rotate(${rotate}deg)`, transition: 'transform 0.2s ease-out', transformOrigin: 'center' }}
                          className="max-w-full h-auto rounded-xl shadow-md border border-slate-200"
                        />
                     </div>
                  </Card>
               )}

               {/* Right/Middle column: Summary Highlights (2-span) */}
               <div className="lg:col-span-2 space-y-4 flex flex-col h-full">
                  <Card className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-sm">
                     <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><FileCheck className="w-5 h-5 text-primary" /> Evaluation Overview</h3>
                     
                     <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-200">
                           <span className="text-xs font-semibold text-slate-500">Original Score</span>
                           <h4 className="text-2xl font-black mt-1 text-slate-900">{selectedEvaluation.percentage}%</h4>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-200">
                           <span className="text-xs font-semibold text-slate-500">Adjusted Score</span>
                           <h4 className="text-2xl font-black mt-1 text-primary">
                              {selectedEvaluation.total_max > 0 ? Math.round((totalEarned / selectedEvaluation.total_max) * 100) : 0}%
                           </h4>
                        </div>
                     </div>

                     <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-sm text-slate-700">
                        <p>Student: <strong className="text-slate-900">
                           {isBlindGrading ? `Student #${selectedEvaluation.id}` : selectedEvaluation.student_name || 'Anonymous'}
                        </strong></p>
                        <p>Evaluator: <strong className="text-primary">{selectedEvaluation.provider || 'AI'} ({selectedEvaluation.model || 'Unknown'})</strong></p>
                        <p>Confidence: <strong className="text-slate-900">{selectedEvaluation.ai_confidence || '100'}%</strong></p>
                     </div>
                  </Card>

                  <Card className="bg-white border border-slate-200 p-6 rounded-2xl flex-1 flex flex-col space-y-3 shadow-sm">
                     <Label className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><PenTool className="w-4 h-4 text-primary" /> Overall Grading Feedback</Label>
                     <Textarea 
                        value={overallFeedback}
                        onChange={(e) => setOverallFeedback(e.target.value)}
                        placeholder="Provide aggregate review overlay..."
                        className="flex-1 bg-slate-50/50 border-slate-200 placeholder:text-slate-400 rounded-xl resize-none min-h-[120px] text-slate-800"
                     />
                  </Card>

                  <Button disabled={isSaving} onClick={handleSaveOverrides} className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 group">
                      {isSaving ? "Saving Overrides..." : <><Save className="w-5 h-5 group-hover:scale-110 transition-transform" /> Save Changes & Update</>}
                  </Button>
                  <p className="text-center text-[10px] text-slate-400 font-semibold mt-1">Tip: Press <kbd className="px-1 bg-slate-100 border border-slate-200 rounded text-slate-600">Shift + S</kbd> to save overrides instantly.</p>
               </div>

               {/* Right column: Questions Breakdown */}
               <Card className={`bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col max-h-[calc(100vh-160px)] shadow-sm ${selectedEvaluation?.sheet_image_path ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                  <div className="p-5 border-b border-slate-200 bg-slate-50">
                     <h3 className="font-bold text-slate-900 flex items-center gap-2"><ArrowLeft className="w-4 h-4 rotate-180 text-primary" /> Questions & Guidelines</h3>
                  </div>
                  
                  <div className="overflow-y-auto p-5 space-y-5 no-scrollbar flex-1">
                     {questionsResults.map((q, idx) => {
                        const originalEarned = selectedEvaluation?.questions_results?.[idx]?.earned ?? q.earned;
                        const isOverridden = q.earned !== originalEarned;
                        
                        return (
                           <div key={idx} className="p-4 rounded-xl bg-slate-50/50 border border-slate-200 space-y-3 hover:bg-slate-50 transition-all">
                              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                 <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-primary uppercase">Question {idx + 1}</span>
                                    {isOverridden && (
                                       <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-1">
                                          <Sparkles className="w-3 h-3 text-amber-600" /> AI: {originalEarned}
                                       </span>
                                    )}
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-500">Score:</span>
                                    <Input 
                                       type="number" 
                                       value={q.earned || 0} 
                                       onChange={(e) => handleQuestionMarkChange(idx, e.target.value)}
                                       className="w-16 h-8 text-center bg-white border-slate-200 text-slate-900 rounded-lg text-xs font-bold font-mono"
                                    />
                                    <span className="text-xs font-black text-slate-400">/ {q.max || 10}</span>
                                 </div>
                              </div>

                              {q.criteria && (
                                 <div className="text-xs text-slate-600">
                                    <strong className="text-slate-900">Criteria:</strong> {q.criteria}
                                 </div>
                              )}

                              <div className="text-xs space-y-1">
                                 <strong className="text-primary flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> AI Feedback:</strong>
                                 <p className="text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">{q.feedback || 'No feedback criteria provided.'}</p>
                              </div>

                              <div className="space-y-1.5 mt-2">
                                 <Label className="text-[11px] font-bold text-slate-500">Manual Override Feedback</Label>
                                 <Textarea 
                                    value={q.feedback || ''}
                                    onChange={(e) => handleQuestionFeedbackChange(idx, e.target.value)}
                                    placeholder="Adjust question-specific review..."
                                    className="text-xs bg-white border-slate-200 placeholder:text-slate-400 rounded-lg resize-none min-h-[60px] text-slate-800"
                                 />
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </Card>

            </div>
         )}

      </div>
    </div>
  );
};

export default ManualReview;