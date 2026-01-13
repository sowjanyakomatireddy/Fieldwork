
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../supabase';
import { FieldVisit, VisitStatus, VisitActivity } from '../types';
import VisitForm from './VisitForm';
import L from 'leaflet';
import { 
  Plus, Database, Calendar, TrendingUp, XCircle, Search, 
  MapPin, Eye, Edit3, X, Clock, User, Building2, 
  Smartphone, IndianRupee, History, Loader2, 
  ArrowLeft, ChevronRight, AlertCircle, FileText, Info,
  UserCircle, BarChart3, Target, Award, ShieldCheck,
  Mail
} from 'lucide-react';

/**
 * Robustly extracts a human-readable string from an error.
 */
const getErrorMessage = (err: any): string => {
  if (!err) return "An unknown error occurred.";
  if (typeof err === 'string') return err;
  const message = err.message || err.error_description || err.msg;
  if (message && typeof message === 'string') {
    if (message === 'Failed to fetch') {
      return "Network error: Connection to database failed. Please check your internet or Supabase configuration.";
    }
    return message;
  }
  try {
    const stringified = JSON.stringify(err, null, 2);
    if (stringified !== '{}') return stringified;
  } catch (e) {}
  return String(err);
};

type DashboardView = 'cards' | 'table' | 'add_new' | 'edit_visit' | 'profiles';

