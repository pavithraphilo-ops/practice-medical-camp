/**
 * useOCR Hook - Tesseract.js integration for vitals extraction
 */
import { useState, useCallback, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { preprocessForMobileCapture } from '../utils/imagePreprocessing';
import { parseVitalsFromText } from '../utils/vitalsParser';

// OCR Processing states
export const OCR_STATUS = {
  IDLE: 'idle',
  PREPROCESSING: 'preprocessing',
  LOADING: 'loading',
  RECOGNIZING: 'recognizing',
  PARSING: 'parsing',
  COMPLETE: 'complete',
  ERROR: 'error',
};

/**
 * Custom hook for OCR processing with progress tracking
 */
export function useOCR() {
  const [status, setStatus] = useState(OCR_STATUS.IDLE);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState(null);
  const [rawText, setRawText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  
  const workerRef = useRef(null);
  const abortRef = useRef(false);
  
  /**
   * Process an image through OCR
   * @param {string} imageSource - Base64 image or URL
   * @returns {Promise<Object>} Parsed vitals data
   */
  const processImage = useCallback(async (imageSource) => {
    abortRef.current = false;
    setError(null);
    setRawText('');
    setParsedData(null);
    setProgress(0);
    
    try {
      // Step 1: Preprocess image
      setStatus(OCR_STATUS.PREPROCESSING);
      setProgressMessage('Enhancing image quality...');
      setProgress(10);
      
      let processedImage;
      try {
        processedImage = await preprocessForMobileCapture(imageSource);
      } catch (err) {
        // If preprocessing fails, use original image
        console.warn('Preprocessing failed, using original image:', err);
        processedImage = imageSource;
      }
      
      if (abortRef.current) return null;
      
      // Step 2: Initialize Tesseract
      setStatus(OCR_STATUS.LOADING);
      setProgressMessage('Loading OCR engine...');
      setProgress(20);
      
      // Step 3: Recognize text
      setStatus(OCR_STATUS.RECOGNIZING);
      
      const result = await Tesseract.recognize(processedImage, 'eng', {
        logger: (m) => {
          if (abortRef.current) return;
          
          if (m.status === 'recognizing text') {
            const recognizeProgress = 20 + (m.progress * 60); // 20-80%
            setProgress(Math.round(recognizeProgress));
            setProgressMessage(`Reading text... ${Math.round(m.progress * 100)}%`);
          } else if (m.status === 'loading tesseract core') {
            setProgressMessage('Loading OCR core...');
          } else if (m.status === 'initializing tesseract') {
            setProgressMessage('Initializing OCR...');
          } else if (m.status === 'loading language traineddata') {
            setProgressMessage('Loading language data...');
          }
        },
      });
      
      if (abortRef.current) return null;
      
      const extractedText = result.data.text;
      setRawText(extractedText);
      
      // Step 4: Parse vitals from text
      setStatus(OCR_STATUS.PARSING);
      setProgressMessage('Extracting vital signs...');
      setProgress(90);
      
      const parsed = parseVitalsFromText(extractedText);
      setParsedData(parsed);
      
      setProgress(100);
      setStatus(OCR_STATUS.COMPLETE);
      setProgressMessage('Complete!');
      
      return parsed;
      
    } catch (err) {
      console.error('OCR Error:', err);
      setError(err.message || 'Failed to process image');
      setStatus(OCR_STATUS.ERROR);
      setProgressMessage('Error occurred');
      return null;
    }
  }, []);
  
  /**
   * Abort ongoing OCR process
   */
  const abort = useCallback(() => {
    abortRef.current = true;
    setStatus(OCR_STATUS.IDLE);
    setProgress(0);
    setProgressMessage('');
  }, []);
  
  /**
   * Reset state
   */
  const reset = useCallback(() => {
    abortRef.current = false;
    setStatus(OCR_STATUS.IDLE);
    setProgress(0);
    setProgressMessage('');
    setError(null);
    setRawText('');
    setParsedData(null);
  }, []);
  
  return {
    // State
    status,
    progress,
    progressMessage,
    error,
    rawText,
    parsedData,
    
    // Derived state
    isProcessing: [OCR_STATUS.PREPROCESSING, OCR_STATUS.LOADING, OCR_STATUS.RECOGNIZING, OCR_STATUS.PARSING].includes(status),
    isComplete: status === OCR_STATUS.COMPLETE,
    isError: status === OCR_STATUS.ERROR,
    
    // Actions
    processImage,
    abort,
    reset,
  };
}

export default useOCR;
