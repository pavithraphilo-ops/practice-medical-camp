/**
 * ScanVitalsModal Component
 * Main modal that orchestrates the OCR scanning workflow
 */
import React, { useState, useCallback } from 'react';
import { Camera, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import CameraCapture from './CameraCapture';
import DataReviewPanel from './DataReviewPanel';
import { useOCR, OCR_STATUS } from '../../hooks/useOCR';

// Workflow states
const WORKFLOW_STATE = {
  CAPTURE: 'capture',
  PROCESSING: 'processing',
  REVIEW: 'review',
  ERROR: 'error',
};

const ScanVitalsModal = ({ isOpen, onClose, onApplyData }) => {
  const [workflowState, setWorkflowState] = useState(WORKFLOW_STATE.CAPTURE);
  const [capturedImage, setCapturedImage] = useState(null);
  
  const {
    status,
    progress,
    progressMessage,
    error,
    rawText,
    parsedData,
    isProcessing,
    processImage,
    reset,
  } = useOCR();
  
  // Handle image capture
  const handleCapture = useCallback(async (imageBase64) => {
    setCapturedImage(imageBase64);
    setWorkflowState(WORKFLOW_STATE.PROCESSING);
    
    const result = await processImage(imageBase64);
    
    if (result) {
      setWorkflowState(WORKFLOW_STATE.REVIEW);
    } else {
      setWorkflowState(WORKFLOW_STATE.ERROR);
    }
  }, [processImage]);
  
  // Handle retry
  const handleRetry = useCallback(() => {
    reset();
    setCapturedImage(null);
    setWorkflowState(WORKFLOW_STATE.CAPTURE);
  }, [reset]);
  
  // Handle confirm and apply data
  const handleApplyData = useCallback((formData) => {
    onApplyData(formData);
    handleClose();
  }, [onApplyData]);
  
  // Handle close
  const handleClose = useCallback(() => {
    reset();
    setCapturedImage(null);
    setWorkflowState(WORKFLOW_STATE.CAPTURE);
    onClose();
  }, [reset, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <>
      {/* Camera Capture View */}
      {workflowState === WORKFLOW_STATE.CAPTURE && (
        <CameraCapture
          onCapture={handleCapture}
          onClose={handleClose}
        />
      )}
      
      {/* Processing View */}
      {workflowState === WORKFLOW_STATE.PROCESSING && (
        <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col items-center justify-center p-8">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '32px 32px'
            }} />
          </div>
          
          {/* Content */}
          <div className="relative z-10 text-center max-w-sm w-full">
            {/* Animated icon */}
            <div className="mb-8 relative">
              <div className="w-24 h-24 mx-auto rounded-full bg-teal-500/20 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-teal-500/30 flex items-center justify-center animate-pulse">
                  <Loader2 size={32} className="text-teal-400 animate-spin" />
                </div>
              </div>
              
              {/* Orbiting dots */}
              <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-teal-400 rounded-full" />
              </div>
              <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s', animationDirection: 'reverse' }}>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mb-6">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-slate-500 font-bold">{progressMessage}</span>
                <span className="text-xs text-teal-400 font-black">{Math.round(progress)}%</span>
              </div>
            </div>
            
            {/* Status message */}
            <p className="text-white font-bold text-lg mb-2">Processing Image</p>
            <p className="text-slate-400 text-sm">
              {status === OCR_STATUS.PREPROCESSING && 'Enhancing image for better recognition...'}
              {status === OCR_STATUS.LOADING && 'Loading OCR engine...'}
              {status === OCR_STATUS.RECOGNIZING && 'Reading text from image...'}
              {status === OCR_STATUS.PARSING && 'Extracting vital signs data...'}
            </p>
            
            {/* Cancel button */}
            <button
              onClick={handleClose}
              className="mt-8 px-6 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
          
          {/* Thumbnail preview */}
          {capturedImage && (
            <div className="absolute bottom-8 left-8 w-20 h-20 rounded-xl overflow-hidden border-2 border-slate-700 shadow-lg opacity-50">
              <img src={capturedImage} alt="" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      )}
      
      {/* Error View */}
      {workflowState === WORKFLOW_STATE.ERROR && (
        <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col items-center justify-center p-8">
          <div className="text-center max-w-sm">
            {/* Error icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-rose-500/20 flex items-center justify-center">
              <AlertCircle size={40} className="text-rose-400" />
            </div>
            
            <h3 className="text-xl font-black text-white mb-2">Processing Failed</h3>
            <p className="text-slate-400 mb-8">
              {error || 'Unable to extract data from the image. Please try again with better lighting or a clearer photo.'}
            </p>
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleClose}
                className="px-6 py-3 text-sm font-bold text-slate-400 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Review View */}
      {workflowState === WORKFLOW_STATE.REVIEW && parsedData && (
        <DataReviewPanel
          parsedData={parsedData}
          rawText={rawText}
          capturedImage={capturedImage}
          onConfirm={handleApplyData}
          onCancel={handleClose}
          onRetry={handleRetry}
        />
      )}
    </>
  );
};

export default ScanVitalsModal;
