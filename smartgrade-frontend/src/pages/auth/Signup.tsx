import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';
import logo from '@/assets/logo.png';

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    school_name: '',
    school_type: 'School',
    otp_code: '',
    invite_code: ''
  });

  const [institutionDetails, setInstitutionDetails] = useState<any>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const org = params.get('org');
    const ref = params.get('ref');
    
    if (org) {
       // Fetch institution definition for branding
       const cleanOrg = encodeURIComponent(org.trim().toLowerCase());
       axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/institutions/details/${cleanOrg}`)
         .then(res => {
             setInstitutionDetails(res.data);
             setFormData(prev => ({
                ...prev,
                school_name: res.data.name,
                school_type: res.data.type,
                invite_code: ref || ''
             }));
         })
         .catch(e => console.error("Details failed", e));
    } else if (ref) {
         setFormData(prev => ({ ...prev, invite_code: ref }));
    }
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [passwordValidations, setPasswordValidations] = useState({
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
    hasSpecial: false,
    hasLength: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    if (name === 'password') {
       setPasswordValidations({
          hasUpper: /[A-Z]/.test(value),
          hasLower: /[a-z]/.test(value),
          hasNumber: /\d/.test(value),
          hasSpecial: /[@$!%*?&]/.test(value),
          hasLength: value.length >= 8
       });
    }
  };

  const handleSendOtp = async () => {
    if (!formData.email) {
       setError("Email is required to verify.");
       return;
    }
    setError('');
    setIsSendingOtp(true);
    try {
       await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/signup/send-otp`, {
          email: formData.email
       });
       setIsOtpSent(true);
    } catch (err: any) {
       setError(err.response?.data?.detail || "Failed to send verification code.");
    } finally {
       setIsSendingOtp(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Strict Password Validation
    const { hasUpper, hasLower, hasNumber, hasSpecial, hasLength } = passwordValidations;
    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial || !hasLength) {
      setError('Password does not meet all absolute requirements.');
      return;
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!isOtpSent && !formData.otp_code) {
       setError('Please verify your email address first.');
       return;
    }

    if (isOtpSent && !formData.otp_code) {
       setError('Please enter the verification code sent to your email.');
       return;
    }

    setIsLoading(true);

    try {
      // @ts-ignore
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/signup`, {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        school_name: formData.school_name,
        school_type: formData.school_type,
        otp_code: formData.otp_code,
        invite_code: formData.invite_code || undefined,
        subdomain: institutionDetails ? institutionDetails.subdomain : undefined
      });

      setSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 
        'Failed to create account. Email may already be registered or Invalid OTP.'
      );
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

        {/* Signup Card */}
        <Card className="bg-white/90 backdrop-blur-xl border-slate-200/80 shadow-xl shadow-indigo-100/50 p-8 rounded-2xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">
              {formData.invite_code 
                ? "Create Faculty Account" 
                : institutionDetails 
                  ? "Create Admin Account" 
                  : "Create Account"}
            </h2>
            <p className="text-slate-500 text-sm">
              {formData.invite_code 
                ? `Join ${institutionDetails?.name || "Institution"} as a faculty member`
                : institutionDetails 
                  ? `Set up the administrator account for ${institutionDetails.name}` 
                  : "Sign up as a teacher to get started"}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-green-700 text-sm font-medium">Account created successfully! Redirecting to login...</p>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Full Name */}
            <div>
              <Label className="text-slate-700 font-medium mb-2 block text-sm">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  name="username"
                  placeholder={formData.invite_code ? "e.g. Prof. Alex Smith" : (institutionDetails ? "e.g. Dr. John Doe" : "e.g. Prof. Alex Smith")}
                  value={formData.username}
                  onChange={handleChange}
                  className="pl-10 bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-11"
                  required
                  disabled={isLoading || success}
                />
              </div>
            </div>

            {/* Institution Badge if registering for specific institution */}
            {institutionDetails ? (
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100/80 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <p className="text-[11px] text-primary font-bold uppercase tracking-wider">Institution Portal</p>
                  <p className="text-sm font-bold text-slate-900">{institutionDetails.name}</p>
                </div>
                <span className="px-2.5 py-1 bg-indigo-100/80 text-primary rounded-lg text-xs font-mono font-medium border border-indigo-200/50">
                  {institutionDetails.subdomain}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <Label className="text-slate-700 font-medium mb-2 block text-sm">Type</Label>
                  <select
                    name="school_type"
                    value={formData.school_type}
                    onChange={handleChange}
                    className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 rounded-xl h-11 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={isLoading || success}
                  >
                    <option value="School" className="bg-white">School</option>
                    <option value="College" className="bg-white">College</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <Label className="text-slate-700 font-medium mb-2 block text-sm">Institution Name</Label>
                  <Input
                    type="text"
                    name="school_name"
                    placeholder="e.g. Siva Sivani Degree College"
                    value={formData.school_name}
                    onChange={handleChange}
                    className="bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-11"
                    required
                    disabled={isLoading || success}
                  />
                </div>
              </div>
            )}

            {/* Email + OTP Trigger (NEW) */}
            <div>
              <Label className="text-slate-700 font-medium mb-2 block text-sm">Email Address</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    type="email"
                    name="email"
                    placeholder={
                      formData.invite_code 
                        ? `e.g. faculty@${institutionDetails?.subdomain || 'institution.edu'} (min 8 chars)` 
                        : (institutionDetails ? `e.g. admin@${institutionDetails.subdomain} (min 8 chars)` : "e.g. teacher@institution.edu (min 8 chars)")
                    }
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10 bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-11"
                    required
                    disabled={isLoading || success || isOtpSent}
                  />
                </div>
                {!isOtpSent && (
                   <Button 
                     type="button" 
                     onClick={handleSendOtp} 
                     disabled={isSendingOtp || !formData.email}
                     className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs px-4 h-11 rounded-xl font-semibold"
                   >
                      {isSendingOtp ? "Sending..." : "Verify"}
                   </Button>
                )}
              </div>
            </div>

            {isOtpSent && (
               <div className="animate-in slide-in-from-top-2 duration-200">
                 <Label className="text-slate-700 mb-2 block text-xs font-semibold">Enter 6-Digit Code</Label>
                 <Input
                   type="text"
                   name="otp_code"
                   placeholder="123456"
                   value={formData.otp_code}
                   onChange={handleChange}
                   className="bg-slate-50 border-primary/40 text-center font-bold tracking-widest text-lg text-primary placeholder:text-slate-300 h-11 rounded-xl"
                   maxLength={6}
                   required
                 />
                 <p className="text-primary text-xs mt-1 text-right cursor-pointer hover:underline font-semibold" onClick={handleSendOtp}>Resend Code?</p>
               </div>
            )}

            {/* Password */}
            <div>
              <Label className="text-slate-700 font-medium mb-2 block text-sm">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="password"
                  name="password"
                  placeholder="Minimum 8 characters"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-11"
                  required
                  disabled={isLoading || success}
                />
              </div>
              
              {/* Dynamic Validation Checklist */}
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                 <p className={passwordValidations.hasLength ? "text-emerald-600 font-medium flex items-center gap-1.5" : "text-slate-400 flex items-center gap-1.5"}>
                    <div className={`w-1.5 h-1.5 rounded-full ${passwordValidations.hasLength ? 'bg-emerald-500' : 'bg-slate-300'}`}></div> Min 8 Chars
                 </p>
                 <p className={passwordValidations.hasUpper ? "text-emerald-600 font-medium flex items-center gap-1.5" : "text-slate-400 flex items-center gap-1.5"}>
                    <div className={`w-1.5 h-1.5 rounded-full ${passwordValidations.hasUpper ? 'bg-emerald-500' : 'bg-slate-300'}`}></div> 1 Uppercase
                 </p>
                 <p className={passwordValidations.hasLower ? "text-emerald-600 font-medium flex items-center gap-1.5" : "text-slate-400 flex items-center gap-1.5"}>
                    <div className={`w-1.5 h-1.5 rounded-full ${passwordValidations.hasLower ? 'bg-emerald-500' : 'bg-slate-300'}`}></div> 1 Lowercase
                 </p>
                 <p className={passwordValidations.hasNumber ? "text-emerald-600 font-medium flex items-center gap-1.5" : "text-slate-400 flex items-center gap-1.5"}>
                    <div className={`w-1.5 h-1.5 rounded-full ${passwordValidations.hasNumber ? 'bg-emerald-500' : 'bg-slate-300'}`}></div> 1 Number
                 </p>
                 <p className={passwordValidations.hasSpecial ? "text-emerald-600 font-medium flex items-center gap-1.5" : "text-slate-400 flex items-center gap-1.5"}>
                    <div className={`w-1.5 h-1.5 rounded-full ${passwordValidations.hasSpecial ? 'bg-emerald-500' : 'bg-slate-300'}`}></div> 1 Special Char
                 </p>
              </div>
            </div>

            <div>
              <Label className="text-slate-700 font-medium mb-2 block text-sm">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="password"
                  name="confirmPassword"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pl-10 bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl h-11"
                  required
                  disabled={isLoading || success}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || success}
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-6 text-base shadow-lg shadow-indigo-500/20 rounded-xl"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Creating account...
                </div>
              ) : success ? (
                'Account Created!'
              ) : (
                formData.invite_code ? 'Create Faculty Account' : (institutionDetails ? 'Create Admin Account' : 'Create Account')
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-primary hover:underline font-semibold"
              >
                Sign In
              </Link>
            </p>
          </div>
        </Card>

        {/* Footer */}
        <p className="text-center text-slate-400 text-sm mt-8">
          © 2026 SmartGrade AI. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Signup;
