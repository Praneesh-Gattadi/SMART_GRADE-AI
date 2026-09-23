import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import axios from 'axios';
import logo from '@/assets/logo.png';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Password Reset State
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState<'email' | 'otp' | 'new_password'>('email');
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

  React.useEffect(() => {
    if (window.location.search.includes('revoked=1')) {
      setError('Your faculty account access has been revoked by your institution administrator.');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setIsLoading(true);

  try {
    // Create FormData for OAuth2 compatibility
    const formData = new FormData();
    formData.append('username', email);  // ← EMAIL goes in username field
    formData.append('password', password);

    const response = await axios.post(
      // @ts-ignore
      `${import.meta.env.VITE_API_BASE_URL}/auth/login`,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, user } = response.data;
    
    // Store auth data
    setAuth(access_token, user);
    
    // Redirect to dashboard
    navigate('/');
  } catch (err: any) {
    setError(err.response?.data?.detail || 'Invalid credentials. Please try again.');
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Title Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-800">
            SmartGrade AI
          </h1>
          <p className="text-slate-500 font-semibold tracking-wide uppercase text-xs">Precision AI Grading System</p>
        </div>

        {/* Login Card */}
        <Card className="bg-white/90 backdrop-blur-xl border-slate-200/80 shadow-xl shadow-indigo-100/50 p-8 rounded-2xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome Back</h2>
            <p className="text-slate-500 text-sm">Sign in to your teacher account</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label className="text-slate-700 font-medium mb-2 block text-sm">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="email"
                  placeholder="teacher@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 rounded-xl"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <Label className="text-slate-700 font-medium block text-sm">Password</Label>
              <button
                type="button"
                onClick={() => {
                  setIsResetOpen(true);
                  setResetStep('email');
                  setResetEmail(email || '');
                  setResetOtp('');
                  setNewPass('');
                  setConfirmPass('');
                }}
                className="text-xs text-indigo-600 hover:underline font-bold"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-11 rounded-xl"
                required
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-6 text-base shadow-lg shadow-indigo-500/20 rounded-xl"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-primary hover:underline font-semibold"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </Card>

        {/* Forgot Password Email OTP Modal */}
        {isResetOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0" onClick={() => setIsResetOpen(false)} />
            <Card className="w-full max-w-sm bg-white border border-slate-200 shadow-2xl p-6 rounded-2xl relative z-10 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Forgot Password</h3>
                </div>
                <button onClick={() => setIsResetOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  ✕
                </button>
              </div>

              {resetStep === 'email' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    Enter your registered email address or username to receive a 6-digit verification code:
                  </p>
                  <div>
                    <Label className="text-xs font-bold text-slate-700 block mb-1">Email / Username</Label>
                    <Input
                      type="text"
                      placeholder="teacher@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-slate-900 h-11 rounded-xl"
                    />
                  </div>
                  <Button
                    onClick={async () => {
                      if (!resetEmail) {
                        setError('Please enter your email or username.');
                        return;
                      }
                      try {
                        setIsResetLoading(true);
                        const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/password-reset/send-otp`, { email: resetEmail });
                        if (res.data.code_dev) console.log("🔑 Dev OTP Code:", res.data.code_dev);
                        setResetStep('otp');
                      } catch (e: any) {
                        setError(e.response?.data?.detail || "Failed to send reset code.");
                      } finally {
                        setIsResetLoading(false);
                      }
                    }}
                    disabled={isResetLoading}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11 rounded-xl shadow-md"
                  >
                    {isResetLoading ? "Sending Code..." : "Send Verification Code"}
                  </Button>
                </div>
              )}

              {resetStep === 'otp' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    Enter the 6-digit OTP code sent to <strong className="text-slate-900">{resetEmail}</strong>:
                  </p>
                  <div>
                    <Input
                      type="text"
                      maxLength={6}
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-center text-xl font-mono font-bold text-slate-900 h-12 rounded-xl"
                      placeholder="123456"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setResetStep('email')}
                      className="flex-1 text-xs font-semibold rounded-xl h-11 border-slate-200 text-slate-700"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!resetOtp) return;
                        try {
                          setIsResetLoading(true);
                          await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/password-reset/verify-otp`, { email: resetEmail, otp_code: resetOtp, new_password: '' });
                          setResetStep('new_password');
                        } catch (e: any) {
                          setError(e.response?.data?.detail || "Invalid or expired OTP code.");
                        } finally {
                          setIsResetLoading(false);
                        }
                      }}
                      disabled={isResetLoading || !resetOtp}
                      className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold h-11 rounded-xl shadow-md"
                    >
                      {isResetLoading ? "Verifying..." : "Verify Code"}
                    </Button>
                  </div>
                </div>
              )}

              {resetStep === 'new_password' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    OTP verified! Set your new password below:
                  </p>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-700 block mb-1">New Password</Label>
                      <div className="relative">
                        <Input
                          type={showNewPass ? 'text' : 'password'}
                          value={newPass}
                          onChange={(e) => setNewPass(e.target.value)}
                          className="bg-slate-50 border-slate-200 text-slate-900 h-11 rounded-xl pr-10"
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
                              <div key={key} className={`flex items-center gap-2 text-xs font-semibold transition-colors ${passed ? 'text-emerald-600' : 'text-slate-400'}`}>
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${passed ? 'bg-emerald-500 text-white' : 'bg-slate-200'}`}>
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
                      <Label className="text-xs font-bold text-slate-700 block mb-1">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          type={showConfirmPass ? 'text' : 'password'}
                          value={confirmPass}
                          onChange={(e) => setConfirmPass(e.target.value)}
                          className={`text-slate-900 h-11 rounded-xl pr-10 ${
                            confirmPass && confirmPass !== newPass
                              ? 'bg-red-50 border-red-300'
                              : 'bg-slate-50 border-slate-200'
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
                        <p className="text-xs text-red-500 font-semibold mt-1">Passwords do not match</p>
                      )}
                      {confirmPass && confirmPass === newPass && isPasswordValid && (
                        <p className="text-xs text-emerald-600 font-semibold mt-1">✓ Passwords match</p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={async () => {
                      if (!isPasswordValid) {
                        setError('Password must meet all the requirements listed above.');
                        return;
                      }
                      if (newPass !== confirmPass) {
                        setError('Passwords do not match.');
                        return;
                      }
                      try {
                        setIsResetLoading(true);
                        // @ts-ignore
                        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/password-reset/confirm`, {
                          email: resetEmail,
                          otp_code: resetOtp,
                          new_password: newPass
                        });
                        setIsResetOpen(false);
                        setError('');
                        alert("Password updated successfully! You can now log in with your new password.");
                      } catch (e: any) {
                        setError(e.response?.data?.detail || "Failed to update password.");
                      } finally {
                        setIsResetLoading(false);
                      }
                    }}
                    disabled={isResetLoading || !isPasswordValid || !confirmPass || newPass !== confirmPass}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11 rounded-xl shadow-md disabled:opacity-50"
                  >
                    {isResetLoading ? "Updating..." : "Set New Password"}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-slate-400 text-sm mt-8">
          © 2026 SmartGrade AI. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
