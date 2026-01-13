
import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Lock,
  Smartphone,
  Mail,
  ArrowRight,
  Loader2,
  AlertCircle,
  KeyRound
} from 'lucide-react';
// Fix: Import UserRole from '../types' instead of '../App'
import { UserRole } from '../types';
import { supabase } from '../supabase';

interface LoginProps {
  onLogin: (role: UserRole, name: string) => void;
  onGoToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onGoToRegister }) => {
  const [portal, setPortal] = useState<'worker' | 'admin' | 'choice'>('choice');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const cleanId = identifier.trim().toLowerCase();
      const isEmail = cleanId.includes('@');

      // Query users table for matching email or mobile
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .or(
          isEmail
            ? `email.eq.${cleanId}`
            : `mobile.eq.${cleanId}`
        );

      if (fetchError || !data || data.length === 0) {
        throw new Error('Invalid credentials or account not found.');
      }

      const user = data[0];

      // Verification: Check role-based portal access
      if (portal === 'worker' && user.role !== UserRole.WORKER) {
        throw new Error('Access Denied: This account is not registered as a Field Worker.');
      }

      if (portal === 'admin' && user.role !== UserRole.ADMIN) {
        throw new Error('Access Denied: Administrative privileges required.');
      }

      // Verification: Check if account is active
      if (user.is_active === false) {
        throw new Error('Account Suspended: Please contact your administrator.');
      }

      // Verification: Password check (plain text check per current implementation)
      if (user.password_hash !== password) {
        throw new Error('Incorrect password. Please try again.');
      }

      // Finalize Login
      onLogin(user.role as UserRole, user.name);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400 font-medium text-gray-900';

  if (portal === 'choice') {
    return (
      <div className="max-w-md mx-auto py-12 px-4 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-indigo-100 rounded-3xl mb-4">
            <KeyRound className="h-10 w-10 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Field Track Pro</h1>
          <p className="text-gray-500 mt-2 italic">Secure Operational Intelligence</p>
        </div>

        <div className="grid gap-4">
          <button
            onClick={() => setPortal('worker')}
            className="group relative flex flex-col items-center justify-center p-8 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all text-center"
          >
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors mb-4">
              <User className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Field Worker Portal</h3>
            <p className="text-sm text-gray-400 mt-1">Visit logging & data capture</p>
          </button>

          <button
            onClick={() => setPortal('admin')}
            className="group relative flex flex-col items-center justify-center p-8 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all text-center"
          >
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors mb-4">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Admin Command Center</h3>
            <p className="text-sm text-gray-400 mt-1">Audit & records management</p>
          </button>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={onGoToRegister}
            className="text-indigo-600 font-bold hover:underline"
          >
            New user? Create your fleet profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4 animate-in slide-in-from-bottom-4 duration-300">
      <button
        onClick={() => setPortal('choice')}
        className="text-sm font-bold text-gray-500 mb-8 hover:underline group flex items-center gap-1"
      >
        <span>←</span> Back to Selection
      </button>

      <div className="bg-white p-8 rounded-[2rem] shadow-2xl shadow-gray-200 border border-gray-100">
        <div className="text-center mb-8">
          <div className={`inline-flex p-3 rounded-2xl mb-4 ${portal === 'worker' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {portal === 'worker' ? <Smartphone className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
          </div>
          <h2 className="text-2xl font-black text-gray-900">
            {portal === 'worker' ? 'Worker Login' : 'Admin Login'}
          </h2>
          <p className="text-gray-400 text-sm mt-1 font-medium italic">
            {portal === 'worker' ? 'Secure mobile identification' : 'Authorized email identification'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex gap-2 animate-in shake">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
              {portal === 'worker' ? 'Mobile Number / Email' : 'Email Address'}
            </label>
            <div className="relative mt-1">
              {identifier.includes('@') ? (
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              ) : (
                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              )}
              <input
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={portal === 'worker' ? "10-digit mobile or email" : "admin@fieldtrack.pro"}
                className={`${inputClass} pl-11`}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
              Access Password
            </label>
            <div className="relative mt-1">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`${inputClass} pl-11`}
              />
            </div>
          </div>

          <button
            disabled={loading}
            className={`w-full py-4 rounded-2xl text-white font-bold flex justify-center items-center gap-2 shadow-xl transition-all active:scale-[0.98] ${
              portal === 'worker' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-slate-900 hover:bg-black shadow-gray-200'
            } disabled:opacity-50`}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
            Authenticate session
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
