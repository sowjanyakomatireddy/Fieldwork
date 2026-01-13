
import React, { useState, useMemo } from 'react';
import {
  User,
  ShieldCheck,
  Lock,
  Smartphone,
  Mail,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  UserCheck
} from 'lucide-react';
// Fix: Import UserRole from '../types' instead of '../App'
import { UserRole } from '../types';
import { supabase } from '../supabase';

interface RegisterProps {
  onBackToLogin: () => void;
  onSuccess: (role: UserRole, name: string) => void;
}

const Register: React.FC<RegisterProps> = ({ onBackToLogin, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.WORKER);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  // ------------------- Validation -------------------
  const validation = useMemo(() => {
    const { name, email, mobile, password, confirmPassword } = formData;
    const errors: string[] = [];

    if (name.trim().length < 3) errors.push("Full Name must be at least 3 characters");

    if (selectedRole === UserRole.WORKER) {
      if (!/^\d{10}$/.test(mobile)) errors.push("Mobile number must be exactly 10 digits");
    }

    if (selectedRole === UserRole.ADMIN) {
      if (!email || !email.includes('@')) errors.push("Valid corporate email required for admin access");
    }

    if (password.length < 6) errors.push("Password must be at least 6 characters");
    if (password !== confirmPassword) errors.push("Passwords do not match");

    return { isValid: errors.length === 0, errors };
  }, [formData, selectedRole]);

  // ------------------- Register Handler -------------------
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.isValid) return;

    setLoading(true);
    setError(null);

    try {
      const cleanEmail = formData.email.trim().toLowerCase();
      const cleanMobile = formData.mobile.trim();

      // ------------------- Duplicate user check -------------------
      const orConditions = cleanEmail
        ? `email.eq.${cleanEmail},mobile.eq.${cleanMobile}`
        : `mobile.eq.${cleanMobile}`;

      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .or(orConditions)
        .limit(1);

      if (existing && existing.length > 0) {
        throw new Error("An account already exists with this email or mobile number.");
      }

      // ------------------- Insert new user -------------------
      const { error: insertError } = await supabase
        .from('users')
        .insert([{
          name: formData.name.trim(),
          role: selectedRole,
          email: cleanEmail || null,
          mobile: cleanMobile,
          password_hash: formData.password,
          is_active: true
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      onSuccess(selectedRole, formData.name.trim());

    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400 font-medium text-gray-900";

  return (
    <div className="max-w-xl mx-auto py-6 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 border border-gray-100">

        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-indigo-50 rounded-3xl mb-4">
            <UserCheck className="h-8 w-8 text-indigo-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Fleet Registration</h2>
          <p className="text-gray-500 mt-2 font-medium italic">Join the FieldTrack Pro network</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 text-sm font-bold rounded-2xl flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-6">

          <div className="flex bg-gray-100 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setSelectedRole(UserRole.WORKER)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${
                selectedRole === UserRole.WORKER ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <User className="h-4 w-4" /> Field Worker
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole(UserRole.ADMIN)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${
                selectedRole === UserRole.ADMIN ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ShieldCheck className="h-4 w-4" /> Administrator
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
            <input
              name="name"
              placeholder="e.g. John Doe"
              value={formData.name}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
              <input
                name="email"
                type="email"
                placeholder="name@company.com"
                value={formData.email}
                onChange={handleChange}
                className={inputClass}
                required={selectedRole === UserRole.ADMIN}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mobile Contact</label>
              <input
                name="mobile"
                placeholder="10-digit number"
                value={formData.mobile}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Set Password</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm Secret</label>
              <input
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </div>
          </div>

          <button
            disabled={loading || !validation.isValid}
            className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl active:scale-[0.98] ${
              selectedRole === UserRole.ADMIN 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
            } disabled:opacity-50`}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
            Initialize fleet account
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-50 text-center">
          <p className="text-sm text-gray-500 font-medium">
            Member of the Pro fleet?{' '}
            <button onClick={onBackToLogin} className="text-indigo-600 font-black hover:underline">
              Secure Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
