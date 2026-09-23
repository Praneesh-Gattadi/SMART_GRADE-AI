import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Briefcase, Globe, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';

export const RegisterInstitution: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        subdomain: '',
        type: 'College',
        logo_url: '',
        theme_color: '#4f46e5'
    });
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const val = e.target.name === 'subdomain' ? e.target.value.toLowerCase().trim() : e.target.value;
        setFormData({ ...formData, [e.target.name]: val });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const cleanSubdomain = formData.subdomain.toLowerCase().trim();

        try {
            const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/institutions/create`, {
                name: formData.name,
                subdomain: cleanSubdomain,
                type: formData.type,
                logo_url: formData.logo_url || undefined,
                theme_color: formData.theme_color
            });
            
            setSuccess(true);
            
            // Redirect to Signup with invite code or linked org
            setTimeout(() => {
                 navigate(`/signup?org=${formData.subdomain}`);
            }, 2500);

        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to register institution.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-50 relative overflow-hidden">
            <Card className="w-full max-w-md p-8 bg-white/90 backdrop-blur-xl border-slate-200/80 shadow-xl shadow-indigo-100/50 rounded-2xl">
                <div className="text-center mb-8">
                    <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl w-fit mx-auto mb-4">
                        <Briefcase className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Register Institution</h1>
                    <p className="text-slate-500 text-sm mt-1">Create your institution portal for faculty onboards</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-700 text-sm font-medium">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                        <p>{error}</p>
                    </div>
                )}

                {success ? (
                    <div className="text-center space-y-4 py-6">
                        <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-full w-fit mx-auto">
                            <CheckCircle className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Institution Created!</h2>
                        <p className="text-slate-500 text-sm">Redirecting to create your Administrator account...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-slate-700 font-medium text-sm">Institution Name</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="e.g. Siva Sivani Degree College"
                                value={formData.name}
                                onChange={handleChange}
                                className="bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-11"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="subdomain" className="text-slate-700 font-medium text-sm">Unique URL Slug / Subdomain</Label>
                            <div className="relative">
                                <Globe className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                                <Input
                                    id="subdomain"
                                    name="subdomain"
                                    placeholder="e.g. sivasivani"
                                    className="pl-10 bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-11"
                                    value={formData.subdomain}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <p className="text-xs text-slate-400">Your portal will be available at /org/slug/login</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="type" className="text-slate-700 font-medium text-sm">Institution Type</Label>
                            <select
                                id="type"
                                name="type"
                                className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                value={formData.type}
                                onChange={handleChange}
                            >
                                <option value="School" className="bg-white">School</option>
                                <option value="College" className="bg-white">College</option>
                                <option value="University" className="bg-white">University</option>
                            </select>
                        </div>

                        <Button type="submit" disabled={isLoading} className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/20 mt-2">
                            {isLoading ? "Creating..." : "Register Institution Core"}
                        </Button>
                    </form>
                )}

                <div className="mt-6 text-center">
                    <p className="text-sm text-slate-500">
                        Already have an institution? <Link to="/login" className="text-primary font-semibold hover:underline">Select Institution</Link>
                    </p>
                </div>
            </Card>
        </div>
    );
};

export default RegisterInstitution;
