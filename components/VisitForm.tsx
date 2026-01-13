
import React, { useState, useEffect } from 'react';
import { supabase, BUCKET_NAME } from '../supabase';
import { ClientType, VisitStatus, LocationState, FieldVisit } from '../types';
import { MapPin, Camera, Loader2, AlertCircle, CheckCircle2, Radio, IndianRupee, Building2, User } from 'lucide-react';

interface VisitFormProps {
  initialData?: FieldVisit;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const VisitForm: React.FC<VisitFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);
  const [phoneErrors, setPhoneErrors] = useState<{ worker_phone?: string; client_phone?: string }>({});
  const [location, setLocation] = useState<LocationState>({
    latitude: initialData?.latitude || null,
    longitude: initialData?.longitude || null,
    loading: false,
    error: null,
  });
  
  const [photo, setPhoto] = useState<File | null>(null);
  const [formData, setFormData] = useState<Omit<FieldVisit, 'latitude' | 'longitude' | 'photo_url'>>({
    worker_name: initialData?.worker_name || '',
    worker_phone: initialData?.worker_phone || '',
    client_name: initialData?.client_name || '',
    client_type: initialData?.client_type || '',
    client_phone: initialData?.client_phone || '',
    client_email: initialData?.client_email || '',
    landmark: initialData?.landmark || '',
    requirements: initialData?.requirements || '',
    budget: initialData?.budget || 0,
    status: initialData?.status || 'follow_up',
    follow_up_at: initialData?.follow_up_at 
      ? new Date(initialData.follow_up_at).toISOString().slice(0, 16) 
      : new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    rejection_reason: initialData?.rejection_reason || '',
  });

  const captureLocation = () => {
    setLocation(prev => ({ ...prev, loading: true, error: null }));
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, loading: false, error: 'Geolocation not supported' }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          loading: false,
          error: null,
        });
      },
      (err) => {
        setLocation(prev => ({ ...prev, loading: false, error: 'Permission denied' }));
      }
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'worker_phone' || name === 'client_phone') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, [name]: numericValue }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: name === 'budget' ? (parseFloat(value) || 0) : value }));
  };

  const validatePhones = (): boolean => {
    const errors: { worker_phone?: string; client_phone?: string } = {};
    let isValid = true;
    
    if (formData.worker_phone && formData.worker_phone.length !== 10) { 
      errors.worker_phone = '10 digits required'; 
      isValid = false; 
    }
    if (formData.client_phone && formData.client_phone.length !== 10) { 
      errors.client_phone = '10 digits required'; 
      isValid = false; 
    }
    
    setPhoneErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!validatePhones()) return;
    setLoading(true);

    try {
      let photo_url = initialData?.photo_url || null;
      if (photo) {
        const fileExt = photo.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `visits/${fileName}`;
        const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(filePath, photo);
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
          photo_url = publicUrlData.publicUrl;
        }
      }

      const visitData: Partial<FieldVisit> = {
        ...formData,
        address: '', 
        follow_up_at: formData.status === 'follow_up' ? formData.follow_up_at : null,
        budget: formData.status === 'converted' ? formData.budget : 0,
        rejection_reason: formData.status === 'rejected' ? formData.rejection_reason : null,
        latitude: location.latitude,
        longitude: location.longitude,
        photo_url,
      };

      if (initialData?.id) {
        // UPDATE Existing
        const { error } = await supabase
          .from('visits')
          .update(visitData)
          .eq('id', initialData.id);
        
        if (error) throw error;

        await supabase.from('visit_activities').insert([{
          visit_id: initialData.id,
          action_type: 'updated',
          performed_by: formData.worker_name,
          note: `Visit updated. Status: ${formData.status}`,
          new_value: formData.status,
          field_name: 'status'
        }]);

      } else {
        // CREATE New
        const { data: inserted, error } = await supabase.from('visits').insert([visitData]).select();
        if (error) throw error;

        if (inserted && inserted[0]) {
          await supabase.from('visit_activities').insert([{
            visit_id: inserted[0].id,
            action_type: 'created',
            performed_by: formData.worker_name,
            note: `New visit created with status: ${formData.status}`,
            new_value: formData.status,
            field_name: 'status'
          }]);
        }
      }

      setMsg({ type: 'success', text: initialData ? 'Visit updated successfully!' : 'Visit recorded successfully!' });
      setTimeout(() => onSuccess && onSuccess(), 1500);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const inputBaseClass = "w-full px-4 py-3 border border-gray-200 bg-gray-50 text-gray-900 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400 font-medium";

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8 space-y-10 animate-in slide-in-from-bottom-4 duration-500">
      {msg && (
        <div className={`p-5 rounded-2xl flex items-start gap-3 border ${
          msg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-red-50 text-red-800 border-red-100'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : <AlertCircle className="h-6 w-6 text-red-500" />}
          <p className="text-sm font-bold">{msg.text}</p>
        </div>
      )}

      {/* 1. Client Info */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-gray-50 pb-3">
          <div className="bg-emerald-100 p-2 rounded-xl"><Building2 className="h-5 w-5 text-emerald-600" /></div>
          <h2 className="text-lg font-black text-gray-800 tracking-tight">Client Intelligence</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Client / Business Entity</label>
            <input required name="client_name" value={formData.client_name} onChange={handleInputChange} className={inputBaseClass} placeholder="Business Name" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contact Phone (Optional)</label>
            <input name="client_phone" type="tel" value={formData.client_phone || ''} onChange={handleInputChange} className={inputBaseClass} placeholder="10 Digits" />
            {phoneErrors.client_phone && <p className="text-[10px] text-red-500 font-bold ml-1">{phoneErrors.client_phone}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Client Email (Optional)</label>
            <input name="client_email" type="email" value={formData.client_email || ''} onChange={handleInputChange} className={inputBaseClass} placeholder="client@company.com" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Client Type</label>
            <input required name="client_type" value={formData.client_type} onChange={handleInputChange} className={inputBaseClass} placeholder="e.g. School, Corp" />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Landmark</label>
            <input name="landmark" value={formData.landmark} onChange={handleInputChange} className={inputBaseClass} placeholder="Ref point" />
          </div>
        </div>
      </section>

      {/* 2. Visit Logic */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-gray-50 pb-3">
          <div className="bg-amber-100 p-2 rounded-xl"><Radio className="h-5 w-5 text-amber-600" /></div>
          <h2 className="text-lg font-black text-gray-800 tracking-tight">Visit Result</h2>
        </div>
        <div className="space-y-6">
          <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-4 border-2 border-gray-100 rounded-2xl bg-gray-50 font-black text-gray-700 outline-none focus:border-indigo-500 transition-all">
            <option value="follow_up">📅 Follow-up Required</option>
            <option value="converted">💰 Deal Converted</option>
            <option value="rejected">❌ Lead Rejected</option>
          </select>

          {formData.status === 'follow_up' && (
            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 space-y-2">
              <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Next Action Timestamp</label>
              <input type="datetime-local" name="follow_up_at" value={formData.follow_up_at || ''} onChange={handleInputChange} className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 font-bold text-gray-900" />
            </div>
          )}

          {formData.status === 'converted' && (
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-2">
              <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Final Deal Value (Budget)</label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                <input type="number" name="budget" value={formData.budget || ''} onChange={handleInputChange} className="w-full px-4 py-3 pl-10 border border-emerald-200 bg-white text-gray-900 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold" placeholder="0.00" />
              </div>
            </div>
          )}

          {formData.status === 'rejected' && (
             <div className="p-6 bg-red-50 rounded-2xl border border-red-100 space-y-2">
                <label className="text-[10px] font-black text-red-600 uppercase tracking-widest">Reason for Rejection</label>
                <textarea name="rejection_reason" value={formData.rejection_reason || ''} onChange={handleInputChange} className={`${inputBaseClass} min-h-[80px]`} placeholder="Why was the lead rejected?" />
             </div>
          )}
          
          <textarea name="requirements" value={formData.requirements || ''} onChange={handleInputChange} className={`${inputBaseClass} min-h-[100px]`} placeholder="Visit requirements / Observations..." />
        </div>
      </section>

      {/* 3. Personnel Information */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-gray-50 pb-3">
          <div className="bg-indigo-100 p-2 rounded-xl"><User className="h-5 w-5 text-indigo-600" /></div>
          <h2 className="text-lg font-black text-gray-800 tracking-tight">Personnel Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Worker Name</label>
            <input required name="worker_name" value={formData.worker_name} onChange={handleInputChange} className={inputBaseClass} placeholder="Full Name" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Worker Mobile (Optional)</label>
            <input name="worker_phone" type="tel" value={formData.worker_phone || ''} onChange={handleInputChange} className={inputBaseClass} placeholder="10 Digits" />
            {phoneErrors.worker_phone && <p className="text-[10px] text-red-500 font-bold ml-1">{phoneErrors.worker_phone}</p>}
          </div>
        </div>
      </section>

      {/* 4. Location & Photo */}
      <div className="grid grid-cols-2 gap-4">
        <button type="button" onClick={captureLocation} className={`py-8 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2 transition-all ${location.latitude ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-indigo-300'}`}>
          <MapPin className="h-6 w-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">{location.latitude ? 'Location Locked' : 'Pin Geo-Data'}</span>
        </button>
        <label className={`py-8 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${photo || initialData?.photo_url ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-indigo-300'}`}>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
          <Camera className="h-6 w-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">{(photo || initialData?.photo_url) ? 'Photo Proof OK' : 'Capture Proof'}</span>
        </label>
      </div>

      <div className="flex gap-4">
        {initialData && (
          <button type="button" onClick={onCancel} className="flex-1 bg-gray-100 text-gray-600 py-6 rounded-[2rem] font-black text-lg transition-all active:scale-[0.99]">
            Cancel
          </button>
        )}
        <button type="submit" disabled={loading} className="flex-[2] bg-indigo-600 text-white py-6 rounded-[2rem] font-black text-lg shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.99] disabled:opacity-50">
          {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : initialData ? 'Update Record' : 'Finalize Field Log'}
        </button>
      </div>
    </form>
  );
};

export default VisitForm;
