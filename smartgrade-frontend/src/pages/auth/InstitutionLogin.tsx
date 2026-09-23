import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Briefcase, Mail, Lock, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

export const InstitutionLogin: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { setAuth } = useAuthStore();

    const [institution, setInstitution] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'faculty' | 'admin'>('faculty');
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchInstitution = async () => {
            try {
                // We will create this endpoint in backend later to fetch details via subdomain-slug
                const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/institutions/details/${slug}`);
                setInstitution(res.data);
            } catch (e) {
                console.error("Institution load fail:", e);
                setError("Organization not found.");
            } finally {
                setIsLoading(false);
            }
        };
        if (slug) fetchInstitution();
    }, [slug]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
             // standard login forwards token
             const reqData = new FormData();
             reqData.append('username', formData.username);
             reqData.append('password', formData.password);

             const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/login`, reqData);
             
             // Verify the logged user belongs here
             const userRole = res.data.user.role;
             if (Number(res.data.user.institution_id) !== Number(institution?.id) && userRole !== 'admin') {
                  setError("You do not belong to this institution panel.");
                  return;
             }

             if (activeTab === 'admin' && userRole !== 'institution_admin' && userRole !== 'admin') {
                  setError("You are not an administrator of this institution.");
                  return;
             }
             if (activeTab === 'faculty' && userRole !== 'faculty') {
                  setError("You are not registered as Faculty of this institution.");
                  return;
             }

             setAuth(res.data.access_token, res.data.user);
             navigate('/');
        } catch (err: any) {
             setError(err.response?.data?.detail || "Invalid credentials.");
        }
    };

    const [logoError, setLogoError] = useState(false);
    const logoUrl = (institution?.logo_url || '').trim();
    const isValidLogoUrl = logoUrl.startsWith('http://') || logoUrl.startsWith('https://') || logoUrl.startsWith('data:image/');

    if (isLoading) return <div className="flex items-center justify-center h-screen text-foreground">Loading Portal...</div>;
    if (error && !institution) return <div className="flex items-center justify-center h-screen text-destructive">{error}</div>;

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-50 relative overflow-hidden">
            <Card className="w-full max-w-md p-8 bg-white/90 backdrop-blur-xl border-slate-200/80 shadow-xl shadow-indigo-100/50 rounded-2xl">
                <div className="text-center mb-8">
                    {isValidLogoUrl && !logoError ? (
                        <img
                            src={logoUrl}
                            alt={institution?.name}
                            onError={() => setLogoError(true)}
                            className="h-12 mx-auto mb-4 object-contain"
                        />
                    ) : (
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 border border-indigo-400/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white font-black shadow-md px-1 overflow-hidden">
                            {(() => {
                                const name = institution?.name || '';
                                const words = name.trim().split(/[\s\-]+/).filter((w: string) => w.length > 0);
                                let initials = 'INST';
                                if (words.length === 1 && words[0]) {
                                    initials = words[0].length <= 4 ? words[0].toUpperCase() : words[0].slice(0, 3).toUpperCase();
                                } else if (words.length > 1) {
                                    initials = words.map((w: string) => w[0].toUpperCase()).join('').slice(0, 4);
                                }
                                return (
                                    <span className={initials.length > 2 ? 'text-xs font-black tracking-tight uppercase' : 'text-xl font-black uppercase'}>
                                        {initials}
                                    </span>
                                );
                            })()}
                        </div>
                    )}
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">{institution?.name}</h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium">
                        {activeTab === 'admin' ? "Institutional Administrator Portal" : "Faculty & Educator Portal"}
                    </p>
                    {institution?.subdomain && (
                        <div className="mt-2.5">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50/80 text-primary border border-indigo-100 text-xs font-mono font-medium rounded-full">
                                {institution.subdomain}
                            </span>
                        </div>
                    )}
                </div>

                {!institution?.has_admin && (
                    <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex flex-col gap-2">
                        <p className="font-bold">No Administrator Account Found</p>
                        <p className="text-xs text-amber-700">This institution portal does not have an administrator account registered yet. If you are the owner, please set up the administrator account first.</p>
                        <Link 
                            to={`/signup?org=${slug}`}
                            className="mt-1 text-center py-2 px-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors block text-xs shadow-md shadow-indigo-500/20"
                        >
                            Create Admin Account
                        </Link>
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-700 text-sm font-medium">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                        <p>{error}</p>
                    </div>
                )}

                <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1 mb-6 border border-slate-200/80">
                    <button
                        type="button"
                        onClick={() => setActiveTab('faculty')}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'faculty' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Faculty Login
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('admin')}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'admin' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Admin Login
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="username" className="text-slate-700 font-medium text-sm">Email address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                            <Input
                                id="username"
                                name="username"
                                type="text"
                                placeholder={
                                    activeTab === 'admin' 
                                        ? (institution?.subdomain ? `admin@${institution.subdomain}` : "admin@institution.edu")
                                        : (institution?.subdomain ? `faculty@${institution.subdomain}` : "faculty@institution.edu")
                                }
                                className="pl-10 bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-11"
                                value={formData.username}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-slate-700 font-medium text-sm">Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                className="pl-10 bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-11"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20">
                        Sign In to {institution?.name}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-slate-500">
                        Not from {institution?.name}? <Link to="/login" className="text-primary font-semibold hover:underline">Go to general login</Link>
                    </p>
                </div>
            </Card>
        </div>
    );
};

export default InstitutionLogin;
