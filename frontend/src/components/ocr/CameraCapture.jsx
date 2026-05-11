/**
 * CameraCapture Component
 * Mobile-optimized camera capture for scanning vitals sheets
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, RotateCcw, Zap, ZapOff, SwitchCamera, X, Upload, Check } from 'lucide-react';

const CameraCapture = ({ onCapture, onClose, onFileUpload }) => {
  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' = rear camera
  const [torch, setTorch] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check for multiple cameras
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then(devices => {
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setHasMultipleCameras(videoDevices.length > 1);
    }).catch(() => {});
  }, []);
  
  // Video constraints optimized for document scanning
  const videoConstraints = {
    facingMode,
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    aspectRatio: { ideal: 4/3 },
  };
  
  // Toggle flashlight/torch
  const toggleTorch = useCallback(async () => {
    try {
      const stream = webcamRef.current?.video?.srcObject;
      if (stream) {
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities?.();
        if (capabilities?.torch) {
          await track.applyConstraints({
            advanced: [{ torch: !torch }]
          });
          setTorch(!torch);
        }
      }
    } catch (err) {
      console.warn('Torch not supported:', err);
    }
  }, [torch]);
  
  // Switch between front/rear camera
  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }, []);
  
  // Capture photo
  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot({
      width: 1920,
      height: 1440,
    });
    if (imageSrc) {
      setCapturedImage(imageSrc);
    }
  }, []);
  
  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
  }, []);
  
  // Confirm and use captured image
  const confirmCapture = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  }, [capturedImage, onCapture]);
  
  // Handle file upload
  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result;
        if (base64) {
          onFileUpload?.(base64) || onCapture(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  }, [onCapture, onFileUpload]);
  
  // Handle camera errors
  const handleCameraError = useCallback((error) => {
    console.error('Camera error:', error);
    setCameraError('Unable to access camera. Please check permissions or use file upload.');
    setIsLoading(false);
  }, []);
  
  const handleCameraReady = useCallback(() => {
    setIsLoading(false);
    setCameraError(null);
  }, []);
  
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
        >
          <X size={24} />
        </button>
        
        <span className="text-white text-sm font-bold uppercase tracking-wider">
          Scan Vitals Sheet
        </span>
        
        <div className="flex items-center gap-2">
          {/* Torch toggle */}
          <button
            onClick={toggleTorch}
            className={`p-2 rounded-full transition-colors ${
              torch 
                ? 'bg-amber-500 text-black' 
                : 'bg-black/40 text-white hover:bg-black/60'
            }`}
          >
            {torch ? <Zap size={20} /> : <ZapOff size={20} />}
          </button>
          
          {/* Switch camera */}
          {hasMultipleCameras && !capturedImage && (
            <button
              onClick={switchCamera}
              className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
            >
              <SwitchCamera size={20} />
            </button>
          )}
        </div>
      </div>
      
      {/* Camera or Preview */}
      <div className="flex-1 relative overflow-hidden">
        {capturedImage ? (
          // Preview captured image
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <img 
              src={capturedImage} 
              alt="Captured vitals sheet"
              className="max-w-full max-h-full object-contain"
            />
            
            {/* Overlay grid for alignment reference */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20" />
              <div className="absolute top-2/3 left-0 right-0 h-px bg-white/20" />
              <div className="absolute top-0 bottom-0 left-1/3 w-px bg-white/20" />
              <div className="absolute top-0 bottom-0 left-2/3 w-px bg-white/20" />
            </div>
          </div>
        ) : cameraError ? (
          // Error state
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <div className="bg-rose-500/20 rounded-full p-6 mb-4">
              <Camera size={48} className="text-rose-400" />
            </div>
            <p className="text-white mb-6">{cameraError}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-colors"
            >
              <Upload size={20} />
              Upload Photo Instead
            </button>
          </div>
        ) : (
          // Live camera feed
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
                  <p className="text-white/80 text-sm">Starting camera...</p>
                </div>
              </div>
            )}
            
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.92}
              videoConstraints={videoConstraints}
              onUserMedia={handleCameraReady}
              onUserMediaError={handleCameraError}
              className="absolute inset-0 w-full h-full object-cover"
            />
            
            {/* Scanning frame overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Corner brackets */}
              <div className="absolute top-[15%] left-[10%] w-16 h-16 border-l-4 border-t-4 border-teal-400 rounded-tl-lg" />
              <div className="absolute top-[15%] right-[10%] w-16 h-16 border-r-4 border-t-4 border-teal-400 rounded-tr-lg" />
              <div className="absolute bottom-[25%] left-[10%] w-16 h-16 border-l-4 border-b-4 border-teal-400 rounded-bl-lg" />
              <div className="absolute bottom-[25%] right-[10%] w-16 h-16 border-r-4 border-b-4 border-teal-400 rounded-br-lg" />
              
              {/* Guide text */}
              <div className="absolute top-[18%] left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 rounded-full">
                <p className="text-white text-xs font-bold">Align vitals sheet within frame</p>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 pb-safe bg-gradient-to-t from-black/90 to-transparent">
        <div className="flex items-center justify-center gap-8 p-6">
          {capturedImage ? (
            // Preview controls
            <>
              <button
                onClick={retakePhoto}
                className="flex flex-col items-center gap-1 text-white"
              >
                <div className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                  <RotateCcw size={24} />
                </div>
                <span className="text-xs font-bold">Retake</span>
              </button>
              
              <button
                onClick={confirmCapture}
                className="flex flex-col items-center gap-1"
              >
                <div className="p-5 rounded-full bg-teal-500 hover:bg-teal-600 transition-colors shadow-lg shadow-teal-500/30">
                  <Check size={32} className="text-white" />
                </div>
                <span className="text-xs font-bold text-teal-400">Use Photo</span>
              </button>
            </>
          ) : (
            // Capture controls
            <>
              {/* Upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-1 text-white"
              >
                <div className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                  <Upload size={24} />
                </div>
                <span className="text-xs font-bold">Upload</span>
              </button>
              
              {/* Capture button */}
              <button
                onClick={capturePhoto}
                disabled={isLoading || cameraError}
                className="flex flex-col items-center gap-1"
              >
                <div className="p-2 rounded-full bg-white disabled:opacity-50">
                  <div className="w-16 h-16 rounded-full bg-white border-4 border-slate-800 hover:border-teal-500 transition-colors flex items-center justify-center">
                    <Camera size={28} className="text-slate-700" />
                  </div>
                </div>
              </button>
              
              {/* Spacer for alignment */}
              <div className="w-16" />
            </>
          )}
        </div>
      </div>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default CameraCapture;
