import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Send, CheckCircle2, User, Landmark, Pill as PillIcon, Heart } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api';

const Dashboard = () => {
  const [camps, setCamps] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [selectedCamp, setSelectedCamp] = useState('');
  const [issues, setIssues] = useState([{ med_id: '', qty: 1, name: '', stock: 0 }]);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE}/camps`).then(res => setCamps(res.data));
    axios.get(`${API_BASE}/medicines`).then(res => setMedicines(res.data));
  }, []);

  const addRow = () => {
    setIssues([...issues, { med_id: '', qty: 1, name: '', stock: 0 }]);
  };

  const removeRow = (index) => {
    if (issues.length > 1) {
      setIssues(issues.filter((_, i) => i !== index));
    }
  };

  const updateRow = (index, field, value) => {
    const newIssues = [...issues];
    newIssues[index][field] = value;

    if (field === 'med_id') {
      const med = medicines.find(m => m.uqid === parseInt(value));
      if (med) {
        newIssues[index].name = med.name;
        newIssues[index].stock = med.stock;
      } else {
        newIssues[index].name = '';
        newIssues[index].stock = 0;
      }
    }
    setIssues(newIssues);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/issue`, {
        patient_id: patientId,
        medical_camp: selectedCamp,
        issues: issues.filter(i => i.med_id && i.qty > 0)
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setIssues([{ med_id: '', qty: 1, name: '', stock: 0 }]);
      setPatientId('');
    } catch (err) {
      alert('Error submitting data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-4 space-y-6">
       <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Heart size={14} className="text-teal-500" />
            <p className="text-teal-600 text-[10px] font-extrabold uppercase tracking-[0.25em]">Clinical Operations</p>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-teal-50 rounded-xl border border-teal-200">
              <PillIcon className="text-teal-600" size={24} strokeWidth={2.5} />
            </div>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight">Medicine Dispatch</h3>
          </div>
          <p className="text-slate-400 text-sm font-bold ml-[52px]">Digital Prescription Fulfillment</p>
        </div>
        {success && (
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-5 py-3 rounded-xl border border-emerald-200 shadow-sm animate-bounce">
            <CheckCircle2 size={18} strokeWidth={3} />
            <span className="text-xs font-black uppercase tracking-widest">Transaction Verified</span>
          </div>
        )}
      </div>

      <div className="glass-panel-light p-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-teal-400 to-emerald-400" />

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                <User size={14} className="text-teal-500" /> Patient Identification
              </label>
              <input
                type="number"
                required
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-5 py-4 text-xl font-black text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 outline-none transition-all"
                placeholder="Enter Patient ID..."
                value={patientId}
                onChange={e => setPatientId(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                <Landmark size={14} className="text-teal-500" /> Session / Medical Camp
              </label>
              <select
                required
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 outline-none transition-all appearance-none cursor-pointer"
                value={selectedCamp}
                onChange={e => setSelectedCamp(e.target.value)}
              >
                <option value="">Choose a medical camp session...</option>
                {camps.map(camp => (
                  <option key={camp.id} value={camp.id}>
                    {camp.venue} • Camp {camp.number} ({camp.date})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <PillIcon size={14} className="text-teal-500" /> Medication List
              </h4>
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-600 rounded-xl transition-all border border-teal-200 text-[10px] font-black uppercase tracking-widest"
              >
                <Plus size={14} strokeWidth={3} /> Add Medication
              </button>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-auto pr-2 custom-scrollbar">
              {issues.map((row, index) => (
                <div key={index} className="grid grid-cols-12 gap-5 items-center p-5 rounded-2xl bg-slate-50/30 border border-slate-100 transition-all hover:border-teal-100 group">
                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder="UQID"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 font-data font-bold focus:border-teal-500 outline-none text-sm shadow-sm"
                      value={row.med_id}
                      onChange={e => updateRow(index, 'med_id', e.target.value)}
                    />
                  </div>
                  <div className="col-span-6">
                    <div className="px-5 py-3.5 bg-white rounded-xl border border-slate-100 text-slate-400 text-sm font-bold min-h-[3.25rem] flex items-center justify-between shadow-sm">
                      {row.name ? (
                        <>
                          <span className="text-slate-800 font-black">{row.name}</span>
                          <span className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg border ${row.stock > 10 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                            Stock: {row.stock}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-300 italic font-medium">Auto-populating med details...</span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Qty"
                      className={`w-full bg-white border rounded-xl px-4 py-3.5 text-slate-800 font-black text-center focus:outline-none text-sm transition-all shadow-sm ${
                        row.qty > row.stock 
                          ? 'border-rose-500 ring-2 ring-rose-500/10' 
                          : 'border-slate-200 focus:border-teal-500'
                      }`}
                      value={row.qty}
                      onChange={e => updateRow(index, 'qty', parseInt(e.target.value) || 0)}
                    />
                    {row.qty > row.stock && (
                      <p className="text-[9px] text-rose-600 font-black uppercase tracking-tighter mt-1.5 text-center">Over Stock Limit</p>
                    )}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className={`p-2.5 rounded-xl transition-all ${issues.length > 1 ? 'text-slate-300 hover:text-rose-500 hover:bg-rose-50' : 'text-slate-200 cursor-not-allowed'}`}
                      disabled={issues.length === 1}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full relative overflow-hidden bg-teal-600 hover:bg-teal-700 text-white h-16 rounded-xl transition-all shadow-lg shadow-teal-200 group active:scale-[0.98]"
            >
              <div className="relative flex items-center justify-center gap-3">
                <Send size={20} strokeWidth={2.5} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                <span className="text-sm font-black uppercase tracking-[0.2em]">
                  {loading ? 'Processing System Transaction...' : 'Finalize Dispatch'}
                </span>
              </div>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Dashboard;

