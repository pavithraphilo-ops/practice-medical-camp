/**
 * DataReviewPanel Component
 * Displays extracted vitals data for review before auto-filling
 */
import React, { useState, useCallback } from 'react';
import { 
  Check, X, AlertTriangle, Edit3, Eye, EyeOff,
  User, Weight, Ruler, HeartPulse, Activity, Droplets, 
  Thermometer, Hash, Stethoscope
} from 'lucide-react';
import { getConfidenceLevel } from '../../utils/vitalsParser';

// Field configuration with icons and labels
const FIELD_CONFIG = {
  patientId: { label: 'Patient ID', icon: User, color: 'blue' },
  eNo: { label: 'E.No', icon: Hash, color: 'cyan' },
  weight: { label: 'Weight', icon: Weight, color: 'amber', unit: 'kg' },
  height: { label: 'Height', icon: Ruler, color: 'orange', unit: 'cm' },
  bloodPressure: { label: 'Blood Pressure', icon: HeartPulse, color: 'rose', unit: 'mmHg' },
  pulse: { label: 'Pulse', icon: Activity, color: 'pink', unit: 'BPM' },
  rbs: { label: 'RBS', icon: Droplets, color: 'amber', unit: 'mg/dL' },
  haemoglobin: { label: 'Haemoglobin', icon: Thermometer, color: 'rose', unit: 'g/dL' },
  drId: { label: 'Doctor ID', icon: Hash, color: 'indigo' },
  drName: { label: 'Doctor Name', icon: Stethoscope, color: 'blue' },
};

// Confidence badge component
const ConfidenceBadge = ({ confidence }) => {
  const { level, label, color } = getConfidenceLevel(confidence);
  
  const colorClasses = {
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    rose: 'bg-rose-100 text-rose-700 border-rose-200',
  };
  
  const iconClasses = {
    emerald: 'text-emerald-500',
    amber: 'text-amber-500',
    rose: 'text-rose-500',
  };
  
  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black uppercase ${colorClasses[color]}`}>
      {level === 'high' && <Check size={10} className={iconClasses[color]} />}
      {level === 'medium' && <AlertTriangle size={10} className={iconClasses[color]} />}
      {level === 'low' && <X size={10} className={iconClasses[color]} />}
      {label}
    </div>
  );
};

// Editable field row
const FieldRow = ({ fieldKey, fieldData, config, onEdit, isEditing, onToggleEdit }) => {
  const [editValue, setEditValue] = useState(fieldData?.value || '');
  const Icon = config.icon;
  const hasValue = fieldData?.value !== null && fieldData?.value !== undefined;
  
  const handleSave = () => {
    onEdit(fieldKey, editValue);
    onToggleEdit(null);
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onToggleEdit(null);
  };
  
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
      hasValue 
        ? 'bg-white border border-slate-200' 
        : 'bg-slate-50 border border-dashed border-slate-300'
    }`}>
      {/* Icon */}
      <div className={`p-2 rounded-lg bg-${config.color}-50 flex-shrink-0`}>
        <Icon size={16} className={`text-${config.color}-500`} />
      </div>
      
      {/* Label */}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">
          {config.label}
        </div>
        
        {isEditing === fieldKey ? (
          // Edit mode
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 px-2 py-1 text-sm font-bold text-slate-800 border border-teal-300 rounded-lg focus:ring-2 focus:ring-teal-500/30 outline-none"
            />
            <button
              onClick={handleSave}
              className="p-1.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => onToggleEdit(null)}
              className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          // Display mode
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${hasValue ? 'text-slate-800' : 'text-slate-400 italic'}`}>
              {hasValue ? fieldData.value : 'Not detected'}
              {hasValue && config.unit && (
                <span className="text-slate-400 ml-1 font-medium">{config.unit}</span>
              )}
            </span>
          </div>
        )}
      </div>
      
      {/* Confidence & Edit */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {hasValue && <ConfidenceBadge confidence={fieldData.confidence} />}
        <button
          onClick={() => {
            setEditValue(fieldData?.value || '');
            onToggleEdit(fieldKey);
          }}
          className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
          title="Edit value"
        >
          <Edit3 size={14} />
        </button>
      </div>
    </div>
  );
};

const DataReviewPanel = ({ 
  parsedData, 
  rawText, 
  capturedImage,
  onConfirm, 
  onCancel, 
  onRetry 
}) => {
  const [editedData, setEditedData] = useState(parsedData?.data || {});
  const [editingField, setEditingField] = useState(null);
  const [showRawText, setShowRawText] = useState(false);
  const [showImage, setShowImage] = useState(false);
  
  const handleEdit = useCallback((fieldKey, newValue) => {
    setEditedData(prev => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        value: newValue,
        confidence: newValue ? 1 : 0, // Manual edit = full confidence
        manuallyEdited: true,
      }
    }));
  }, []);
  
  const handleConfirm = useCallback(() => {
    // Convert to simple key-value object for form population
    const formData = {};
    for (const [key, data] of Object.entries(editedData)) {
      if (data?.value !== null && data?.value !== undefined) {
        formData[key] = data.value;
      }
    }
    onConfirm(formData);
  }, [editedData, onConfirm]);
  
  // Calculate stats
  const fieldsDetected = Object.values(editedData).filter(f => f?.value).length;
  const totalFields = Object.keys(FIELD_CONFIG).length;
  const overallConfidence = parsedData?.overallConfidence || 0;
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-slate-800">Review Extracted Data</h3>
            <button
              onClick={onCancel}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Stats bar */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 rounded-full">
              <span className="text-[10px] font-black text-teal-600 uppercase tracking-wider">
                {fieldsDetected}/{totalFields} Fields
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                {Math.round(overallConfidence * 100)}% Confidence
              </span>
            </div>
          </div>
        </div>
        
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {Object.entries(FIELD_CONFIG).map(([fieldKey, config]) => (
            <FieldRow
              key={fieldKey}
              fieldKey={fieldKey}
              fieldData={editedData[fieldKey]}
              config={config}
              onEdit={handleEdit}
              isEditing={editingField}
              onToggleEdit={setEditingField}
            />
          ))}
          
          {/* Toggle buttons for raw data */}
          <div className="flex gap-2 pt-4">
            <button
              onClick={() => setShowRawText(!showRawText)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              {showRawText ? <EyeOff size={14} /> : <Eye size={14} />}
              {showRawText ? 'Hide' : 'Show'} Raw Text
            </button>
            {capturedImage && (
              <button
                onClick={() => setShowImage(!showImage)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                {showImage ? <EyeOff size={14} /> : <Eye size={14} />}
                {showImage ? 'Hide' : 'Show'} Image
              </button>
            )}
          </div>
          
          {/* Raw text display */}
          {showRawText && rawText && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                OCR Raw Output
              </p>
              <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono overflow-x-auto">
                {rawText}
              </pre>
            </div>
          )}
          
          {/* Image preview */}
          {showImage && capturedImage && (
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <img 
                src={capturedImage} 
                alt="Scanned vitals sheet" 
                className="w-full h-auto"
              />
            </div>
          )}
        </div>
        
        {/* Footer actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50">
          <div className="flex gap-3">
            <button
              onClick={onRetry}
              className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Scan Again
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-3 text-sm font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors shadow-lg shadow-teal-200"
            >
              Apply to Form
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataReviewPanel;
