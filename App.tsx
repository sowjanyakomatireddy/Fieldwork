
import React from 'react';
import Header from './components/Header';
import AdminDashboard from './components/AdminDashboard';

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-truck"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-5l-4-4h-3v10a1 1 0 0 0 1 1Z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
            </div>
            <span className="text-xl font-black tracking-tight text-gray-900">FieldTrack <span className="text-indigo-600">Pro</span></span>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Operations
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8 max-w-7xl">
        <AdminDashboard />
      </main>

      <footer className="bg-white border-t py-8 text-center mt-12">
        <div className="flex items-center justify-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-widest">
          <span className="h-1 w-1 rounded-full bg-gray-300" />
          FieldTrack Management Suite
          <span className="h-1 w-1 rounded-full bg-gray-300" />
        </div>
        <p className="text-[10px] text-gray-300 mt-2 font-medium">
          &copy; {new Date().getFullYear()} Secure Field Tracking System. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default App;
