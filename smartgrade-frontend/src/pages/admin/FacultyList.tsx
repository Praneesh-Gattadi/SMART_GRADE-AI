import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, Copy, Check, ShieldCheck, Trash2, BarChart3, X } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export const FacultyList: React.FC = () => {
    const { user, token } = useAuthStore();
    const [faculty, setFaculty] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [inviteUrl, setInviteUrl] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    
    // Individual Analytics State
    const [selectedFaculty, setSelectedFaculty] = useState<any | null>(null);
    const [facultyStats, setFacultyStats] = useState<any | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    useEffect(() => {
        if (token) fetchFaculty();
    }, [token]);

    const fetchFacultyStats = async (facultyItem: any) => {
        setLoadingStats(true);
        setSelectedFaculty(facultyItem);
        setFacultyStats(null);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/admin/faculty/${facultyItem.id}/analytics`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFacultyStats(res.data);
        } catch (e) {
            console.error("Fetch stats fail:", e);
            toast.error("Failed to load faculty analytics.");
        } finally {
            setLoadingStats(false);
        }
    };

    const fetchFaculty = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/admin/faculty`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFaculty(res.data);
        } catch (e) {
            console.error("Fetch faculty fail:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateInvite = async () => {
        setIsGenerating(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/admin/invite`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInviteUrl(res.data.link);
            toast.success("Invite link generated!");
        } catch (e) {
            console.error("Invite generation fail:", e);
            toast.error("Failed to generate invite.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDeleteFaculty = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this faculty member? All their linked data may be affected.")) return;
        
        try {
            await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/admin/faculty/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Faculty deleted successfully");
            fetchFaculty(); // refresh
        } catch (e) {
            console.error("Delete fail:", e);
            toast.error("Failed to delete faculty account.");
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <ShieldCheck className="w-9 h-9 text-primary" />
                        Faculty Management
                    </h1>
                    <p className="text-slate-500 text-base font-medium">Manage instructors and coordinate grading workflows across your institution.</p>
                </div>
                <Button 
                    onClick={handleGenerateInvite} 
                    disabled={isGenerating} 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 px-5 shadow-md shadow-primary/20 rounded-xl border border-primary transition-all flex items-center gap-2"
                >
                    <UserPlus className="w-4 h-4 text-primary-foreground" />
                    <span>{isGenerating ? "Generating..." : "Invite Faculty"}</span>
                </Button>
            </div>

            {inviteUrl && (
                <Card className="p-5 bg-indigo-50/70 border border-indigo-100 shadow-sm rounded-2xl flex flex-col sm:flex-row items-center gap-4 justify-between">
                    <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">Faculty Onboarding Link Generated!</p>
                        <p className="text-xs text-slate-500 font-medium">Share this link with your staff to let them register under your organization.</p>
                        <div className="mt-2.5 flex items-center gap-2 bg-white p-2.5 rounded-xl border border-indigo-100 max-w-md shadow-xs">
                            <input type="text" value={inviteUrl} readOnly className="bg-transparent text-xs text-slate-800 font-mono font-medium flex-1 outline-none" />
                            <button onClick={handleCopy} className="p-1.5 hover:bg-indigo-50 rounded-lg transition-colors">
                                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
                            </button>
                        </div>
                    </div>
                </Card>
            )}

            {isLoading ? (
                <div className="text-center text-slate-400 font-medium py-16">Loading faculty members...</div>
            ) : faculty.length === 0 ? (
                <Card className="p-16 flex flex-col items-center justify-center text-center bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-md rounded-2xl">
                    <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 mb-4 shadow-xs">
                        <Users className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">No faculty members found</h3>
                    <p className="text-slate-500 text-sm max-w-sm mb-6 font-medium leading-relaxed">
                        Invite instructors using a secured invite link to populate your institute dashboard.
                    </p>
                    <Button 
                        onClick={handleGenerateInvite} 
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 px-6 shadow-md shadow-primary/20 rounded-xl border border-primary transition-all flex items-center gap-2"
                    >
                        <UserPlus className="w-4 h-4 text-primary-foreground" />
                        <span>Generate Onboarding Link</span>
                    </Button>
                </Card>
            ) : (
                <Card className="overflow-hidden bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-md rounded-2xl divide-y divide-slate-100">
                    <div className="grid grid-cols-4 p-4 text-xs font-bold text-slate-500 tracking-wider uppercase bg-slate-50/80 border-b border-slate-200/80">
                        <div>Name</div>
                        <div>Email</div>
                        <div>Role</div>
                        <div className="text-right">Actions</div>
                    </div>
                    {faculty.map((f) => (
                        <div key={f.id} className="grid grid-cols-4 p-4 items-center text-sm border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <div className="font-bold text-slate-900">{f.full_name || f.username}</div>
                            <div className="text-slate-500 text-xs font-medium">{f.email}</div>
                            <div>
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                    {f.role}
                                </span>
                            </div>
                            <div className="text-right flex justify-end gap-1.5">
                                <Button 
                                    onClick={() => fetchFacultyStats(f)} 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-indigo-50 rounded-lg"
                                >
                                    <BarChart3 className="w-4 h-4" />
                                </Button>
                                <Button 
                                    onClick={() => handleDeleteFaculty(f.id)} 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </Card>
            )}

            {/* Micro Modal Overlay for Analytics */}
            {selectedFaculty && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                     <Card className="w-full max-w-lg bg-white border border-slate-200 shadow-2xl p-6 rounded-2xl relative animate-in zoom-in-95 duration-200">
                          <button onClick={() => setSelectedFaculty(null)} className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                               <X className="w-4 h-4 text-slate-400" />
                          </button>
                          
                          <div className="mb-6">
                               <h2 className="text-xl font-bold text-slate-900">Faculty Analytics</h2>
                               <p className="text-sm text-slate-500 font-medium">{selectedFaculty.full_name || selectedFaculty.username} ({selectedFaculty.email})</p>
                          </div>

                          {loadingStats ? (
                               <div className="py-12 text-center text-slate-400 text-sm font-medium">Loading stats...</div>
                          ) : facultyStats ? (
                               <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                         <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                                              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Evaluations</p>
                                              <h4 className="text-2xl font-black text-slate-900">{facultyStats.total_evaluations}</h4>
                                         </div>
                                         <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                                              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Students</p>
                                              <h4 className="text-2xl font-black text-slate-900">{facultyStats.total_students}</h4>
                                         </div>
                                    </div>
                                    <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100 text-center">
                                         <p className="text-xs text-primary font-bold uppercase tracking-wider">Average Score</p>
                                         <h4 className="text-3xl font-black text-primary">{facultyStats.average_score}%</h4>
                                    </div>

                                    {/* Grade distribution */}
                                    <div className="mt-4">
                                         <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Grade Breakdown</p>
                                         <div className="flex gap-2">
                                              {['A','B','C','D','F'].map(g => (
                                                   <div key={g} className="flex-1 text-center bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                                                        <div className="font-bold text-xs text-slate-600">{g}</div>
                                                        <div className="text-base font-black text-slate-900">{facultyStats.grade_distribution[g] || 0}</div>
                                                   </div>
                                              ))}
                                         </div>
                                    </div>
                               </div>
                          ) : (
                               <div className="py-12 text-center text-slate-400 text-sm font-medium">Failed to retrieve stats.</div>
                          )}
                     </Card>
                </div>
            )}
        </div>
    );
};

export default FacultyList;
