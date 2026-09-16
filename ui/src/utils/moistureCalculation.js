/**
 * Utility functions for Soil Moisture Content Calculation
 * Standard: IS:2720 (Part II) - Determination of Water Content (Oven-Drying Method)
 * 
 * Formula:
 * - w1: Weight of container (gm)
 * - w2: Weight of container + wet soil (gm)
 * - w3: Weight of container + dry soil (gm)
 * - w4: Weight of water = w2 - w3 (gm)
 * - w5: Weight of dry soil = w3 - w1 (gm)
 * - Moisture Content, w = (w4 / w5) * 100 (%)
 * 
 * Reporting Rule per IS:2720 (Part II):
 * "The water content (w) of the soil shall be reported to two significant figures."
 * Example 1: 5.44 => 5.4%
 * Example 2: 12.81 => 13%
 */

/**
 * Format a number to two significant figures as per IS:2720 (Part II).
 * @param {number|string} val 
 * @returns {string}
 */
export function formatTwoSignificantFigures(val) {
  if (val === null || val === undefined || val === '') return '';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '';
  if (num === 0) return '0';
  
  // Use toPrecision(2) for 2 significant figures
  // Examples:
  // 5.44 -> "5.4"
  // 12.81 -> "13"
  // 10.88 -> "11"
  // 15.50 -> "15"
  // 0.854 -> "0.85"
  return Number(num.toPrecision(2)).toString();
}

/**
 * Format number to 1 decimal place (common engineering report format).
 * @param {number|string} val 
 * @returns {string}
 */
export function formatOneDecimal(val) {
  if (val === null || val === undefined || val === '') return '';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '';
  return num.toFixed(1);
}

/**
 * Perform moisture content calculation from w1, w2, w3.
 * 
 * @param {Object} params
 * @param {number|string} params.w1 - Weight of container (gm)
 * @param {number|string} params.w2 - Weight of container + wet soil (gm)
 * @param {number|string} params.w3 - Weight of container + dry soil (gm)
 * @param {'two_sig_figs'|'one_decimal'} [params.precisionMode='two_sig_figs'] - Precision standard
 * @returns {Object} Calculated values, formatted outputs, and validation status
 */
export function calculateMoistureValues({ w1, w2, w3, precisionMode = 'two_sig_figs' }) {
  const isPresent = (v) => v !== '' && v !== null && v !== undefined && v !== '-';
  const numW1 = isPresent(w1) ? parseFloat(w1) : NaN;
  const numW2 = isPresent(w2) ? parseFloat(w2) : NaN;
  const numW3 = isPresent(w3) ? parseFloat(w3) : NaN;

  const hasW1 = !isNaN(numW1);
  const hasW2 = !isNaN(numW2);
  const hasW3 = !isNaN(numW3);

  const hasAny = isPresent(w1) || isPresent(w2) || isPresent(w3);
  const hasAll = hasW1 && hasW2 && hasW3;

  const errors = [];
  const warnings = [];

  if (hasAny && !hasAll) {
    errors.push('All 3 container weight measurements (w₁, w₂, w₃) are required for a complete calculation.');
  }

  // Validation checks
  if (hasW2 && hasW3 && numW3 > numW2) {
    errors.push('Dry soil weight with container (w3) cannot exceed wet soil weight with container (w2).');
  }

  if (hasW1 && hasW3 && numW1 >= numW3) {
    errors.push('Dry soil weight with container (w3) must be greater than empty container weight (w1).');
  }

  if (hasW1 && hasW2 && numW1 >= numW2) {
    errors.push('Wet soil weight with container (w2) must be greater than empty container weight (w1).');
  }

  // w4: Weight of water = w2 - w3 (gm)
  let w4Val = null;
  let w4Str = '';
  if (hasW2 && hasW3 && numW2 >= numW3) {
    w4Val = Number((numW2 - numW3).toFixed(4));
    w4Str = Number(w4Val.toFixed(2)).toString();
  }

  // w5: Weight of dry soil = w3 - w1 (gm)
  let w5Val = null;
  let w5Str = '';
  if (hasW1 && hasW3 && numW3 > numW1) {
    w5Val = Number((numW3 - numW1).toFixed(4));
    w5Str = Number(w5Val.toFixed(2)).toString();
  }

  // w: Moisture Content (%) = (w4 / w5) * 100
  let rawMoisture = null;
  let formattedMoisture = '';
  let twoSigFigsMoisture = '';
  let oneDecimalMoisture = '';

  if (w4Val !== null && w5Val !== null && w5Val > 0) {
    rawMoisture = (w4Val / w5Val) * 100;
    twoSigFigsMoisture = formatTwoSignificantFigures(rawMoisture);
    oneDecimalMoisture = formatOneDecimal(rawMoisture);

    formattedMoisture = precisionMode === 'one_decimal' ? oneDecimalMoisture : twoSigFigsMoisture;
  }

  return {
    w1: hasW1 ? numW1 : '',
    w2: hasW2 ? numW2 : '',
    w3: hasW3 ? numW3 : '',
    w4: w4Str,
    w5: w5Str,
    w4Num: w4Val,
    w5Num: w5Val,
    rawMoisture,
    twoSigFigsMoisture,
    oneDecimalMoisture,
    moistureContent: formattedMoisture,
    errors,
    warnings,
    isValid: errors.length === 0 && rawMoisture !== null,
  };
}
