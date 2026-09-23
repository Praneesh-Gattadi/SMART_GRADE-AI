import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileCheck,
  Users,
  History,
  BarChart3,
  Settings,
  ClipboardEdit,
  Sparkles,
  Menu,
  X,
  LogOut,
  KeyRound,
  Mail,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/api/axios';
import toast from 'react-hot-toast';
import logo from '@/assets/logo.png';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, clearAuth } = useAuthStore();

  const menuItems = user?.role === 'institution_admin'
    ? [
      { icon: LayoutDashboard, label: 'Admin Dashboard', path: '/' },
      { icon: Users, label: 'Faculty Management', path: '/admin/faculty' },
      { icon: BarChart3, label: 'Institution Stats', path: '/analytics' },
      { icon: Settings, label: 'Settings', path: '/settings' },
    ]
    : [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: FileCheck, label: 'Evaluate', path: '/evaluate' },
      { icon: Users, label: 'Students', path: '/students' },
      { icon: History, label: 'History', path: '/history' },
      { icon: BarChart3, label: 'Analytics', path: '/analytics' },
      { icon: ClipboardEdit, label: 'Manual Review', path: '/review' },
      { icon: Settings, label: 'Settings', path: '/settings' },
    ];

  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    mobile_number: '',
    school_name: '',
    subject: '',
    current_password: '',
    new_password: '',
    otp_code: ''
  });

  // Email OTP Reset Password State
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetStep, setResetStep] = useState<'send' | 'verify' | 'new'>('send');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);

  const passwordValidations = {
    hasLength: newPass.length >= 8,
    hasUpper: /[A-Z]/.test(newPass),
    hasLower: /[a-z]/.test(newPass),
    hasNumber: /[0-9]/.test(newPass),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPass)
  };
  const isPasswordValid = Object.values(passwordValidations).every(Boolean);

  const handleSendResetOTP = async (targetEmail?: string) => {
    const emailToSend = targetEmail || resetEmail || user?.email;
    if (!emailToSend) {
      toast.error("Email address is required.");
      return;
    }
    try {
      setIsResetLoading(true);
      const res = await api.post('/auth/password-reset/send-otp', { email: emailToSend });
      toast.success(res.data.message || "OTP code sent to your email!");
      if (res.data.code_dev) {
        console.log("🔑 Dev OTP Code:", res.data.code_dev);
      }
      setResetStep('verify');
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to send reset OTP.");
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleVerifyResetOTP = async () => {
    if (!resetOtp || resetOtp.length < 4) {
      toast.error("Please enter a valid 6-digit OTP code.");
      return;
    }
    const emailToUse = resetEmail || user?.email;
    try {
      setIsResetLoading(true);
      await api.post('/auth/password-reset/verify-otp', { email: emailToUse, otp_code: resetOtp, new_password: '' });
      toast.success("OTP verified! Please enter your new password.");
      setResetStep('new');
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Invalid or expired OTP code.");
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleConfirmResetPassword = async () => {
    if (!isPasswordValid) {
      toast.error("Password must be min 8 chars, 1 uppercase, 1 lowercase, 1 number, and 1 special char.");
      return;
    }
    if (newPass !== confirmPass) {
      toast.error("Passwords do not match.");
      return;
    }
    const emailToUse = resetEmail || user?.email;
    try {
      setIsResetLoading(true);
      const res = await api.post('/auth/password-reset/confirm', {
        email: emailToUse,
        otp_code: resetOtp,
        new_password: newPass
      });
      toast.success(res.data.message || "Password updated successfully!");
      setIsResettingPassword(false);
      setIsEditing(false);
      setResetStep('send');
      setResetOtp('');
      setNewPass('');
      setConfirmPass('');
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to reset password.");
    } finally {
      setIsResetLoading(false);
    }
  };

  const hexToHslChannels = (colorStr: string): string => {
    if (!colorStr) return '246 80% 60%';
    const trimmed = colorStr.trim();
    if (/^\d+\s*,\s*\d+%\s*,\s*\d+%$/.test(trimmed)) {
      return trimmed.replace(/,/g, '');
    }
    if (/^\d+\s+\d+%\s+\d+%$/.test(trimmed)) {
      return trimmed;
    }
    let hex = trimmed;
    if (hex.startsWith('#')) {
      hex = hex.slice(1);
    }
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    if (hex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(hex)) {
      return '246 80% 60%';
    }

    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const accents = [
    { name: 'Indigo Blue', primary: '246 80% 60%', accent: '246 80% 96%', hex: '#6366f1', hover: 'bg-indigo-600' },
    { name: 'Electric Blue', primary: '217 91% 60%', accent: '217 91% 96%', hex: '#3b82f6', hover: 'bg-blue-600' },
    { name: 'Neon Emerald', primary: '160 84% 39%', accent: '160 84% 96%', hex: '#10b981', hover: 'bg-emerald-600' },
    { name: 'Golden Amber', primary: '38 92% 50%', accent: '38 92% 96%', hex: '#f59e0b', hover: 'bg-amber-500' },
    { name: 'Crimson Rose', primary: '346 84% 61%', accent: '346 84% 96%', hex: '#f43f5e', hover: 'bg-rose-500' }
  ];

  const applyAccentTheme = (accent: any) => {
    if (!accent?.primary) return;
    const primaryHsl = hexToHslChannels(accent.primary);
    document.documentElement.style.setProperty('--primary', primaryHsl);
    document.documentElement.style.setProperty('--ring', primaryHsl);
    if (accent.accent) {
      const accentHsl = hexToHslChannels(accent.accent);
      document.documentElement.style.setProperty('--accent', accentHsl);
    }
    localStorage.setItem('accentColor', JSON.stringify(accent));
  };

  const handleAccentChange = (accent: any) => {
    applyAccentTheme(accent);
    toast.success(`${accent.name} theme applied across application!`);
  };

  const { updateUser } = useAuthStore();

  const [institution, setInstitution] = useState<any>(null);

  useEffect(() => {
    const savedAccent = localStorage.getItem('accentColor');
    if (savedAccent) {
      try {
        applyAccentTheme(JSON.parse(savedAccent));
      } catch (e) { }
    }

    // Auto-sync saved user & admin API keys from backend into localStorage
    api.get('/auth/me')
      .then(res => {
        const u = res.data;
        if (u) {
          if (u.groq_api_key) localStorage.setItem('groq_api_key', u.groq_api_key);
          if (u.mistral_api_key) localStorage.setItem('mistral_api_key', u.mistral_api_key);
          if (u.gemini_api_key) localStorage.setItem('gemini_api_key', u.gemini_api_key);
          if (u.openai_api_key) localStorage.setItem('openai_api_key', u.openai_api_key);
          if (u.anthropic_api_key) localStorage.setItem('anthropic_api_key', u.anthropic_api_key);
        }
      }).catch(() => { });

    // Fetch Institution settings for white-labeling
    if (user?.institution_id) {
      api.get('/api/admin/institution')
        .then(res => {
          setInstitution(res.data);
          if (res.data.theme_color && !localStorage.getItem('accentColor')) {
            const primaryHsl = hexToHslChannels(res.data.theme_color);
            document.documentElement.style.setProperty('--primary', primaryHsl);
            document.documentElement.style.setProperty('--ring', primaryHsl);
          }
        }).catch(() => { });
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accentColor' && e.newValue) {
        try {
          applyAccentTheme(JSON.parse(e.newValue));
        } catch (err) { }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (user && isAccountOpen) {
      setEditForm({
        full_name: user.full_name || '',
        email: user.email || '',
        mobile_number: user.mobile_number || '',
        school_name: (user as any).school_name || '',
        subject: (user as any).subject || '',
        current_password: '',
        new_password: '',
        otp_code: ''
      });
    }
  }, [user, isAccountOpen]);

  const handleSendOTP = async () => {
    console.log("🚀 Executing handleSendOTP with:", editForm.mobile_number);
    try {
      const res = await api.post('/auth/send-otp', { mobile_number: editForm.mobile_number });
      console.log("✅ Send OTP Response:", res.data);
      toast.success(res.data.message || "Verification code sent to your email!");
    } catch (e: any) {
      console.error("❌ Send OTP Error Detail:", e.response?.data || e.message || e);
      toast.error(e.response?.data?.detail || "Failed to send OTP");
    }
  };

  const handleSaveProfile = async () => {
    console.log("🚀 handleSaveProfile Payload:", editForm);
    try {
      setIsSaving(true);
      const res = await api.post('/auth/update-profile', {
        full_name: editForm.full_name || undefined,
        email: editForm.email || undefined,
        mobile_number: editForm.mobile_number || undefined,
        school_name: editForm.school_name || undefined,
        subject: editForm.subject || undefined,
        current_password: editForm.current_password || undefined,
        new_password: editForm.new_password || undefined,
        otp_code: editForm.otp_code || undefined
      });
      toast.success("Profile updated successfully!");
      updateUser({
        full_name: editForm.full_name,
        email: editForm.email,
        mobile_number: editForm.mobile_number,
        school_name: editForm.school_name,
        subject: editForm.subject
      } as any);
      setIsEditing(false);
    } catch (e: any) {
      console.error("❌ Save Profile Error:", e.response?.data || e.message || e);
      toast.error(e.response?.data?.detail || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsSaving(true);
      const res = await api.post('/auth/update-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success("Avatar updated!");
      updateUser({ avatar_url: res.data.avatar_url } as any);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to upload avatar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative overflow-hidden">


      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-foreground">{institution?.name || "SmartGrade AI"}</h1>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <Menu className="w-6 h-6 text-foreground" />
        </button>
      </div>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-card/95 backdrop-blur-xl border-r border-border shadow-premium transition-transform duration-300 z-50 flex flex-col',
          isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 md:translate-x-0 md:w-20'
        )}
      >
        {/* Header */}
        <div className={cn("border-b border-border", isSidebarOpen ? "p-6" : "p-4")}>
          <div className={cn(
            "flex items-center",
            isSidebarOpen ? "justify-between" : "flex-col gap-3 justify-center"
          )}>
            <div className={cn('flex items-center gap-3', !isSidebarOpen && 'justify-center')}>
              {isSidebarOpen && (
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-snug">{institution?.name || "SmartGrade AI"}</h1>
                  <p className="text-[11px] font-bold tracking-wider text-primary uppercase mt-0.5">Workspace</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-accent transition-colors flex items-center justify-center"
            >
              {isSidebarOpen ? (
                <X className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Menu className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 flex-1 overflow-y-auto">
          <ul className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold group',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 font-bold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    <Icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-primary-foreground' : 'text-slate-500 group-hover:text-slate-900')} />
                    {isSidebarOpen && (
                      <span className={cn('text-sm font-semibold', isActive ? 'text-primary-foreground' : 'text-slate-700')}>{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Profile & Logout */}
        <div className="p-3 border-t border-slate-200/80 bg-white">
          {isSidebarOpen ? (
            <div className="space-y-2">
              <div
                onClick={() => setIsAccountOpen(!isAccountOpen)}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100 transition-all select-none group shadow-xs"
                title={`${user?.username || 'User'} (${user?.email || ''}) - Click for details`}
              >
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-sm shadow-sm flex-shrink-0">
                  {user?.username?.charAt(0).toUpperCase() || 'P'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 text-sm font-bold truncate">
                    {user?.username || 'User'}
                  </p>
                  <p className="text-slate-500 text-xs font-medium truncate" title={user?.email}>
                    {user?.email || 'user@example.com'}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleLogout}
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl font-bold h-10"
              >
                <LogOut className="w-4 h-4 mr-2 text-red-500" />
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                onClick={() => setIsAccountOpen(!isAccountOpen)}
                className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-sm shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
                title={`${user?.username || 'User'} - Click for Profile`}
              >
                {user?.username?.charAt(0).toUpperCase() || 'P'}
              </div>
              <button
                onClick={handleLogout}
                className="w-9 h-9 rounded-xl text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center"
                title="Logout"
              >
                <LogOut className="w-5 h-5 text-red-500" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          'transition-all duration-300 min-h-screen pb-10',
          isSidebarOpen ? 'md:ml-64' : 'md:ml-20'
        )}
      >
        {children}
      </main>

      {/* Account Details Modal Modal window Popup Overlay */}
      {isAccountOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => { setIsAccountOpen(false); setIsEditing(false); }} />
          <Card className="w-full max-w-sm bg-white border border-slate-200 shadow-2xl p-6 rounded-2xl relative z-10 animate-in zoom-in-95 duration-200 flex flex-col items-center max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col items-center text-center space-y-4 w-full">
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-black text-3xl shadow-lg border-2 border-white relative overflow-hidden group flex-shrink-0">
                {(user as any)?.avatar_url ? (
                  <img src={`${api.defaults.baseURL || ''}${(user as any).avatar_url}`} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{(editForm.full_name || user?.username || 'T').charAt(0).toUpperCase()}</span>
                )}

                {isEditing && (
                  <label className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-xs font-bold text-white gap-1 animate-in fade-in duration-200">
                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                    <Sparkles className="w-4 h-4" />
                    Upload
                  </label>
                )}
              </div>

              {!isEditing ? (
                <>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{user?.full_name || 'Teacher Profile'}</h2>
                    <p className="text-slate-500 text-xs font-medium">{user?.email || 'no-email@synced.com'}</p>
                  </div>

                  <div className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 mt-2 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-500">
                      <span className="font-semibold">Username:</span>
                      <span className="font-bold text-slate-900 text-right">{user?.username || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span className="font-semibold">Role:</span>
                      <span className="font-bold text-slate-900 capitalize text-right">{user?.role || 'Teacher'}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span className="font-semibold">Account ID:</span>
                      <span className="font-bold text-slate-900 text-right">#{user?.id || '—'}</span>
                    </div>
                    {(user as any)?.school_name && (
                      <div className="flex justify-between items-center text-slate-500 border-t border-slate-200 pt-2 mt-2">
                        <span className="font-semibold">School:</span>
                        <span className="font-bold text-slate-900 text-right">{(user as any).school_name}</span>
                      </div>
                    )}
                    {user?.role !== 'institution_admin' && user?.role !== 'admin' && (user as any)?.subject && (
                      <div className="flex justify-between items-center text-slate-500 border-t border-slate-200 pt-2 mt-2">
                        <span className="font-semibold">Subject:</span>
                        <span className="font-bold text-slate-900 text-right">{(user as any).subject}</span>
                      </div>
                    )}
                    {user?.mobile_number && (
                      <div className="flex justify-between items-center text-slate-500 border-t border-slate-200 pt-2 mt-2">
                        <span className="font-semibold">Mobile:</span>
                        <span className="font-bold text-slate-900 text-right">{user.mobile_number}</span>
                      </div>
                    )}
                    {user?.created_at && (
                      <div className="flex justify-between items-center text-slate-500 border-t border-slate-200 pt-2 mt-2">
                        <span className="font-semibold">Joined:</span>
                        <span className="font-bold text-slate-900 text-right">{new Date(user.created_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="w-full space-y-1.5 mt-2.5 border-t border-slate-200 pt-2.5">
                    <label className="text-2xs font-semibold text-slate-500 block text-left">Accent Theme</label>
                    <div className="flex gap-2 items-center justify-start">
                      {accents.map((acc) => {
                        const isSelected = localStorage.getItem('accentColor')
                          ? JSON.parse(localStorage.getItem('accentColor') || '{}').name === acc.name
                          : acc.name === 'Purple';

                        return (
                          <button
                            key={acc.name}
                            onClick={() => handleAccentChange(acc)}
                            className={cn(
                              "w-5 h-5 rounded-full border border-white/10 shadow-sm cursor-pointer transition-all hover:scale-110 active:scale-95 flex items-center justify-center",
                              acc.hover,
                              isSelected && "ring-2 ring-white ring-offset-1 ring-offset-black/40 scale-105"
                            )}
                            title={acc.name}
                          >
                            {isSelected && <Sparkles className="w-2.5 h-2.5 text-white animate-pulse" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>


                  <div className="flex gap-2 w-full mt-4">
                    <Button onClick={() => setIsEditing(true)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl font-bold py-5 shadow-xs border border-slate-200">
                      Edit Profile
                    </Button>
                    <Button onClick={() => setIsAccountOpen(false)} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold py-5 shadow-md shadow-primary/20">
                      Close
                    </Button>
                  </div>
                </>
              ) : (
                <div className="w-full space-y-3.5 text-left">
                  <h2 className="text-lg font-bold text-center text-slate-900 mb-1">Update Profile</h2>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Full Name</label>
                    <input
                      type="text"
                      value={editForm.full_name}
                      onChange={e => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-none"
                      placeholder="Full Name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">School / Institution</label>
                    <input
                      type="text"
                      value={editForm.school_name}
                      onChange={e => setEditForm(prev => ({ ...prev, school_name: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-none"
                      placeholder="Enter School Name"
                    />
                  </div>
                  {user?.role !== 'institution_admin' && user?.role !== 'admin' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Teaching Subject</label>
                      <input
                        type="text"
                        value={editForm.subject}
                        onChange={e => setEditForm(prev => ({ ...prev, subject: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-none"
                        placeholder="e.g. Computer Science, Mathematics, Physics..."
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Mobile Number</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editForm.mobile_number}
                        onChange={e => setEditForm(prev => ({ ...prev, mobile_number: e.target.value }))}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-none"
                        placeholder="Mobile Number"
                      />
                      {editForm.mobile_number && editForm.mobile_number !== user?.mobile_number && (
                        <Button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();

                            handleSendOTP();
                          }}
                          className="bg-primary/10 hover:bg-primary/20 text-primary rounded-xl px-3 text-xs font-bold border border-primary/20 h-9"
                        >
                          Send
                        </Button>
                      )}
                    </div>
                    {editForm.mobile_number && editForm.mobile_number !== user?.mobile_number && (
                      <span className="text-2xs text-slate-500 mt-1 block">A verification code will be sent to your registered email for confirmation.</span>
                    )}
                  </div>
                  {editForm.mobile_number && editForm.mobile_number !== user?.mobile_number && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-1">
                      <label className="text-xs font-bold text-slate-700">OTP Code Verification</label>
                      <input
                        type="text"
                        value={editForm.otp_code}
                        onChange={e => setEditForm(prev => ({ ...prev, otp_code: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:outline-none"
                        placeholder="Enter 6-digit code (123456)"
                      />

                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-3 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsResettingPassword(true);
                        setResetStep('send');
                        setResetOtp('');
                        setNewPass('');
                        setConfirmPass('');
                      }}
                      className="w-full py-2.5 px-3 bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <KeyRound className="w-4 h-4 text-indigo-600" />
                      <span>Forgot / Change Password via Email OTP</span>
                    </button>
                  </div>

                  <div className="flex gap-2 w-full mt-4">
                    <Button onClick={() => setIsEditing(false)} disabled={isSaving} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl font-bold py-5 border border-slate-200">
                      Cancel
                    </Button>
                    <Button onClick={handleSaveProfile} disabled={isSaving} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold py-5 shadow-md shadow-primary/20">
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Email OTP Password Reset Modal */}
      {isResettingPassword && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setIsResettingPassword(false)} />
          <Card className="w-full max-w-sm bg-white border border-slate-200 shadow-2xl p-6 rounded-2xl relative z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Reset Account Password</h3>
              </div>
              <button onClick={() => setIsResettingPassword(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetStep === 'send' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  We will send a 6-digit OTP verification code to your registered email address:
                </p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-slate-900 text-sm">
                  {user?.email || resetEmail || 'your-email@example.com'}
                </div>
                <Button
                  onClick={() => handleSendResetOTP(user?.email || resetEmail)}
                  disabled={isResetLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 rounded-xl shadow-md shadow-primary/20"
                >
                  {isResetLoading ? "Sending OTP Code..." : "Send OTP to Gmail"}
                </Button>
              </div>
            )}

            {resetStep === 'verify' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Enter the 6-digit verification code sent to <strong className="text-slate-900">{user?.email || resetEmail}</strong>:
                </p>
                <div>
                  <input
                    type="text"
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-center text-xl tracking-widest font-mono font-bold text-slate-900 h-12 focus:bg-white focus:border-primary focus:outline-none"
                    placeholder="123456"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleSendResetOTP(user?.email || resetEmail)}
                    disabled={isResetLoading}
                    className="flex-1 text-xs font-semibold rounded-xl h-11 border-slate-200 text-slate-700"
                  >
                    Resend OTP
                  </Button>
                  <Button
                    onClick={handleVerifyResetOTP}
                    disabled={isResetLoading || !resetOtp}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 rounded-xl shadow-md shadow-primary/20"
                  >
                    {isResetLoading ? "Verifying..." : "Verify Code"}
                  </Button>
                </div>
              </div>
            )}

            {resetStep === 'new' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  OTP verified! Enter your new password below to update your account:
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pr-10 text-sm text-slate-900 focus:bg-white focus:border-primary focus:outline-none"
                        placeholder="Min 8 chars, uppercase, number, symbol"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPass ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7a9.98 9.98 0 015.75 1.8M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                      </button>
                    </div>

                    {/* Password Strength Checklist */}
                    {newPass.length > 0 && (
                      <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                        {[
                          { key: 'hasLength', label: 'At least 8 characters' },
                          { key: 'hasUpper', label: '1 Uppercase letter (A-Z)' },
                          { key: 'hasLower', label: '1 Lowercase letter (a-z)' },
                          { key: 'hasNumber', label: '1 Number (0-9)' },
                          { key: 'hasSpecial', label: '1 Special character (!@#$%...)' },
                        ].map(({ key, label }) => {
                          const passed = passwordValidations[key as keyof typeof passwordValidations];
                          return (
                            <div key={key} className={`flex items-center gap-2 text-2xs font-semibold transition-colors ${passed ? 'text-emerald-600' : 'text-slate-400'}`}>
                              <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${passed ? 'bg-emerald-500 text-white' : 'bg-slate-200'}`}>
                                {passed ? '✓' : '·'}
                              </span>
                              {label}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPass ? 'text' : 'password'}
                        value={confirmPass}
                        onChange={(e) => setConfirmPass(e.target.value)}
                        className={`w-full bg-slate-50 border rounded-xl px-3 py-2.5 pr-10 text-sm text-slate-900 focus:bg-white focus:outline-none ${
                          confirmPass && confirmPass !== newPass ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-primary'
                        }`}
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPass ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7a9.98 9.98 0 015.75 1.8M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                      </button>
                    </div>
                    {confirmPass && confirmPass !== newPass && (
                      <p className="text-2xs text-red-500 font-semibold mt-1">Passwords do not match</p>
                    )}
                    {confirmPass && confirmPass === newPass && isPasswordValid && (
                      <p className="text-2xs text-emerald-600 font-semibold mt-1">✓ Passwords match</p>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleConfirmResetPassword}
                  disabled={isResetLoading || !isPasswordValid || !confirmPass || newPass !== confirmPass}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 rounded-xl shadow-md shadow-primary/20 disabled:opacity-50"
                >
                  {isResetLoading ? "Updating Password..." : "Set New Password"}
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default Layout;
