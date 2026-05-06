import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Pill, Search, Download, PackageOpen, Filter, Box, Heart } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api';

const Inventory = () => {
  const [medicines, setMedicines] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE}/medicines`).then(res => {
      setMedicines(res.data);
      setLoading(false);
    });
  }, []);

  const filteredMeds = medicines.filter(m => {
    const searchTerms = searchTerm.toLowerCase().trim().split(/\s+/);
    if (searchTerms.length === 0) return true;
    
    const searchableText = `${m.name} ${m.formulation || ''} ${m.category || ''} ${m.uqid}`.toLowerCase();
    return searchTerms.every(term => searchableText.includes(term));
  });

  const handleExport = () => {
    window.location.href = 'http://localhost:8000/export';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Heart size={14} className="text-teal-500" />
            <p className="text-teal-600 text-[10px] font-extrabold uppercase tracking-[0.25em]">Pharmacy Management</p>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-teal-50 rounded-xl border border-teal-200">
              <Box className="text-teal-600" size={24} strokeWidth={2.5} />
            </div>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight">Stock Inventory</h3>
          </div>
          <p className="text-slate-400 text-sm font-bold ml-[52px]">Central Pharmacy Repository</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-3 bg-white hover:bg-slate-50 text-slate-700 px-8 py-4 rounded-xl border border-slate-200 hover:border-teal-200 transition-all shadow-sm font-bold text-sm"
        >
          <Download size={20} className="text-teal-500" strokeWidth={2.5} />
          Download Stock Audit (.CSV)
        </button>
      </div>

      <div className="glass-panel-light overflow-hidden relative">
        {/* Accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-teal-400 to-emerald-400" />
        
        {/* Search */}
        <div className="p-8 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} strokeWidth={2.5} />
            <input
              type="text"
              placeholder="Search by name, formulation, category or UQID (e.g. 'Tablet 500')..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-14 pr-12 py-4 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 outline-none transition-all font-bold"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <div className="bg-slate-100 rounded-full p-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </div>
              </button>
            )}
          </div>
          <button className="p-4 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-teal-600 hover:border-teal-200 transition-all">
            <Filter size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500">
                <th className="px-8 py-5">Identity (UQID)</th>
                <th className="px-8 py-5">Medication Description</th>
                <th className="px-8 py-5">Classification</th>
                <th className="px-8 py-5 text-right">Available Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-400">
                      <div className="h-8 w-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
                      <span className="font-extrabold uppercase tracking-widest text-xs">Syncing Repository...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredMeds.length > 0 ? (
                filteredMeds.map((med) => (
                  <tr key={med.uqid} className="hover:bg-teal-50/40 transition-all group">
                    <td className="px-8 py-6">
                       <span className="font-data text-sm text-teal-600 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200">
                        #{med.uqid}
                       </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 group-hover:text-teal-700 transition-colors">{med.name}</span>
                        <span className="text-xs text-slate-400 font-semibold mt-0.5">{med.formulation || 'No formulation specified'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200">
                        {med.category}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex flex-col items-end">
                        <span className={`text-xl font-black font-data ${med.stock > 10 ? 'text-slate-800' : 'text-red-500'}`}>
                          {med.stock}
                        </span>
                        <div className={`h-1.5 w-14 rounded-full mt-2 ${med.stock > 10 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                           <div 
                            className={`h-full rounded-full transition-all ${med.stock > 10 ? 'bg-emerald-500' : 'bg-red-500'}`} 
                            style={{ width: `${Math.min(med.stock, 100)}%` }}
                          />
                        </div>
                       </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-4 animate-fade-in">
                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 mb-2">
                        <PackageOpen size={60} strokeWidth={1} className="text-slate-300" />
                      </div>
                      <h4 className="text-xl font-extrabold text-slate-400">Inventory Empty</h4>
                      <p className="text-sm max-w-xs mx-auto font-bold text-slate-400">The search query did not match any medicinal records in the central repository.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Inventory;

