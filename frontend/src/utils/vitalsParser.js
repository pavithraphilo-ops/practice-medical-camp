/**
 * Vitals Parser - Extracts medical vitals data from OCR text
 * Parses various formats of medical data with confidence scoring
 */

// Field patterns with multiple format variations
const FIELD_PATTERNS = {
  patientId: {
    patterns: [
      /(?:patient\s*(?:id|no|number)?|pid|p\.?id|id\s*no?)[\s:.\-#]*([a-z0-9]{3,10})/i,
      /^([a-z]?\d{4,8})$/im, // Plain ID on its own line
    ],
    validate: (val) => /^[a-z0-9]{3,10}$/i.test(val),
    normalRange: null,
  },
  
  eNo: {
    patterns: [
      /(?:e\.?no|entry\s*(?:no|number)?|e\.?\s*number)[\s:.\-#]*(\d{1,6})/i,
    ],
    validate: (val) => /^\d{1,6}$/.test(val),
    normalRange: null,
  },
  
  weight: {
    patterns: [
      /(?:wt|weight|w)[\s:.\-]*(\d{1,3}(?:\.\d{1,2})?)\s*(?:kg|kgs?)?/i,
      /(\d{1,3}(?:\.\d{1,2})?)\s*kg/i,
    ],
    validate: (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 1 && num <= 300;
    },
    normalRange: { min: 30, max: 150, unit: 'kg' },
  },
  
  height: {
    patterns: [
      /(?:ht|height|h)[\s:.\-]*(\d{2,3}(?:\.\d{1,2})?)\s*(?:cm|cms?)?/i,
      /(\d{2,3}(?:\.\d{1,2})?)\s*cm/i,
    ],
    validate: (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 50 && num <= 250;
    },
    normalRange: { min: 100, max: 200, unit: 'cm' },
  },
  
  bloodPressure: {
    patterns: [
      /(?:b\.?p|blood\s*pressure|bp)[\s:.\-]*(\d{2,3})\s*[\/\\]\s*(\d{2,3})/i,
      /(\d{2,3})\s*[\/\\]\s*(\d{2,3})\s*(?:mm\s*hg)?/i,
    ],
    validate: (val) => {
      const match = val.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
      if (!match) return false;
      const sys = parseInt(match[1]);
      const dia = parseInt(match[2]);
      return sys >= 60 && sys <= 250 && dia >= 30 && dia <= 150 && sys > dia;
    },
    normalRange: { sys: { min: 90, max: 140 }, dia: { min: 60, max: 90 }, unit: 'mmHg' },
    transform: (match) => `${match[1]}/${match[2]}`,
  },
  
  pulse: {
    patterns: [
      /(?:pulse|pr|heart\s*rate|hr|p\.r)[\s:.\-]*(\d{2,3})\s*(?:bpm|\/min)?/i,
      /(\d{2,3})\s*bpm/i,
    ],
    validate: (val) => {
      const num = parseInt(val);
      return !isNaN(num) && num >= 30 && num <= 220;
    },
    normalRange: { min: 60, max: 100, unit: 'BPM' },
  },
  
  rbs: {
    patterns: [
      /(?:rbs|random\s*blood\s*sugar|blood\s*sugar|sugar|glucose|bs)[\s:.\-]*(\d{2,4})\s*(?:mg\/dl|mg)?/i,
      /(\d{2,4})\s*mg\s*\/?\s*dl/i,
    ],
    validate: (val) => {
      const num = parseInt(val);
      return !isNaN(num) && num >= 30 && num <= 600;
    },
    normalRange: { min: 70, max: 140, unit: 'mg/dL' },
  },
  
  haemoglobin: {
    patterns: [
      /(?:hb|hemo|haemo|hemoglobin|haemoglobin|hgb)[\s:.\-]*(\d{1,2}(?:\.\d{1,2})?)\s*(?:g\/dl|g|gm)?/i,
      /(\d{1,2}\.\d{1,2})\s*g\s*\/?\s*dl/i,
    ],
    validate: (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 3 && num <= 25;
    },
    normalRange: { min: 11, max: 17, unit: 'g/dL' },
  },
  
  drId: {
    patterns: [
      /(?:dr\.?\s*(?:id|no|number)?|doctor\s*(?:id|no|number)?|physician\s*id)[\s:.\-#]*([a-z0-9]{2,8})/i,
    ],
    validate: (val) => /^[a-z0-9]{2,8}$/i.test(val),
    normalRange: null,
  },
  
  drName: {
    patterns: [
      /(?:dr\.?\s*(?:name)?|doctor|physician)[\s:.\-]*([a-z][a-z\s.]{2,30})/i,
    ],
    validate: (val) => val.length >= 2 && val.length <= 50,
    normalRange: null,
    transform: (match) => match[1].trim(),
  },
};

/**
 * Calculate confidence score based on pattern match quality
 */
function calculateConfidence(value, fieldConfig, matchType) {
  let confidence = 0.5; // Base confidence
  
  // Boost for validation pass
  if (fieldConfig.validate && fieldConfig.validate(value)) {
    confidence += 0.3;
  }
  
  // Boost for being in normal medical range
  if (fieldConfig.normalRange) {
    const range = fieldConfig.normalRange;
    const num = parseFloat(value);
    
    if (range.min !== undefined && range.max !== undefined) {
      if (num >= range.min && num <= range.max) {
        confidence += 0.15;
      }
    } else if (range.sys && range.dia) {
      // Blood pressure special case
      const bpMatch = value.match(/(\d+)\/(\d+)/);
      if (bpMatch) {
        const sys = parseInt(bpMatch[1]);
        const dia = parseInt(bpMatch[2]);
        if (sys >= range.sys.min && sys <= range.sys.max && 
            dia >= range.dia.min && dia <= range.dia.max) {
          confidence += 0.15;
        }
      }
    }
  }
  
  // Penalize short values
  if (value.length < 2) {
    confidence -= 0.2;
  }
  
  return Math.min(Math.max(confidence, 0), 1);
}

/**
 * Extract a single field from OCR text
 */
function extractField(text, fieldName, fieldConfig) {
  for (const pattern of fieldConfig.patterns) {
    const match = text.match(pattern);
    if (match) {
      let value;
      if (fieldConfig.transform) {
        value = fieldConfig.transform(match);
      } else {
        value = match[1];
      }
      
      // Clean up the value
      value = value.toString().trim();
      
      // Validate
      if (fieldConfig.validate && !fieldConfig.validate(value)) {
        continue; // Try next pattern
      }
      
      const confidence = calculateConfidence(value, fieldConfig, 'primary');
      
      return {
        value,
        confidence,
        rawMatch: match[0],
      };
    }
  }
  
  return {
    value: null,
    confidence: 0,
    rawMatch: null,
  };
}

/**
 * Parse all vitals from OCR text
 * @param {string} ocrText - Raw text from OCR
 * @returns {Object} Parsed vitals with confidence scores
 */
export function parseVitalsFromText(ocrText) {
  if (!ocrText || typeof ocrText !== 'string') {
    return {
      success: false,
      error: 'No text provided',
      data: {},
      overallConfidence: 0,
    };
  }
  
  // Normalize text
  const normalizedText = ocrText
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
  
  const results = {};
  let totalConfidence = 0;
  let fieldCount = 0;
  
  for (const [fieldName, fieldConfig] of Object.entries(FIELD_PATTERNS)) {
    const extracted = extractField(normalizedText, fieldName, fieldConfig);
    results[fieldName] = {
      value: extracted.value,
      confidence: extracted.confidence,
      rawMatch: extracted.rawMatch,
      normalRange: fieldConfig.normalRange,
    };
    
    if (extracted.value !== null) {
      totalConfidence += extracted.confidence;
      fieldCount++;
    }
  }
  
  const overallConfidence = fieldCount > 0 ? totalConfidence / fieldCount : 0;
  
  return {
    success: true,
    data: results,
    overallConfidence,
    fieldsDetected: fieldCount,
    totalFields: Object.keys(FIELD_PATTERNS).length,
  };
}

/**
 * Get confidence level label
 */
export function getConfidenceLevel(confidence) {
  if (confidence >= 0.85) return { level: 'high', label: 'High', color: 'emerald' };
  if (confidence >= 0.65) return { level: 'medium', label: 'Medium', color: 'amber' };
  return { level: 'low', label: 'Low', color: 'rose' };
}

/**
 * Validate a specific vital value against medical ranges
 */
export function validateVitalValue(fieldName, value) {
  const config = FIELD_PATTERNS[fieldName];
  if (!config) return { valid: false, message: 'Unknown field' };
  
  if (!config.validate(value)) {
    return { valid: false, message: 'Invalid format' };
  }
  
  if (config.normalRange) {
    const range = config.normalRange;
    const num = parseFloat(value);
    
    if (range.min !== undefined && range.max !== undefined) {
      if (num < range.min || num > range.max) {
        return { 
          valid: true, 
          warning: true,
          message: `Outside normal range (${range.min}-${range.max} ${range.unit})` 
        };
      }
    }
  }
  
  return { valid: true, warning: false };
}

export default {
  parseVitalsFromText,
  getConfidenceLevel,
  validateVitalValue,
};