const AdminDashboard: React.FC = () => {
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<DashboardView>('cards');
  const [statusFilter, setStatusFilter] = useState<VisitStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  
  // Details & Modals State
  const [selectedVisit, setSelectedVisit] = useState<FieldVisit | null>(null);
  const [editingVisit, setEditingVisit] = useState<FieldVisit | null>(null);
  const [activities, setActivities] = useState<VisitActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [showMap, setShowMap] = useState<{lat: number, lng: number} | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('visits')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchErr) throw fetchErr;
      setVisits(data || []);
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      console.error("Fetch failure:", msg, err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchActivities = useCallback(async (visitId: string) => {
    setLoadingActivities(true);
    try {
      const { data, error: activityErr } = await supabase
        .from('visit_activities')
        .select('*')
        .eq('visit_id', visitId)
        .order('created_at', { ascending: false });
      
      if (activityErr) throw activityErr;
      setActivities(data || []);
    } catch (err) {
      console.error("Activity trail fetch error:", getErrorMessage(err), err);
    } finally {
      setLoadingActivities(false);
    }
  }, []);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  const stats = useMemo(() => {
    const followUpVisits = visits.filter(v => v.status === 'follow_up');
    const convertedVisits = visits.filter(v => v.status === 'converted');
    const rejectedVisits = visits.filter(v => v.status === 'rejected');
    
    return {
      follow_up: followUpVisits.length,
      converted: convertedVisits.length,
      rejected: rejectedVisits.length,
      total_revenue: convertedVisits.reduce((acc, curr) => acc + (curr.budget || 0), 0),
      total: visits.length
    };
  }, [visits]);

  // Unique workers data for profiles - Corrected to prevent duplicates
  const workerStats = useMemo(() => {
    const map = new Map<string, { name: string, total: number, converted: number, follow_up: number, rejected: number, phone?: string }>();
    visits.forEach(v => {
      const originalName = v.worker_name || 'Unknown';
      // Normalize key to handle leading/trailing spaces and case sensitivity issues
      const normalizedKey = originalName.trim().toLowerCase();
      
      if (!map.has(normalizedKey)) {
        map.set(normalizedKey, { 
          name: originalName.trim(), 
          total: 0, 
          converted: 0, 
          follow_up: 0, 
          rejected: 0, 
          phone: v.worker_phone 
        });
      }
      const s = map.get(normalizedKey)!;
      s.total++;
      if (v.status === 'converted') s.converted++;
      else if (v.status === 'follow_up') s.follow_up++;
      else if (v.status === 'rejected') s.rejected++;
      
      // Update phone if the first record didn't have one
      if (!s.phone && v.worker_phone) s.phone = v.worker_phone;
    });
    return Array.from(map.values());
  }, [visits]);

  const filteredVisits = useMemo(() => {
    let res = visits;
    if (statusFilter !== 'all') {
      res = res.filter(v => v.status === statusFilter);
    }
    if (search) {
      const s = search.toLowerCase();
      res = res.filter(v => 
        v.client_name.toLowerCase().includes(s) || 
        v.worker_name.toLowerCase().includes(s) ||
        (v.client_phone && v.client_phone.includes(s)) ||
        (v.client_email && v.client_email.toLowerCase().includes(s))
      );
    }
    return res;
  }, [visits, statusFilter, search]);

  const handleOpenCard = (status: VisitStatus | 'all') => {
    setStatusFilter(status);
    setView('table');
  };

  const handleRowClick = (visit: FieldVisit) => {
    setSelectedVisit(visit);
    if (visit.id) fetchActivities(visit.id);
  };

  const handleEditClick = (e: React.MouseEvent, visit: FieldVisit) => {
    e.stopPropagation();
    setEditingVisit(visit);
    setView('edit_visit');
  };

  if (loading && visits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">Synchronizing Records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Global Command Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <TrendingUp className="h-7 w-7 text-indigo-600" />
          Fleet Dashboard
        </h1>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setView('add_new')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> Add Visit
          </button>
          <button 
            onClick={() => { handleOpenCard('all'); setView('table'); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white px-6 py-4 rounded-2xl font-black text-sm shadow-xl shadow-gray-200 transition-all active:scale-[0.98]"
          >
            <Database className="h-4 w-4" /> Data
          </button>
          <button 
            onClick={() => { setView('profiles'); setSelectedWorker(null); }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-sm transition-all active:scale-[0.98] shadow-xl ${view === 'profiles' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <UserCircle className="h-4 w-4" /> Profiles
          </button>
        </div>
      </div>

      {view === 'cards' ? (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatusCard 
              title="Follow-up" 
              count={stats.follow_up} 
              icon={<Calendar className="h-8 w-8" />} 
              color="amber"
              onClick={() => handleOpenCard('follow_up')}
            />
            <StatusCard 
              title="Converted" 
              count={stats.converted} 
              subValue={`₹${stats.total_revenue.toLocaleString()}`}
              icon={<TrendingUp className="h-8 w-8" />} 
              color="emerald"
              onClick={() => handleOpenCard('converted')}
            />
            <StatusCard 
              title="Rejected" 
              count={stats.rejected} 
              icon={<XCircle className="h-8 w-8" />} 
              color="red"
              onClick={() => handleOpenCard('rejected')}
            />
          </div>

          {/* Personnel Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
               <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                 <ShieldCheck className="h-4 w-4 text-indigo-500" />
                 Active Personnel Directory
               </h3>
               <button onClick={() => setView('profiles')} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">View All Profiles</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {workerStats.slice(0, 4).map(worker => (
                <div key={worker.name} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4 hover:border-indigo-200 transition-all">
                   <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs uppercase">{worker.name.substring(0, 2)}</div>
                   <div>
                     <p className="text-sm font-black text-gray-800">{worker.name}</p>
                     <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{worker.phone || 'No Mobile'}</p>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : view === 'add_new' ? (
        <div className="max-w-3xl mx-auto space-y-6">
          <button onClick={() => setView('cards')} className="flex items-center gap-2 text-xs font-black text-gray-500 hover:text-indigo-600 uppercase tracking-widest"><ArrowLeft className="h-4 w-4" /> Back</button>
          <VisitForm onSuccess={() => { fetchVisits(); setView('cards'); }} />
        </div>
      ) : view === 'edit_visit' ? (
        <div className="max-w-3xl mx-auto space-y-6">
          <button onClick={() => setView('table')} className="flex items-center gap-2 text-xs font-black text-gray-500 hover:text-indigo-600 uppercase tracking-widest"><ArrowLeft className="h-4 w-4" /> Cancel Edit</button>
          {editingVisit && (
            <VisitForm 
              initialData={editingVisit} 
              onSuccess={() => { fetchVisits(); setView('table'); }} 
              onCancel={() => setView('table')} 
            />
          )}
        </div>
      ) : view === 'profiles' ? (
        <div className="animate-in slide-in-from-bottom-4 space-y-8">
          <button onClick={() => setView('cards')} className="flex items-center gap-2 text-xs font-black text-gray-500 hover:text-indigo-600 uppercase tracking-widest"><ArrowLeft className="h-4 w-4" /> Dashboard</button>
          
          {!selectedWorker ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workerStats.map(worker => (
                <div 
                  key={worker.name}
                  onClick={() => setSelectedWorker(worker.name)}
                  className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col items-center text-center"
                >
                  <div className="h-20 w-20 rounded-[2rem] bg-indigo-50 flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
                    <UserCircle className="h-10 w-10" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-1">{worker.name}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">{worker.phone || 'Verified Personnel'}</p>
                  
                  <div className="grid grid-cols-3 gap-4 w-full">
                    <div className="p-3 bg-emerald-50 rounded-2xl">
                      <p className="text-xs font-black text-emerald-600">{worker.converted}</p>
                      <p className="text-[8px] font-black text-emerald-400 uppercase">Won</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-2xl">
                      <p className="text-xs font-black text-amber-600">{worker.follow_up}</p>
                      <p className="text-[8px] font-black text-amber-400 uppercase">Pending</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-2xl">
                      <p className="text-xs font-black text-red-600">{worker.rejected}</p>
                      <p className="text-[8px] font-black text-red-400 uppercase">Lost</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[3.5rem] border border-gray-100 shadow-xl overflow-hidden">
              <div className="p-10 bg-indigo-600 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-6">
                  <div className="h-24 w-24 bg-white/20 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center">
                    <UserCircle className="h-12 w-12" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tight">{selectedWorker}</h2>
                    <p className="text-indigo-100 font-bold opacity-80 mt-1">Field Performance Specialist</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedWorker(null)}
                  className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  Back to All
                </button>
              </div>

              <div className="p-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-12">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <StatBox label="Total Visits" value={workerStats.find(w => w.name === selectedWorker)?.total || 0} icon={<BarChart3 className="h-5 w-5" />} color="blue" />
                    <StatBox label="Lead Success" value={`${Math.round(((workerStats.find(w => w.name === selectedWorker)?.converted || 0) / (workerStats.find(w => w.name === selectedWorker)?.total || 1)) * 100)}%`} icon={<Target className="h-5 w-5" />} color="emerald" />
                    <StatBox label="Rank" value="#1 Fleet" icon={<Award className="h-5 w-5" />} color="amber" />
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Recent Assignments</h4>
                    <div className="space-y-4">
                      {visits.filter(v => (v.worker_name || '').trim().toLowerCase() === selectedWorker.toLowerCase()).slice(0, 5).map(v => (
                        <div key={v.id} className="flex items-center justify-between p-6 bg-gray-50 rounded-[2rem] border border-gray-100 group hover:border-indigo-200 transition-all cursor-pointer" onClick={() => handleRowClick(v)}>
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600"><Building2 className="h-5 w-5" /></div>
                            <div>
                              <p className="text-sm font-black text-gray-900">{v.client_name}</p>
                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{v.client_type} • {v.landmark || 'No Landmark'}</p>
                            </div>
                          </div>
                          <div className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                            v.status === 'converted' ? 'bg-emerald-100 text-emerald-700' : 
                            v.status === 'follow_up' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {v.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-[3rem] p-10 text-white space-y-8 h-fit">
                  <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Contact & Personal Info</h4>
                  <div className="space-y-6">
                    <ProfileInfoItem icon={<Smartphone className="h-5 w-5" />} label="Mobile" value={workerStats.find(w => w.name === selectedWorker)?.phone || 'Not Shared'} />
                    <ProfileInfoItem icon={<MapPin className="h-5 w-5" />} label="Base Location" value="Corporate HQ" />
                    <ProfileInfoItem icon={<Clock className="h-5 w-5" />} label="On-Boarding" value="Aug 2024" />
                  </div>
                  <div className="pt-8 border-t border-slate-800">
                    <p className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-widest">Efficiency Goal</p>
                    <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full w-[85%]" />
                    </div>
                    <p className="text-right text-[10px] font-black text-indigo-400 mt-2">85% Quarterly Goal</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <button onClick={() => setView('cards')} className="flex items-center gap-2 text-xs font-black text-gray-500 hover:text-indigo-600 uppercase tracking-widest"><ArrowLeft className="h-4 w-4" /> Dashboard</button>
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" placeholder="Search by client, worker, or email..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none shadow-sm"
              />
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Worker</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Client</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact</th>
                  {(statusFilter === 'converted' || statusFilter === 'follow_up') && <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</th>}
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  {statusFilter === 'converted' && <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Budget (₹)</th>}
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredVisits.map((visit) => (
                  <tr key={visit.id} onClick={() => handleRowClick(visit)} className="hover:bg-indigo-50/40 transition-colors cursor-pointer group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xs uppercase">{(visit.worker_name || '??').substring(0, 2)}</div>
                        <span className="text-sm font-bold text-gray-800">{visit.worker_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-black text-gray-900 text-sm">{visit.client_name}</td>
                    <td className="px-6 py-5"><span className="text-[10px] font-black text-gray-500 uppercase bg-gray-100 px-2.5 py-1 rounded-lg">{visit.client_type}</span></td>
                    <td className="px-6 py-5 text-xs font-bold text-gray-600">{visit.client_phone || '-'}</td>
                    {(statusFilter === 'converted' || statusFilter === 'follow_up') && (
                      <td className="px-6 py-5 text-xs font-bold text-gray-600 truncate max-w-[200px]" title={visit.client_email || ''}>
                        {visit.client_email || '-'}
                      </td>
                    )}
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <span className={`w-fit px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${
                          visit.status === 'converted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          visit.status === 'follow_up' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-red-50 text-red-600 border-red-100'
                        }`}>{visit.status.replace('_', ' ')}</span>
                        <span className="text-[9px] font-bold text-gray-600 italic">
                          {new Date(visit.created_at!).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    {statusFilter === 'converted' && (
                      <td className="px-6 py-5">
                        <span className="text-sm font-black text-emerald-600">
                          {visit.budget > 0 ? `₹${visit.budget.toLocaleString()}` : '—'}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-5">
                      <div className="flex justify-center gap-3">
                        <button onClick={(e) => { e.stopPropagation(); if (visit.latitude) setShowMap({lat: visit.latitude, lng: visit.longitude!}); }} disabled={!visit.latitude} className="p-3 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="Show Location"><MapPin className="h-4 w-4" /></button>
                        <button onClick={(e) => handleEditClick(e, visit)} className="p-3 rounded-2xl bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-all shadow-sm" title="Edit Visit"><Edit3 className="h-4 w-4" /></button>
                        <button className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="View Details"><Eye className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS */}
      {selectedVisit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-white rounded-3xl shadow-sm"><Building2 className="h-8 w-8 text-indigo-600" /></div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900">{selectedVisit.client_name}</h3>
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{selectedVisit.client_type}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={(e) => { setSelectedVisit(null); handleEditClick(e as any, selectedVisit); }}
                  className="flex items-center gap-2 px-6 py-3 bg-amber-50 text-amber-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-100 transition-all"
                >
                  <Edit3 className="h-4 w-4" /> Edit Record
                </button>
                <button onClick={() => setSelectedVisit(null)} className="p-4 hover:bg-white rounded-2xl transition-all"><X className="h-6 w-6 text-gray-400" /></button>
              </div>
            </div>
            <div className="flex-grow overflow-y-auto p-12 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                <div className="space-y-12">
                  <div className="grid grid-cols-2 gap-10">
                    <InfoBlock label="Field Lead" value={selectedVisit.worker_name} icon={<User className="h-4 w-4" />} />
                    <InfoBlock label="Client Contact" value={selectedVisit.client_phone || '-'} icon={<Smartphone className="h-4 w-4" />} />
                    <InfoBlock label="Client Email" value={selectedVisit.client_email || '-'} icon={<Mail className="h-4 w-4" />} />
                    <InfoBlock label="Budget" value={selectedVisit.budget > 0 ? `₹${selectedVisit.budget.toLocaleString()}` : '-'} icon={<IndianRupee className="h-4 w-4" />} />
                    <InfoBlock label="Initial Log" value={new Date(selectedVisit.created_at!).toLocaleString()} icon={<Clock className="h-4 w-4" />} />
                  </div>
                  <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Requirements</span>
                    <p className="text-sm font-medium text-gray-600 italic leading-relaxed">"{selectedVisit.requirements || 'No notes.'}"</p>
                  </div>
                  {selectedVisit.photo_url && <img src={selectedVisit.photo_url} className="w-full h-auto rounded-[3rem] shadow-xl" alt="Proof" />}
                  
                  {/* Personnel Profile Block */}
                  <div className="pt-8 border-t border-gray-100">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-6">Field Worker Profile</h4>
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white flex items-center justify-between shadow-2xl shadow-gray-200">
                       <div className="flex items-center gap-5">
                         <div className="h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center text-indigo-400">
                           <UserCircle className="h-8 w-8" />
                         </div>
                         <div>
                           <p className="text-lg font-black">{selectedVisit.worker_name}</p>
                           <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Active Personnel</p>
                         </div>
                       </div>
                       <div className="text-right">
                         <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Worker Personal Mobile</p>
                         <p className="text-sm font-black text-indigo-400">{selectedVisit.worker_phone || 'Not Logged'}</p>
                       </div>
                    </div>
                  </div>
                </div>
                
                <div className="border-l pl-12 space-y-10">
                  <h4 className="text-sm font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2"><History className="h-4 w-4" /> Activity Log</h4>
                  <div className="relative space-y-12">
                    <div className="absolute left-[13px] top-2 bottom-2 w-[2px] bg-indigo-50" />
                    {loadingActivities ? <div className="text-center py-10"><Loader2 className="animate-spin h-6 w-6 mx-auto text-indigo-600" /></div> : activities.map(act => (
                      <div key={act.id} className="relative pl-12">
                        <div className="absolute left-0 top-1.5 h-7 w-7 rounded-full bg-white border-4 border-indigo-500 z-10" />
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-gray-600">{new Date(act.created_at).toLocaleString()}</p>
                          <p className="text-sm font-bold text-gray-700">{act.note}</p>
                          <span className="text-[9px] font-black text-indigo-400 uppercase">Actor: {act.performed_by}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMap && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b flex justify-between items-center bg-gray-50/50 px-12">
              <span className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-3"><MapPin className="h-5 w-5 text-blue-500" /> Geo-Verification</span>
              <button onClick={() => setShowMap(null)} className="p-4 hover:bg-gray-100 rounded-2xl"><X className="h-6 w-6 text-gray-400" /></button>
            </div>
            <div className="h-[600px] w-full"><InteractiveMap lat={showMap.lat} lng={showMap.lng} /></div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- HELPER COMPONENTS ---

const StatusCard: React.FC<{ title: string, count: number, subValue?: string, icon: React.ReactNode, color: string, onClick: () => void }> = ({ title, count, subValue, icon, color, onClick }) => {
  const themes: Record<string, string> = {
    amber: "bg-amber-50 text-amber-600 border-amber-100 hover:border-amber-300 shadow-amber-100/30",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 hover:border-emerald-300 shadow-emerald-100/30",
    red: "bg-red-50 text-red-600 border-red-100 hover:border-red-300 shadow-red-100/30",
  };
  return (
    <button onClick={onClick} className={`${themes[color]} p-12 rounded-[3.5rem] border-2 shadow-2xl transition-all hover:-translate-y-2 flex flex-col items-center group active:scale-95`}>
      <div className="mb-8 transform group-hover:rotate-6 transition-transform">{icon}</div>
      <span className="text-5xl font-black mb-1.5 tracking-tighter">{count}</span>
      <span className="text-[11px] font-black uppercase tracking-[0.4em] opacity-50 mb-2">{title}</span>
      {subValue && <span className="text-xs font-black text-emerald-700 bg-emerald-100/50 px-3 py-1 rounded-lg mb-8">{subValue} Total</span>}
      {!subValue && <div className="mb-10" />}
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/60 px-6 py-3 rounded-full border border-current/5">View Logs <ChevronRight className="h-3 w-3" /></div>
    </button>
  );
};

const StatBox: React.FC<{ label: string, value: string | number, icon: React.ReactNode, color: string }> = ({ label, value, icon, color }) => {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100"
  };
  return (
    <div className={`p-8 rounded-[2.5rem] border ${colors[color]} flex flex-col items-center gap-4`}>
      <div className="p-3 bg-white rounded-2xl shadow-sm">{icon}</div>
      <div className="text-center">
        <p className="text-2xl font-black">{value}</p>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
      </div>
    </div>
  );
};

const InfoBlock: React.FC<{ label: string, value: string, icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2.5 text-gray-400">{icon}<span className="text-[10px] font-black uppercase tracking-widest">{label}</span></div>
    <p className="text-sm font-black text-gray-900 truncate">{value}</p>
  </div>
);

const ProfileInfoItem: React.FC<{ icon: React.ReactNode, label: string, value: string }> = ({ icon, label, value }) => (
  <div className="flex items-start gap-4">
    <div className="p-3 bg-slate-800 rounded-2xl text-slate-400">{icon}</div>
    <div>
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{label}</p>
      <p className="text-sm font-bold text-slate-200">{value}</p>
    </div>
  </div>
);

const InteractiveMap: React.FC<{ lat: number, lng: number }> = ({ lat, lng }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, { zoomControl: false }).setView([lat, lng], 17);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance.current);
      L.marker([lat, lng]).addTo(mapInstance.current);
    }
    return () => { mapInstance.current?.remove(); mapInstance.current = null; };
  }, [lat, lng]);
  return <div ref={mapRef} className="h-full w-full" />;
};

export default AdminDashboard;
