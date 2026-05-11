/**
 * Image Preprocessing Utilities for OCR
 * Enhances image quality for better text recognition
 */

/**
 * Create a canvas from an image source
 * @param {HTMLImageElement|HTMLCanvasElement|string} source - Image source
 * @returns {Promise<{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}>}
 */
async function createCanvasFromSource(source) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  let img;
  
  if (typeof source === 'string') {
    // Base64 or URL
    img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = source;
    });
  } else if (source instanceof HTMLImageElement) {
    img = source;
  } else if (source instanceof HTMLCanvasElement) {
    canvas.width = source.width;
    canvas.height = source.height;
    ctx.drawImage(source, 0, 0);
    return { canvas, ctx };
  } else {
    throw new Error('Invalid image source');
  }
  
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  ctx.drawImage(img, 0, 0);
  
  return { canvas, ctx };
}

/**
 * Convert image to grayscale
 */
function toGrayscale(ctx, canvas) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    // Luminance formula
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Increase image contrast
 */
function increaseContrast(ctx, canvas, factor = 1.5) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  const intercept = 128 * (1 - factor);
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, factor * data[i] + intercept));
    data[i + 1] = Math.min(255, Math.max(0, factor * data[i + 1] + intercept));
    data[i + 2] = Math.min(255, Math.max(0, factor * data[i + 2] + intercept));
  }
  
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply adaptive thresholding (binarization)
 */
function adaptiveThreshold(ctx, canvas, blockSize = 11, c = 2) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;
  
  // Create grayscale array
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    gray[i] = data[i * 4];
  }
  
  // Calculate integral image for fast mean calculation
  const integral = new Float64Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      rowSum += gray[y * width + x];
      integral[(y + 1) * (width + 1) + (x + 1)] = 
        rowSum + integral[y * (width + 1) + (x + 1)];
    }
  }
  
  // Apply threshold
  const half = Math.floor(blockSize / 2);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - half);
      const y1 = Math.max(0, y - half);
      const x2 = Math.min(width - 1, x + half);
      const y2 = Math.min(height - 1, y + half);
      
      const count = (x2 - x1 + 1) * (y2 - y1 + 1);
      const sum = integral[(y2 + 1) * (width + 1) + (x2 + 1)]
                - integral[(y1) * (width + 1) + (x2 + 1)]
                - integral[(y2 + 1) * (width + 1) + (x1)]
                + integral[(y1) * (width + 1) + (x1)];
      
      const mean = sum / count;
      const idx = (y * width + x) * 4;
      const val = gray[y * width + x] > (mean - c) ? 255 : 0;
      
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Sharpen the image
 */
function sharpen(ctx, canvas) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;
  
  // Sharpen kernel
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];
  
  const output = new Uint8ClampedArray(data.length);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        output[(y * width + x) * 4 + c] = Math.min(255, Math.max(0, sum));
      }
      output[(y * width + x) * 4 + 3] = 255;
    }
  }
  
  for (let i = 0; i < data.length; i++) {
    data[i] = output[i] || data[i];
  }
  
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Resize image for optimal OCR (max dimension 2000px)
 */
function resizeForOCR(ctx, canvas, maxDimension = 2000) {
  const { width, height } = canvas;
  
  if (width <= maxDimension && height <= maxDimension) {
    return { canvas, ctx, scale: 1 };
  }
  
  const scale = maxDimension / Math.max(width, height);
  const newWidth = Math.floor(width * scale);
  const newHeight = Math.floor(height * scale);
  
  const newCanvas = document.createElement('canvas');
  newCanvas.width = newWidth;
  newCanvas.height = newHeight;
  const newCtx = newCanvas.getContext('2d');
  
  // Use high-quality scaling
  newCtx.imageSmoothingEnabled = true;
  newCtx.imageSmoothingQuality = 'high';
  newCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
  
  return { canvas: newCanvas, ctx: newCtx, scale };
}

/**
 * Main preprocessing pipeline
 * @param {string} imageSource - Base64 image string or URL
 * @param {Object} options - Preprocessing options
 * @returns {Promise<string>} Processed image as base64
 */
export async function preprocessImage(imageSource, options = {}) {
  const {
    grayscale = true,
    contrast = true,
    contrastFactor = 1.4,
    threshold = false, // Disable by default as it can hurt handwriting
    sharpenImage = true,
    resize = true,
    maxDimension = 2000,
  } = options;
  
  try {
    let { canvas, ctx } = await createCanvasFromSource(imageSource);
    
    // Resize first if needed
    if (resize) {
      const resized = resizeForOCR(ctx, canvas, maxDimension);
      canvas = resized.canvas;
      ctx = resized.ctx;
    }
    
    // Apply preprocessing steps
    if (grayscale) {
      toGrayscale(ctx, canvas);
    }
    
    if (contrast) {
      increaseContrast(ctx, canvas, contrastFactor);
    }
    
    if (sharpenImage) {
      sharpen(ctx, canvas);
    }
    
    if (threshold) {
      adaptiveThreshold(ctx, canvas);
    }
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Image preprocessing failed:', error);
    throw error;
  }
}

/**
 * Quick preprocess optimized for mobile photos of handwritten forms
 */
export async function preprocessForMobileCapture(imageSource) {
  return preprocessImage(imageSource, {
    grayscale: true,
    contrast: true,
    contrastFactor: 1.3,
    threshold: false, // Keep colors for better handwriting recognition
    sharpenImage: true,
    resize: true,
    maxDimension: 1500, // Smaller for mobile
  });
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(imageSource) {
  const { canvas } = await createCanvasFromSource(imageSource);
  return { width: canvas.width, height: canvas.height };
}

export default {
  preprocessImage,
  preprocessForMobileCapture,
  getImageDimensions,
};
