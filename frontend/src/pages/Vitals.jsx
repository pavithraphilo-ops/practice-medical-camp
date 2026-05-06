import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Save, CheckCircle2, User, Landmark, HeartPulse, Droplets, Thermometer, Heart } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api';

const Vitals = () => {
  const [camps, setCamps] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [selectedCamp, setSelectedCamp] = useState('');
  const [bloodPressure, setBloodPressure] = useState('NA');
  const [glucose, setGlucose] = useState('NA');
  const [haemoglobin, setHaemoglobin] = useState('NA');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE}/camps`).then(res => setCamps(res.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/save_vitals`, {
        patient_id: patientId,
        medical_camp: selectedCamp,
        blood_pressure: bloodPressure,
        glucose: glucose,
        haemoglobin: haemoglobin
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setPatientId('');
      setBloodPressure('NA');
      setGlucose('NA');
      setHaemoglobin('NA');
    } catch (err) {
      alert('Error saving vitals');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Heart size={14} className="text-teal-500" />
            <p className="text-teal-600 text-[10px] font-extrabold uppercase tracking-[0.25em]">Clinical Intake</p>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-teal-50 rounded-xl border border-teal-200">
              <Activity className="text-teal-600" size={24} strokeWidth={2.5} />
            </div>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight">Vitals Recording</h3>
          </div>
          <p className="text-slate-400 text-sm font-bold ml-[52px]">Diagnostic Data Acquisition</p>
        </div>
        {success && (
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-5 py-3 rounded-xl border border-emerald-200 shadow-sm animate-bounce">
            <CheckCircle2 size={18} strokeWidth={3} />
            <span className="text-xs font-black uppercase tracking-widest">Entry Logged</span>
          </div>
        )}
      </div>

      <div className="glass-panel-light p-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-teal-400 to-emerald-400" />

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Identity Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                <User size={12} className="text-teal-500" /> Patient Identification
              </label>
              <input
                type="number"
                required
                className="w-full bg-white border border-slate-200 rounded-xl px-5 py-4 text-xl font-black text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 outline-none transition-all shadow-sm"
                placeholder="ID #"
                value={patientId}
                onChange={e => setPatientId(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                <Landmark size={12} className="text-teal-500" /> Camp Session
              </label>
              <select
                required
                className="w-full bg-white border border-slate-200 rounded-xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 outline-none transition-all appearance-none cursor-pointer shadow-sm"
                value={selectedCamp}
                onChange={e => setSelectedCamp(e.target.value)}
              >
                <option value="">Select Session...</option>
                {camps.map(camp => (
                  <option key={camp.id} value={camp.id}>{camp.venue} • {camp.number}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Vitals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel-light p-6 space-y-4 hover:border-teal-500/30 transition-all group shadow-sm bg-white/40">
              <label className="flex items-center gap-2 text-[10px] font-black text-teal-600 uppercase tracking-widest">
                <HeartPulse size={14} strokeWidth={2.5} /> Blood Pressure
              </label>
              <input
                type="text"
                className="w-full bg-transparent border-b-2 border-slate-100 py-2 text-2xl font-black text-slate-800 focus:border-teal-500 outline-none transition-colors"
                value={bloodPressure}
                onChange={e => setBloodPressure(e.target.value)}
              />
              <p className="text-[10px] text-slate-400 font-bold uppercase">Standard: 120/80</p>
            </div>

            <div className="glass-panel-light p-6 space-y-4 hover:border-amber-500/30 transition-all group shadow-sm bg-white/40">
              <label className="flex items-center gap-2 text-[10px] font-black text-amber-600 uppercase tracking-widest">
                <Droplets size={14} strokeWidth={2.5} /> Glucose (Sugar)
              </label>
              <input
                type="text"
                className="w-full bg-transparent border-b-2 border-slate-100 py-2 text-2xl font-black text-slate-800 focus:border-amber-500 outline-none transition-colors"
                value={glucose}
                onChange={e => setGlucose(e.target.value)}
              />
              <p className="text-[10px] text-slate-400 font-bold uppercase">Standard: 70-100</p>
            </div>

            <div className="glass-panel-light p-6 space-y-4 hover:border-rose-500/30 transition-all group shadow-sm bg-white/40">
              <label className="flex items-center gap-2 text-[10px] font-black text-rose-600 uppercase tracking-widest">
                <Thermometer size={14} strokeWidth={2.5} /> Haemoglobin
              </label>
              <input
                type="text"
                className="w-full bg-transparent border-b-2 border-slate-100 py-2 text-2xl font-black text-slate-800 focus:border-rose-500 outline-none transition-colors"
                value={haemoglobin}
                onChange={e => setHaemoglobin(e.target.value)}
              />
              <p className="text-[10px] text-slate-400 font-bold uppercase">Standard: 12-16</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full relative overflow-hidden bg-teal-600 hover:bg-teal-700 text-white h-16 rounded-xl transition-all shadow-lg shadow-teal-100 group active:scale-[0.98]"
          >
            <div className="relative flex items-center justify-center gap-3">
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={20} strokeWidth={2.5} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  <span className="text-sm font-black uppercase tracking-[0.2em]">Commit Vital Record</span>
                </>
              )}
            </div>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Vitals;

