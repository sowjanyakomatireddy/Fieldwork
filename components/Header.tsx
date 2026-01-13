
import React from 'react';
import { Truck, CloudUpload, WifiOff, LayoutDashboard, ClipboardList } from 'lucide-react';
import { isLocalMode } from '../supabase';
// Fix: Import UserRole from '../types' instead of '../App'
import { UserRole } from '../types';

interface HeaderProps {
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
}

const Header: React.FC<HeaderProps> = ({ role, onRoleChange }) => {
  return (
    <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* Logo Section */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
              <Truck className="h-6 w-6" />
            </div>
            <span className="text-xl font-black tracking-tight text-gray-900">FieldTrack <span className="text-indigo-600">Pro</span></span>
          </div>
          
          <div className={`hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
            isLocalMode ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
          }`}>
            {isLocalMode ? <WifiOff className="h-3 w-3" /> : <CloudUpload className="h-3 w-3" />}
            {isLocalMode ? 'Offline Mode' : 'Cloud Sync Active'}
          </div>
        </div>
        
        {/* Role Switcher Section */}
        <nav className="flex items-center bg-gray-100 p-1 rounded-2xl border border-gray-200 shadow-inner">
          <button
            onClick={() => onRoleChange(UserRole.WORKER)}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black transition-all duration-200 ${
              role === UserRole.WORKER 
                ? 'bg-white text-indigo-600 shadow-md ring-1 ring-gray-200' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClipboardList className={`h-4 w-4 ${role === UserRole.WORKER ? 'text-indigo-600' : 'text-gray-400'}`} />
            Field Worker
          </button>
          <button
            onClick={() => onRoleChange(UserRole.ADMIN)}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black transition-all duration-200 ${
              role === UserRole.ADMIN 
                ? 'bg-white text-emerald-600 shadow-md ring-1 ring-gray-200' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutDashboard className={`h-4 w-4 ${role === UserRole.ADMIN ? 'text-emerald-600' : 'text-gray-400'}`} />
            Admin Panel
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
