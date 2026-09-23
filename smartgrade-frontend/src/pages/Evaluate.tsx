import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUpload } from '@/components/common/FileUpload';
import { ScoreGauge } from '@/components/evaluation/ScoreGauge';
import { QuestionBreakdown } from '@/components/evaluation/QuestionBreakdown';
import { 
  Sparkles, FileText, ClipboardCheck, Settings2, Library, Layers,
  X, ExternalLink, Download, CheckCircle2, User, Hash, Mail, Folder, Award 
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/api/axios';

interface EvaluationResult {
  id?: number;
  student_id?: number;
  student_name?: string;
  roll_number?: string;
  email?: string;
  class_section?: string;
  total_earned: number;
  total_max: number;
  percentage: number;
  grade: string;
  grade_name?: string;
  ai_confidence?: number;
  overall_feedback?: string;
  questions_results: QuestionResult[];
  created_at?: string;
}

interface QuestionResult {
  question_number: number;
  question: string;
  student_answer: string;
  earned: number;
  max_marks: number;
  similarity_score: number;
  feedback: string;
  key_points_covered: string[];
  missing_points: string[];
}

export const Evaluate: React.FC = () => {
  const navigate = useNavigate();
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null); // added
  const [provider, setProvider] = useState<string>('groq');
  const [model, setModel] = useState<string>('llama-3.3-70b-versatile');
  const [strictness, setStrictness] = useState<string>('moderate');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [kbFiles, setKbFiles] = useState<File[]>([]);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isRubricLoading, setIsRubricLoading] = useState(false);
  const [rubric, setRubric] = useState<any>(null);

  // Modal controller
  const [showModal, setShowModal] = useState(false);

  // New states for Batch Processing Tracker
  const [batchTasks, setBatchTasks] = useState<{ id: string; status: string; result?: any; error?: string }[]>([]);
  const [isBatchPolling, setIsBatchPolling] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ completed: 0, total: 0, success: 0, failed: 0 });



  const PROVIDER_MODELS: Record<string, { id: string; name: string }[]> = {
    groq: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 (70B)' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 (8B)' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral (8x7B)' },
      { id: 'gemma2-9b-it', name: 'Gemma 2 (9B)' },
      { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill (70B)' }
    ],
    mistral: [
      { id: 'mistral-large-latest', name: 'Mistral Large' },
      { id: 'mistral-small-latest', name: 'Mistral Small' },
      { id: 'open-mixtral-8x22b', name: 'Mixtral (8x22B)' },
      { id: 'codestral-latest', name: 'Codestral (Latest)' }
    ],
    gemini: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Best Reasoning)' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Fastest)' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' }
    ],
    openai: [
      { id: 'gpt-4o', name: 'GPT-4o (Default)' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'o3-mini', name: 'o3-mini (Reasoning)' },
      { id: 'o1-preview', name: 'o1-preview' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
    ],
    anthropic: [
      { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku' },
      { id: 'claude-3-opus-latest', name: 'Claude 3 Opus' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' }
    ]
  };

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    setModel(PROVIDER_MODELS[newProvider][0].id);
  };

  const handleGenerateRubric = async () => {
    if (!questionFile) return;
    
    setIsRubricLoading(true);
    setRubric(null);
    
    try {
      const formData = new FormData();
      if (questionFile) formData.append('question_file', questionFile);
      
      const apiKey = localStorage.getItem('gemini_api_key') || localStorage.getItem('groq_api_key') || '';
      formData.append('api_key', apiKey);
      formData.append('model', 'gemini-2.5-pro');
      
      const response = await api.post('/evaluate/rubric', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setRubric(response.data);
      toast.success("Dynamic Rubric synthesized!");
    } catch (error: any) {
      console.error("Rubric Error:", error);
      toast.error(error.response?.data?.detail || "Failed to synthesize rubric.");
    } finally {
      setIsRubricLoading(false);
    }
  };

  const [result, setResult] = useState<EvaluationResult | null>(null);

  const pollBatchTasks = async (taskIds: string[]) => {
    setIsBatchPolling(true);
    let completed = 0;
    let localTasks: { id: string; status: string; result?: any; error?: string }[] = taskIds.map(id => ({ id, status: 'PENDING' }));
    setBatchTasks(localTasks);
    
    let finalSuccess = 0;
    let finalFailed = 0;
    
    while (completed < taskIds.length) {
       await new Promise(r => setTimeout(r, 2000)); // Poll every 2 seconds
       
       let currentCompleted = 0;
       let successCount = 0;
       let failedCount = 0;
       
       for (let i = 0; i < taskIds.length; i++) {
           const taskId = taskIds[i];
           if (localTasks[i].status === 'SUCCESS' || localTasks[i].status === 'FAILURE') {
               currentCompleted++;
               if (localTasks[i].status === 'SUCCESS') successCount++;
               if (localTasks[i].status === 'FAILURE') failedCount++;
               continue;
           }
           
           try {
               const res = await api.get(`/evaluate/task/${taskId}`);
               const data = res.data;
               localTasks[i] = { id: taskId, status: data.status, result: data.result, error: data.error };
               
               if (data.status === 'SUCCESS' || data.status === 'FAILURE') {
                   currentCompleted++;
                   if (data.status === 'SUCCESS') successCount++;
                   if (data.status === 'FAILURE') failedCount++;
               }
           } catch (e) {
               console.error("Polling error", e);
           }
       }
       
       setBatchTasks([...localTasks]);
       setBatchProgress({ completed: currentCompleted, total: taskIds.length, success: successCount, failed: failedCount });
       completed = currentCompleted;
       finalSuccess = successCount;
       finalFailed = failedCount;
    }
    
    setIsBatchPolling(false);
    toast.success(`Batch compilation complete! ${finalSuccess} successful, ${finalFailed} failed.`);
  };

  const handleEvaluate = async () => {
    if (!questionFile) {
      toast.error("Please upload a Question Paper");
      return;
    }
    if (!answerFile && !zipFile) {
      toast.error("Please upload an Answer Sheet or Batch ZIP");
      return;
    }
    
    if (zipFile) {
        setIsBatchPolling(true);
        setBatchTasks([]);
        setBatchProgress({ completed: 0, total: 0, success: 0, failed: 0 });
        
        try {
            const formData = new FormData();
            formData.append('zip_file', zipFile);
            formData.append('question_file', questionFile);
            if (answerKeyFile) formData.append('answer_key_file', answerKeyFile);
            kbFiles.forEach(file => formData.append('kb_files', file));
            
            if (rubric) formData.append('custom_rubric', JSON.stringify(rubric));
            
            const apiKey = localStorage.getItem('openai_api_key') || localStorage.getItem('anthropic_api_key') || localStorage.getItem('gemini_api_key') || localStorage.getItem('groq_api_key') || '';
            
            formData.append('provider', provider);
            formData.append('model', model);
            formData.append('api_key', apiKey);

            const response = await api.post('/evaluate/batch', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const data = response.data;
            if (data.task_ids) {
                setBatchProgress(prev => ({ ...prev, total: data.total_tasks }));
                pollBatchTasks(data.task_ids);
                toast.success(`Dispatched ${data.total_tasks} exams to the processing stack!`);
            }
        } catch (error: any) {
            console.error("Batch Evaluation Error:", error);
            toast.error(error.response?.data?.detail || "Failed to start batch evaluation.");
            setIsBatchPolling(false);
        }
        return;
    }
    
    setIsEvaluating(true);
    setResult(null);
    
    try {
      const formData = new FormData();
      if (questionFile) formData.append('question_file', questionFile);
      if (answerFile) formData.append('answer_file', answerFile);
      if (answerKeyFile) formData.append('answer_key_file', answerKeyFile);
      
      kbFiles.forEach(file => {
        formData.append('kb_files', file);
      });
      
      if (rubric) {
        formData.append('custom_rubric', JSON.stringify(rubric));
      }
      
      const pClean = (provider || 'groq').toLowerCase();
      let apiKey = '';
      if (pClean === 'groq') apiKey = localStorage.getItem('groq_api_key') || '';
      else if (pClean === 'mistral') apiKey = localStorage.getItem('mistral_api_key') || '';
      else if (pClean === 'gemini') apiKey = localStorage.getItem('gemini_api_key') || '';
      else if (pClean === 'openai') apiKey = localStorage.getItem('openai_api_key') || '';
      else if (pClean === 'anthropic') apiKey = localStorage.getItem('anthropic_api_key') || '';

      if (!apiKey) {
        apiKey = localStorage.getItem('groq_api_key') || localStorage.getItem('gemini_api_key') || localStorage.getItem('mistral_api_key') || localStorage.getItem('openai_api_key') || localStorage.getItem('anthropic_api_key') || '';
      }
      
      formData.append('provider', provider);
      formData.append('strictness', strictness);
      formData.append('partial_credit', 'true');
      formData.append('api_key', apiKey);
      formData.append('model', model);

      const response = await api.post('/evaluate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000 // 5 minutes (300,000 ms)
      });

      const data = response.data;
      setResult(data as EvaluationResult);
      setShowModal(true);
      toast.success("Evaluation complete! Result popup window opened.");

      setTimeout(() => {
        const elem = document.getElementById('evaluation-results-section');
        if (elem) elem.scrollIntoView({ behavior: 'smooth' });
      }, 200);

    } catch (error: any) {
      console.error("Evaluation Error:", error);
      const errMsg = error.response?.data?.detail || error.message || "Evaluation failed. Please check your API key and try again.";
      toast.error(`Evaluation Failed: ${errMsg}`, { duration: 8000 });
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur-xl sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 shadow-sm">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                AI Evaluation Wizard
              </h1>
              <p className="text-muted-foreground text-sm font-medium mt-0.5">
                Upload exams to intelligently grade and evaluate.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="space-y-8 animate-in fade-in duration-700">
          
          {/* ROW 1: Uploads */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Question Paper Section */}
            <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden relative">
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Question Paper</h2>
                    <p className="text-xs font-medium text-slate-500">Upload the exam question file</p>
                  </div>
                </div>

                <div className="flex-1">
                  <FileUpload
                    accept=".pdf,.jpg,.jpeg,.png,.txt"
                    onFileSelect={setQuestionFile}
                    disabled={isEvaluating}
                  />

                  {questionFile && (
                    <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                      <p className="text-xs font-bold text-emerald-700 truncate">✓ {questionFile.name}</p>
                    </div>
                  )}
                </div>
                
                <Button 
                   variant="outline" 
                   className="w-full mt-4 border-slate-200 bg-slate-50 hover:bg-primary/5 hover:border-primary/40 hover:text-primary text-slate-700 font-bold rounded-xl py-5 text-xs transition-all"
                   onClick={handleGenerateRubric}
                   disabled={isRubricLoading || !questionFile}
                >
                   {isRubricLoading ? "Synthesizing Rubric..." : "✨ Auto-Generate Dynamic Rubric"}
                </Button>
                
                {rubric && (
                   <div className="mt-3 p-3 bg-slate-900 rounded-xl text-2xs font-mono text-emerald-400 overflow-auto max-h-[140px] border border-slate-800">
                      {JSON.stringify(rubric, null, 2)}
                   </div>
                )}
              </div>
            </Card>

            {/* Answer Key Section */}
            <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden relative">
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Answer Key (Optional)</h2>
                    <p className="text-xs font-medium text-slate-500">Upload model solutions for accuracy</p>
                  </div>
                </div>

                <div className="flex-1">
                  <FileUpload
                    accept=".pdf,.jpg,.jpeg,.png,.txt"
                    onFileSelect={setAnswerKeyFile}
                    disabled={isEvaluating}
                  />

                  {answerKeyFile && (
                    <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                      <p className="text-xs font-bold text-emerald-700 truncate">✓ {answerKeyFile.name}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Answer Sheet Section */}
            <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden relative">
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <ClipboardCheck className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Answer Sheet</h2>
                    <p className="text-xs font-medium text-slate-500">Upload a single sheet or use Batch Processor below</p>
                  </div>
                </div>

                <div className="flex-1">
                  <FileUpload
                    accept=".pdf,.jpg,.jpeg,.png,.txt"
                    onFileSelect={setAnswerFile}
                    disabled={isEvaluating}
                  />

                  {answerFile && (
                    <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                      <p className="text-xs font-bold text-emerald-700 truncate">✓ {answerFile.name}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

          </div>

          {/* ROW 2: Advanced Features */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Knowledge Base Section */}
            <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden relative">
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <Library className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Knowledge Base</h2>
                    <p className="text-xs font-medium text-slate-500">Upload textbooks or syllabi for RAG context</p>
                  </div>
                </div>

                <div className="flex-1">
                  <FileUpload
                    accept=".pdf,.txt"
                    onFileSelect={(file) => setKbFiles([...kbFiles, file])}
                    disabled={isEvaluating}
                  />

                  {kbFiles.length > 0 && (
                    <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                      <p className="text-xs font-bold text-emerald-700 truncate">✓ {kbFiles.map(f => f.name).join(', ')}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Batch Exam Processor Section */}
            <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden relative">
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Batch Processor</h2>
                    <p className="text-xs font-medium text-slate-500">Upload a ZIP of multiple answer sheets</p>
                  </div>
                </div>

                <div className="flex-1">
                  <FileUpload
                     accept=".zip"
                     onFileSelect={setZipFile}
                     disabled={isEvaluating}
                  />

                  {zipFile && (
                    <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                      <p className="text-xs font-bold text-emerald-700 truncate">✓ Bulk ready: {zipFile.name}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

          </div>

          {/* ROW 3: Settings */}
          <div className="max-w-3xl mx-auto">
            <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden relative">
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-3.5 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Settings2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Evaluation Settings</h2>
                    <p className="text-xs font-medium text-slate-500">Choose AI model provider and grading strictness</p>
                  </div>
                </div>

                <div className="pt-1">
                  <div className="flex flex-col sm:flex-row gap-5 items-center justify-between">
                    <div className="flex-1 w-full">
                      <Label className="text-xs font-bold text-slate-700 mb-1.5 block">AI Provider</Label>
                      <Select value={provider} onValueChange={handleProviderChange} disabled={isEvaluating}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 text-xs font-semibold focus:bg-white focus:border-primary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 text-slate-900 rounded-xl shadow-lg">
                          <SelectItem value="groq" className="cursor-pointer text-xs font-semibold">Groq</SelectItem>
                          <SelectItem value="mistral" className="cursor-pointer text-xs font-semibold">Mistral AI</SelectItem>
                          <SelectItem value="gemini" className="cursor-pointer text-xs font-semibold">Google Gemini</SelectItem>
                          <SelectItem value="openai" className="cursor-pointer text-xs font-semibold">OpenAI</SelectItem>
                          <SelectItem value="anthropic" className="cursor-pointer text-xs font-semibold">Anthropic Claude</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1 w-full">
                      <Label className="text-xs font-bold text-slate-700 mb-1.5 block">Provider Model</Label>
                      <Select value={model} onValueChange={setModel} disabled={isEvaluating}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 text-xs font-semibold focus:bg-white focus:border-primary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 text-slate-900 rounded-xl shadow-lg">
                          {PROVIDER_MODELS[provider].map((m) => (
                             <SelectItem key={m.id} value={m.id} className="cursor-pointer text-xs font-semibold">
                               {m.name}
                             </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-full sm:w-[160px]">
                      <Label className="text-xs font-bold text-slate-700 mb-1.5 block">Strictness</Label>
                      <Select value={strictness} onValueChange={setStrictness} disabled={isEvaluating}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-11 text-xs font-semibold focus:bg-white focus:border-primary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 text-slate-900 rounded-xl shadow-lg">
                          <SelectItem value="lenient" className="cursor-pointer text-xs font-semibold">Lenient</SelectItem>
                          <SelectItem value="moderate" className="cursor-pointer text-xs font-semibold">Moderate</SelectItem>
                          <SelectItem value="strict" className="cursor-pointer text-xs font-semibold">Strict</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Evaluate Action Button */}
          <div className="flex justify-center pt-4 pb-2">
            <Button
              onClick={handleEvaluate}
              disabled={isEvaluating || isBatchPolling || !questionFile || (!answerFile && !zipFile)}
              className="w-full md:w-1/2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-7 rounded-2xl text-lg shadow-xl shadow-primary/25 transition-all transform hover:-translate-y-1 hover:scale-[1.02]"
            >
              <Sparkles className="w-6 h-6 mr-3" />
              {isEvaluating || isBatchPolling ? 'Evaluating...' : 'Evaluate with AI'}
            </Button>
          </div>

          {/* Batch Tracking Section (Visible ONLY for Batch jobs) */}
          {(isBatchPolling || batchTasks.length > 0) && (
            <div className="pt-8 border-t border-slate-200 animate-in slide-in-from-bottom-8 duration-700">
               <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6 text-center">Batch Processing Tracker</h2>
               
               <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden max-w-4xl mx-auto p-8 relative">
                  
                  <div className="flex justify-between items-end font-bold mb-3 relative z-10">
                     <span className="text-slate-900 text-lg">Cluster Progress</span>
                     <span className="text-indigo-600 text-xl">{batchProgress.completed} / {batchProgress.total} Exams</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-5 mb-8 border border-slate-200 overflow-hidden shadow-inner relative z-10">
                     <div 
                       className="bg-indigo-600 h-full rounded-full transition-all duration-1000 ease-out relative"
                       style={{ width: `${batchProgress.total > 0 ? (batchProgress.completed / batchProgress.total) * 100 : 0}%` }}
                     >
                       {isBatchPolling && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-6 mb-8 relative z-10">
                     <div className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-200 shadow-xs">
                       <p className="text-slate-500 text-xs uppercase font-extrabold tracking-widest mb-1.5">Total Enqueued</p>
                       <p className="text-3xl font-black text-slate-900">{batchProgress.total}</p>
                     </div>
                     <div className="bg-emerald-50 rounded-2xl p-5 text-center border border-emerald-100 shadow-xs">
                       <p className="text-emerald-700 text-xs uppercase font-extrabold tracking-widest mb-1.5">Successful</p>
                       <p className="text-3xl font-black text-emerald-600">{batchProgress.success}</p>
                     </div>
                     <div className="bg-rose-50 rounded-2xl p-5 text-center border border-rose-100 shadow-xs">
                       <p className="text-rose-700 text-xs uppercase font-extrabold tracking-widest mb-1.5">Failed</p>
                       <p className="text-3xl font-black text-rose-600">{batchProgress.failed}</p>
                     </div>
                  </div>
                  
                  {/* Console Log Panel */}
                  <div className="bg-slate-900 text-slate-100 rounded-xl border border-slate-800 max-h-[250px] overflow-y-auto p-2 space-y-1 font-mono text-sm shadow-inner relative z-10">
                     {batchTasks.map((t, idx) => (
                        <div key={t.id} className="flex justify-between items-center py-2.5 px-4 hover:bg-white/5 rounded-lg transition-colors border-b border-white/[0.02] last:border-0">
                          <span className="text-muted-foreground font-medium">Exam #{idx + 1} processing instance</span>
                          {t.status === 'PENDING' && (
                             <span className="text-amber-500 font-bold flex items-center gap-2 text-xs bg-amber-500/10 px-2 py-1 rounded">
                               <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></div> PENDING
                             </span>
                          )}
                          {t.status === 'SUCCESS' && (
                             <span className="text-emerald-400 font-bold text-xs bg-emerald-500/10 px-2 py-1 rounded">
                               ✓ SUCCESS ({t.result?.result?.grade || 'A'})
                             </span>
                          )}
                          {t.status === 'FAILURE' && (
                             <span className="text-rose-400 font-bold text-xs bg-rose-500/10 px-2 py-1 rounded">
                               ✗ FAILED
                             </span>
                          )}
                        </div>
                     ))}
                  </div>
               </Card>
            </div>
          )}

          {/* Single Evaluation Results Section (Visible ONLY for single-sheet jobs) */}
          {(isEvaluating || result) && !zipFile && (
            <div id="evaluation-results-section" className="pt-8 border-t border-white/10 animate-in slide-in-from-bottom-8 duration-700">
              <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6 text-center">Evaluation Results</h2>
              
              <Card className="bg-card/60 backdrop-blur-2xl border-white/5 shadow-premium rounded-2xl overflow-hidden max-w-4xl mx-auto">
                <div className="p-8">
                  {isEvaluating && (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-input border-t-primary mb-6"></div>
                      <p className="text-foreground font-bold text-2xl mb-2">Analyzing Answer Sheet...</p>
                      <p className="text-base font-medium text-muted-foreground">Our AI engines are processing the document visually and matching the rubric</p>
                    </div>
                  )}

                  {result && !isEvaluating && (
                    <div className="space-y-8">
                      <ScoreGauge
                        percentage={result.percentage}
                        grade={result.grade}
                        gradeName={result.grade_name || "Completed"}
                        confidence={result.ai_confidence || 95}
                      />
                      <div className="pt-6 border-t border-white/5">
                        <QuestionBreakdown questions={result.questions_results} />
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
          
        </div>
      </div>

      {(isEvaluating || isBatchPolling) && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center animate-in fade-in duration-300">
           <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center animate-bounce shadow-lg shadow-primary/20">
              <Sparkles className="w-7 h-7 text-primary animate-pulse" />
           </div>
           <h3 className="text-xl font-extrabold text-foreground mt-4 tracking-tight">
              {isBatchPolling ? "Batch Compilation Triggered" : "AI Evaluation in Progress"}
           </h3>
           <p className="text-muted-foreground text-xs text-center max-w-xs mt-1 px-4 leading-relaxed">
              {isBatchPolling 
                 ? "Syncing large payloads with server nodes to bulk-evaluate answers efficiently."
                 : "Our vision engines are analyzing your answer sheet document and grading it against the dynamic rubric."}
           </p>
           <div className="mt-6 flex items-center gap-2 text-xs font-bold text-primary bg-primary/10 px-3.5 py-1.5 rounded-full border border-primary/20 shadow-sm animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></div>
              {isBatchPolling ? `Completed ${batchProgress.completed}/${batchProgress.total}` : "Synthesizing Node Graders"}
           </div>
        </div>
      )}

      {/* EVALUATION RESULT POP-UP MODAL WINDOW */}
      {showModal && result && (
        <div className="fixed inset-0 z-[120] bg-background/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* Modal Header - matches app primary color */}
            <div className="px-6 py-4 border-b border-border bg-primary/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Sparkles className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground tracking-tight">Evaluation Completed</h2>
                  <p className="text-xs text-muted-foreground">Result saved and synced to Students tab</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => { setShowModal(false); navigate('/students'); }}
                  className="bg-primary text-primary-foreground text-xs rounded-lg h-8 px-3 gap-1.5"
                >
                  <User className="w-3.5 h-3.5" />
                  View in Students
                </Button>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">

              {/* Student Identity Card */}
              <div className="rounded-xl border border-border bg-background p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm shadow-sm">
                    {result.student_name ? result.student_name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{result.student_name || 'Unknown Student'}</h3>
                    <p className="text-xs text-muted-foreground">Auto-extracted from answer sheet</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold border border-border">
                    <Hash className="w-3 h-3" />
                    Roll: {result.roll_number || 'N/A'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent text-accent-foreground text-xs font-semibold border border-border">
                    <Folder className="w-3 h-3" />
                    {result.class_section || 'General Section'}
                  </span>
                  {result.email && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold border border-border">
                      <Mail className="w-3 h-3" />
                      {result.email}
                    </span>
                  )}
                </div>
              </div>

              {/* Score + Feedback Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Score Gauge */}
                <div className="md:col-span-1">
                  <ScoreGauge
                    percentage={result.percentage}
                    grade={result.grade}
                    gradeName={result.grade_name || 'Passed'}
                    confidence={result.ai_confidence || 85}
                  />
                </div>

                {/* Feedback + Stats */}
                <div className="md:col-span-2 space-y-3">
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Overall AI Feedback</p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {result.overall_feedback || 'Strong comprehension demonstrated throughout the submission.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-border bg-background p-3 text-center">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Score</p>
                      <p className="text-lg font-black text-foreground">{result.total_earned}<span className="text-sm font-semibold text-muted-foreground">/{result.total_max}</span></p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-3 text-center">
                      <p className="text-xs text-muted-foreground font-medium mb-1">Percentage</p>
                      <p className="text-lg font-black text-primary">{result.percentage}%</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-3 text-center">
                      <p className="text-xs text-muted-foreground font-medium mb-1">AI Confidence</p>
                      <p className="text-lg font-black text-foreground">{result.ai_confidence || 85}%</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-primary/5 px-4 py-2.5 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-xs font-semibold text-foreground">Student profile created/updated in <span className="text-primary">Students Tab</span></span>
                  </div>
                </div>
              </div>

              {/* Question Breakdown */}
              <div>
                <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-primary" />
                  Question-wise Breakdown
                </h4>
                <QuestionBreakdown questions={result.questions_results || []} />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-muted/30 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Saved securely to Database</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg text-xs h-8"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => { setShowModal(false); navigate('/students'); }}
                  className="bg-primary text-primary-foreground rounded-lg text-xs h-8 gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Go to Students Tab
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Evaluate;
