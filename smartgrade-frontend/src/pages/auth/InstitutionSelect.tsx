import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Briefcase, Info } from 'lucide-react';
import axios from 'axios';

const getInstitutionInitials = (name: string): string => {
    if (!name || !name.trim()) return 'INST';
    const words = name.trim().split(/[\s\-]+/).filter(w => w.length > 0);
    
    if (words.length === 1) {
        const word = words[0];
        return word.length <= 4 ? word.toUpperCase() : word.slice(0, 3).toUpperCase();
    }

    const initials = words.map(w => w[0].toUpperCase()).join('');
    return initials.slice(0, 4);
};

const InstitutionAvatar: React.FC<{ inst: any }> = ({ inst }) => {
    const [imgError, setImgError] = useState(false);
    const logoUrl = (inst.logo_url || '').trim();
    const isValidUrl = logoUrl.startsWith('http://') || logoUrl.startsWith('https://') || logoUrl.startsWith('data:image/');

    if (isValidUrl && !imgError) {
        return (
            <img
                src={logoUrl}
                alt={inst.name}
                onError={() => setImgError(true)}
                className="h-10 w-10 object-contain rounded-xl border border-slate-200 bg-white p-1 shadow-xs shrink-0"
            />
        );
    }

    const initials = getInstitutionInitials(inst.name || '');

    return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 border border-indigo-400/30 flex items-center justify-center text-white font-black shadow-sm shrink-0 group-hover:scale-105 transition-transform overflow-hidden px-1">
            <span className={initials.length > 2 ? 'text-[10px] tracking-tighter uppercase font-black' : 'text-sm font-black'}>
                {initials}
            </span>
        </div>
    );
};

export const InstitutionSelect: React.FC = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [missingAdminInst, setMissingAdminInst] = useState<{name: string, subdomain: string} | null>(null);

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (searchTerm.length >= 2) {
                fetchInstitutions();
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [searchTerm]);

    const fetchInstitutions = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/institutions/search?q=${searchTerm}`);
            setResults(res.data);
        } catch (e) {
            console.error("Search error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelect = (inst: any) => {
        if (inst.has_admin === false) {
            setMissingAdminInst(inst);
        } else {
            navigate(`/org/${inst.subdomain}/login`);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-50 relative overflow-hidden">
            <Card className="w-full max-w-md p-8 bg-white/90 backdrop-blur-xl border-slate-200/80 shadow-xl shadow-indigo-100/50 rounded-2xl">
                <div className="text-center mb-8">
                    <div className="flex justify-center items-center gap-2 mb-6">
                        <div className="px-4 py-2 bg-indigo-50/60 border border-indigo-100/80 rounded-xl shadow-xs flex items-center gap-1.5">
                            <span className="text-xl font-black tracking-tight text-slate-900">SmartGrade</span>
                            <span className="text-xl font-black text-primary">AI</span>
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Select your institution</h1>
                    <p className="text-slate-500 text-sm mt-1">Search for your school or college portal to sign in</p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Institution</label>
                        <div className="relative">
                            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                            <Input
                                type="text"
                                placeholder="Type your institution name"
                                className="pl-10 h-11 bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl shadow-xs focus:ring-2 focus:ring-primary/20"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {results.length === 0 && !isLoading && (
                        <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-start gap-2.5 text-indigo-900 text-sm shadow-xs">
                            <Info className="w-4 h-4 mt-0.5 text-indigo-600 flex-shrink-0" />
                            <p className="leading-relaxed">Please type your Institution name to search. You can type the first 2 letters of your institution to see the list.</p>
                        </div>
                    )}

                    {isLoading && <div className="text-center text-sm text-slate-500 py-4 font-medium">Searching institutions...</div>}

                    {results.length > 0 && (
                        <div className="divide-y divide-slate-100 overflow-hidden bg-slate-50/50 border border-slate-200 shadow-sm rounded-xl max-h-60 overflow-y-auto">
                            {results.map((inst) => (
                                <div
                                    key={inst.id}
                                    onClick={() => handleSelect(inst)}
                                    className="p-3.5 flex items-center gap-3.5 hover:bg-indigo-50/60 cursor-pointer transition-all group"
                                >
                                    <InstitutionAvatar inst={inst} />
                                    <div>
                                        <p className="font-semibold text-slate-900 text-sm group-hover:text-primary transition-colors">{inst.name}</p>
                                        <p className="text-xs text-slate-400 lowercase font-mono">{inst.subdomain}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-8 text-center border-t border-slate-200/80 pt-6">
                        <p className="text-sm text-slate-500">
                            Want to register your school or college? 
                            <Link to="/register-institution" className="text-primary hover:underline ml-1 font-semibold">
                                Create Institution Portal
                            </Link>
                        </p>
                    </div>
                </div>
            </Card>

            {missingAdminInst && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <Card className="w-full max-w-sm p-6 bg-white shadow-2xl border-slate-200 rounded-2xl animate-in fade-in zoom-in duration-200">
                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Info className="w-6 h-6 text-amber-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Admin Account Required</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                The portal for <span className="font-semibold text-slate-700">{missingAdminInst.name}</span> has been registered, but no administrator account has been created yet.
                            </p>
                        </div>
                        <div className="space-y-3">
                            <button
                                onClick={() => navigate(`/signup?org=${missingAdminInst.subdomain}`)}
                                className="w-full py-2.5 px-4 bg-primary text-white rounded-xl font-medium text-sm hover:bg-indigo-600 transition-colors shadow-sm shadow-indigo-200"
                            >
                                Create Admin Account
                            </button>
                            <button
                                onClick={() => setMissingAdminInst(null)}
                                className="w-full py-2.5 px-4 bg-slate-50 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-100 transition-colors border border-slate-200"
                            >
                                Cancel
                            </button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default InstitutionSelect;
