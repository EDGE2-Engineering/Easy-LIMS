/**
 * Utility functions for Soil Grain Size & Sieve Analysis + Hydrometer Analysis
 * Standard: IS 2720 (Part 4) - Methods of Test for Soils: Grain Size Analysis
 * Classification: IS 1498 - Classification and Identification of Soils for General Engineering Purposes
 * 
 * Soil Fractions:
 * - Gravel (G): Particles retained on 4.75 mm IS Sieve and above (100mm down to 4.75mm)
 * - Sand (S): Particles passing 4.75 mm and retained on 0.075 mm (75 µm) IS Sieve (2.36 mm to 0.075 mm)
 *   - Coarse Sand: 4.75 mm - 2.00 mm
 *   - Medium Sand: 2.00 mm - 0.425 mm
 *   - Fine Sand: 0.425 mm - 0.075 mm
 * - Silt & Clay (SC / Fines): Particles passing 0.075 mm (75 µm) IS Sieve (collected in Pan and washing loss)
 *   - Silt: 0.075 mm - 0.002 mm (determined by Hydrometer Analysis)
 *   - Clay: < 0.002 mm (determined by Hydrometer Analysis)
 * 
 * Condition for Hydrometer Test (per IS 2720 Part 4):
 * - If % Passing 75µ sieve > 10% of total sample, Hydrometer Analysis is required.
 */

// Coarse Gravel / Cobble Sieves (optional / extended per IS 2720: Part 4, Page 1)
export const COARSE_SIEVES_CONFIG = [
  { key: 'sieve_100', label: '100 mm', size: 100, fraction: 'Gravel', fractionKey: 'G', category: 'gravel' },
  { key: 'sieve_80', label: '80 mm', size: 80, fraction: 'Gravel', fractionKey: 'G', category: 'gravel' },
  { key: 'sieve_40', label: '40 mm', size: 40, fraction: 'Gravel', fractionKey: 'G', category: 'gravel' },
  { key: 'sieve_20', label: '20 mm', size: 20, fraction: 'Gravel', fractionKey: 'G', category: 'gravel' },
];

// Standard Sieves Configuration used across Easy-LIMS
export const SIEVES_CONFIG = [
  { key: 'sieve0', label: '10 mm', size: 10, fraction: 'Gravel', fractionKey: 'G', category: 'gravel' },
  { key: 'sieve1', label: '4.75 mm', size: 4.75, fraction: 'Gravel', fractionKey: 'G', category: 'gravel' },
  { key: 'sieve2', label: '2.36 mm', size: 2.36, fraction: 'Sand (Coarse)', fractionKey: 'S', category: 'sand' },
  { key: 'sieve3', label: '2 mm', size: 2, fraction: 'Sand (Coarse)', fractionKey: 'S', category: 'sand' },
  { key: 'sieve4', label: '1.18 mm', size: 1.18, fraction: 'Sand (Medium)', fractionKey: 'S', category: 'sand' },
  { key: 'sieve5', label: '0.60 mm', size: 0.6, fraction: 'Sand (Medium)', fractionKey: 'S', category: 'sand' },
  { key: 'sieve6', label: '0.425 mm', size: 0.425, fraction: 'Sand (Medium)', fractionKey: 'S', category: 'sand' },
  { key: 'sieve7', label: '0.30 mm', size: 0.3, fraction: 'Sand (Fine)', fractionKey: 'S', category: 'sand' },
  { key: 'sieve8', label: '0.15 mm', size: 0.15, fraction: 'Sand (Fine)', fractionKey: 'S', category: 'sand' },
  { key: 'sieve9', label: '0.075 mm', size: 0.075, fraction: 'Sand (Fine)', fractionKey: 'S', category: 'sand' },
  { key: 'sieve10', label: 'Pan', size: null, fraction: 'Silt & Clay (Fines)', fractionKey: 'SC', category: 'fines' },
];

export const FULL_SIEVES_CONFIG = [...COARSE_SIEVES_CONFIG, ...SIEVES_CONFIG];

/**
 * Calculates Grain Size Distribution, sieve analysis table, and sand bifurcation
 * @param {Object} params
 * @param {number|string} params.totalWeight - Total sample weight taken (g)
 * @param {Object} params.sieves - Map of sieve keys to weights in grams
 * @param {boolean} [params.includeCoarse=false] - Whether to include 100, 80, 40, 20 mm sieves
 * @returns {Object}
 */
export function calculateGrainSizeFromSieve({ totalWeight, sieves = {}, includeCoarse = false }) {
  const isPresent = (v) => v !== '' && v !== null && v !== undefined && v !== '-';
  const numTotalWeight = isPresent(totalWeight) ? parseFloat(totalWeight) : NaN;

  const hasAnyCoarseInput = COARSE_SIEVES_CONFIG.some((s) => {
    const raw = sieves[s.key] ?? sieves[s.label];
    const val = isPresent(raw) ? parseFloat(raw) : NaN;
    return !isNaN(val) && val > 0;
  });

  const activeConfig = (includeCoarse || hasAnyCoarseInput) ? FULL_SIEVES_CONFIG : SIEVES_CONFIG;

  let sumRetained = 0;
  let hasAnyInput = false;

  const parsedWeights = {};
  activeConfig.forEach((s) => {
    const raw = sieves[s.key] ?? sieves[s.key.replace('sieve', 'sieve_')] ?? sieves[s.label];
    const val = isPresent(raw) ? parseFloat(raw) : NaN;
    if (!isNaN(val) && val >= 0) {
      parsedWeights[s.key] = val;
      sumRetained += val;
      if (val > 0) hasAnyInput = true;
    } else {
      parsedWeights[s.key] = 0;
    }
  });

  const effectiveTotal = !isNaN(numTotalWeight) && numTotalWeight > 0 ? numTotalWeight : sumRetained;

  // Compute table rows
  let cumWt = 0;
  let cumPctRetainedAcc = 0;
  const sieveRows = activeConfig.map((s) => {
    const wt = parsedWeights[s.key];
    cumWt += wt;

    const pctRetained = effectiveTotal > 0 ? (wt / effectiveTotal) * 100 : 0;
    cumPctRetainedAcc += pctRetained;
    const cumPctRetained = Math.min(100, cumPctRetainedAcc);
    const finesPassing = Math.max(0, 100 - cumPctRetained);

    return {
      ...s,
      wt,
      rawInput: sieves[s.key] ?? '',
      pctRetained: Number(pctRetained.toFixed(2)),
      cumPctRetained: Number(cumPctRetained.toFixed(2)),
      finesPassing: Number(finesPassing.toFixed(2)),
    };
  });

  // Gravel fraction: all sieves with category 'gravel' (>= 4.75 mm)
  let gravelWeight = 0;
  activeConfig.forEach((s) => {
    if (s.category === 'gravel') {
      gravelWeight += parsedWeights[s.key] || 0;
    }
  });
  const rawGravelPct = effectiveTotal > 0 ? (gravelWeight / effectiveTotal) * 100 : 0;
  const gravelPct = Number(rawGravelPct.toFixed(2));

  // Sand fraction: 4.75 mm to 0.075 mm
  let sandWeight = 0;
  activeConfig.forEach((s) => {
    if (s.category === 'sand') {
      sandWeight += parsedWeights[s.key] || 0;
    }
  });
  const rawSandPct = effectiveTotal > 0 ? (sandWeight / effectiveTotal) * 100 : 0;
  const sandPct = Number(rawSandPct.toFixed(2));

  // Silt & Clay fraction (SC / Fines): < 0.075 mm (passing 75 µm sieve)
  const panWeight = parsedWeights.sieve10 || 0;
  let siltAndClayPct = 0;
  if (effectiveTotal > 0 && (gravelPct > 0 || sandPct > 0 || panWeight > 0 || sumRetained > 0)) {
    siltAndClayPct = Number(Math.max(0, 100 - gravelPct - sandPct).toFixed(2));
  }

  // Fines passing 75 µm sieve
  const sieve75umRow = sieveRows.find((r) => r.key === 'sieve9' || r.size === 0.075);
  const passing75um = sieve75umRow ? sieve75umRow.finesPassing : siltAndClayPct;

  // Sand Bifurcation (Page 4):
  // Coarse: Passing 4.75mm - Passing 2.00mm
  // Medium: Passing 2.00mm - Passing 0.425mm
  // Fine: Passing 0.425mm - Passing 0.075mm
  const sieve4_75 = sieveRows.find((r) => r.key === 'sieve1' || r.size === 4.75);
  const sieve2_00 = sieveRows.find((r) => r.key === 'sieve3' || r.size === 2);
  const sieve0_425 = sieveRows.find((r) => r.key === 'sieve6' || r.size === 0.425);

  const passing4_75 = sieve4_75 ? sieve4_75.finesPassing : 100;
  const passing2_00 = sieve2_00 ? sieve2_00.finesPassing : passing4_75;
  const passing0_425 = sieve0_425 ? sieve0_425.finesPassing : passing2_00;

  const coarseSand = Number(Math.max(0, passing4_75 - passing2_00).toFixed(2));
  const mediumSand = Number(Math.max(0, passing2_00 - passing0_425).toFixed(2));
  const fineSand = Number(Math.max(0, passing0_425 - passing75um).toFixed(2));

  // Requirement for Hydrometer per Page 5: passing 75µ > 10%
  const requiresHydrometer = passing75um > 10;

  // Mass recovery & balance
  const massLoss = !isNaN(numTotalWeight) && numTotalWeight > 0 ? numTotalWeight - sumRetained : 0;
  const recoveryPercent = effectiveTotal > 0 ? (sumRetained / effectiveTotal) * 100 : 0;

  // Validation Warnings & Errors
  const warnings = [];
  const errors = [];

  if (!isNaN(numTotalWeight) && numTotalWeight > 0) {
    if (sumRetained > 0 && sumRetained < numTotalWeight * 0.01) {
      warnings.push(
        `Sum of retained weights (${sumRetained.toFixed(2)} g) is less than 1% of the total sample weight (${numTotalWeight.toFixed(2)} g). Minimum required per IS code: ${(numTotalWeight * 0.01).toFixed(2)} g.`
      );
    }
    if (sumRetained > numTotalWeight * 1.01) {
      warnings.push(
        `Sum of retained weights (${sumRetained.toFixed(2)} g) exceeds the total sample weight (${numTotalWeight.toFixed(2)} g) by ${(sumRetained - numTotalWeight).toFixed(2)} g.`
      );
    }
  }

  const hasData = hasAnyInput || (!isNaN(numTotalWeight) && numTotalWeight > 0);

  return {
    totalWeight: !isNaN(numTotalWeight) ? numTotalWeight : '',
    sumRetained: Number(sumRetained.toFixed(2)),
    effectiveTotal: Number(effectiveTotal.toFixed(2)),
    massLoss: Number(massLoss.toFixed(2)),
    recoveryPercent: Number(recoveryPercent.toFixed(2)),
    sieveRows,
    gravelWeight: Number(gravelWeight.toFixed(2)),
    sandWeight: Number(sandWeight.toFixed(2)),
    panWeight: Number(panWeight.toFixed(2)),
    gravel: hasData ? gravelPct.toFixed(2) : '',
    sand: hasData ? sandPct.toFixed(2) : '',
    siltAndClay: hasData ? siltAndClayPct.toFixed(2) : '',
    rawGravel: gravelPct,
    rawSand: sandPct,
    rawSiltAndClay: siltAndClayPct,
    passing75um: Number(passing75um.toFixed(2)),
    requiresHydrometer,
    sandBifurcation: {
      coarse: coarseSand,
      medium: mediumSand,
      fine: fineSand,
      total: Number((coarseSand + mediumSand + fineSand).toFixed(2)),
    },
    hasData,
    warnings,
    errors,
  };
}

// -------------------------------------------------------------
// HYDROMETER ANALYSIS (IS 2720: Part 4)
// -------------------------------------------------------------

export const HYDROMETER_DEFAULTS = {
  specificGravitySoil: 2.55,       // Gs
  specificGravityWater: 1.0,       // Gw
  drySampleWeight: 50.0,           // W_D (mass of soil in suspension after pretreatment, g)
  cylinderVolume: 1000,            // ml
  initialWaterVolume: 800,         // ml (water before hydrometer immersion)
  waterVolumeWithHydrometer: 880,  // ml (water after hydrometer immersion)
  hydrometerVolumeVh: 80,          // Vh = 880 - 800 = 80 ml
  jarReading1: 600,                // ml
  jarReading2: 700,                // ml
  jarDistanceBetweenReadings: 3.55,// cm
  bulbLengthH: 17.0,               // h (distance between bulb bottom and neck of stem, cm)
  meniscusCorrectionCm: 0.0005,    // Cm
  dispersingAgentCorrectionCd: 2.5,// Cd
  slope1: 0.3688,                  // Slope for He vs Rh calibration
  intercept1: 19.303,              // Intercept for t <= 4 min (Page 11, 27)
  slope2: 0.3688,                  // Slope for He vs Rh calibration
  intercept2: 20.723,              // Intercept for t > 4 min (Page 13, 27)
};

export const DEFAULT_HYDROMETER_TIMES = [
  0.5, 1, 2, 4, 8, 15, 30, 60, 120, 240, 360, 1380, 1440
];

/**
 * Table 1: Pure water density (g/cc) between 20°C and 30°C (Pages 15-16)
 * Linear interpolation between 20°C (0.9982063) and 30°C (0.9956488)
 */
export function getWaterDensity(tempC) {
  const t = Math.min(30, Math.max(20, parseFloat(tempC) || 27));
  return 0.9982063 + (t - 20) * ((0.9956488 - 0.9982063) / 10);
}

/**
 * Table 2: Hydrometer reading in distilled water (Pages 15 & 17)
 */
export const DISTILLED_WATER_HM_READINGS = {
  20: 1.0010,
  21: 1.0010,
  22: 1.0010,
  23: 1.0005,
  24: 1.0005,
  25: 1.0005,
  26: 1.0000,
  27: 0.9995,
  28: 0.9995,
  29: 0.9990,
  30: 0.9990,
};

export function getDistilledWaterReading(tempC) {
  const roundedTemp = Math.round(Math.min(30, Math.max(20, parseFloat(tempC) || 27)));
  return DISTILLED_WATER_HM_READINGS[roundedTemp] ?? 1.0000;
}

/**
 * Table 3: Viscosity of water in Poise (Pages 15 & 18)
 * Linear interpolation between 20°C (0.0100200) and 30°C (0.0079780)
 */
export function getWaterViscosity(tempC) {
  const t = Math.min(30, Math.max(20, parseFloat(tempC) || 27));
  return 0.0100200 - (t - 20) * ((0.0100200 - 0.0079780) / 10);
}

/**
 * Calculates Effective Depth He (cm) per IS 2720 Part 4 & Pages 11, 13, 22, 27
 * @param {number} timeMin - Elapsed time in minutes
 * @param {number} correctedRh - Meniscus-corrected hydrometer reading (e.g. 1.0120)
 * @param {Object} [customConstants]
 */
export function calculateEffectiveDepth(timeMin, correctedRh, customConstants = {}) {
  const intercept1 = customConstants.intercept1 ?? HYDROMETER_DEFAULTS.intercept1;
  const slope1 = customConstants.slope1 ?? HYDROMETER_DEFAULTS.slope1;
  const intercept2 = customConstants.intercept2 ?? HYDROMETER_DEFAULTS.intercept2;
  const slope2 = customConstants.slope2 ?? HYDROMETER_DEFAULTS.slope2;

  // Rh scale on stem: e.g. 1.0120 -> (1.0120 - 1) * 1000 = 12.0
  const rhValue = (correctedRh - 1) * 1000;

  if (timeMin <= 4) {
    // Continuous immersion: He = 19.303 - 0.3688 * Rh
    return Math.max(0, intercept1 - slope1 * rhValue);
  } else {
    // Intermittent immersion: He = 20.723 - 0.3688 * Rh
    return Math.max(0, intercept2 - slope2 * rhValue);
  }
}

/**
 * Calculates Stokes' Law Factor K per Page 22
 * K = sqrt( (30 * eta) / (980 * (Gs - Gw)) )
 */
export function calculateFactorK(viscosityPoise, specificGravitySoil, specificGravityWater = 1.0) {
  const g = 980; // acceleration due to gravity (cm/s^2)
  const diffG = Math.max(0.01, specificGravitySoil - specificGravityWater);
  return Math.sqrt((30 * viscosityPoise) / (g * diffG));
}

/**
 * Calculates Particle Diameter D in mm per Page 23
 * D = K * sqrt( He / t )
 */
export function calculateParticleDiameter(factorK, effectiveDepthCm, timeMin) {
  if (timeMin <= 0 || effectiveDepthCm <= 0) return 0;
  return factorK * Math.sqrt(effectiveDepthCm / timeMin);
}

/**
 * Calculates % Finer N (%) per Page 23
 * N = (100 * Gs / (W_D * (Gs - Gw))) * (Rh + Ct - Cd)
 */
export function calculatePercentageFiner({
  correctedRh,
  tempCorrectionCt,
  dispersingAgentCorrectionCd = 2.5,
  specificGravitySoil = 2.55,
  specificGravityWater = 1.0,
  drySampleWeight = 50.0,
}) {
  const rhValue = (correctedRh - 1) * 1000;
  const rhTotalCorrection = rhValue + tempCorrectionCt - dispersingAgentCorrectionCd;
  const diffG = Math.max(0.01, specificGravitySoil - specificGravityWater);
  const factor = (100 * specificGravitySoil) / (drySampleWeight * diffG);
  const percentageFiner = factor * rhTotalCorrection;
  return {
    rhTotalCorrection,
    percentageFiner,
  };
}

/**
 * Comprehensive Hydrometer Analysis Calculator (IS 2720: Part 4)
 * @param {Object} params
 * @param {Array} params.readings - Array of { time, temp, hmReading }
 * @param {number|string} params.sieveTotalWeight - Total soil taken for sieve test (Mw, g)
 * @param {number|string} params.finesPassing75um - % Fines passing 75µ sieve from Sieve Analysis
 * @param {number|string} [params.specificGravitySoil=2.55] - Gs
 * @param {number|string} [params.specificGravityWater=1.0] - Gw
 * @param {number|string} [params.drySampleWeight=50.0] - W_D (g)
 * @param {Object} [params.constants] - Equipment constants (Cm, Cd, etc.)
 */
export function calculateHydrometerAnalysis({
  readings = [],
  sieveTotalWeight = 200,
  finesPassing75um = 0,
  specificGravitySoil = HYDROMETER_DEFAULTS.specificGravitySoil,
  specificGravityWater = HYDROMETER_DEFAULTS.specificGravityWater,
  drySampleWeight = HYDROMETER_DEFAULTS.drySampleWeight,
  constants = {},
}) {
  const numMw = parseFloat(sieveTotalWeight) || 0;
  const numFines75 = parseFloat(finesPassing75um) || 0;
  const numGs = parseFloat(specificGravitySoil) || HYDROMETER_DEFAULTS.specificGravitySoil;
  const numGw = parseFloat(specificGravityWater) || HYDROMETER_DEFAULTS.specificGravityWater;
  const numWd = parseFloat(drySampleWeight) || HYDROMETER_DEFAULTS.drySampleWeight;

  const Cm = constants.meniscusCorrectionCm ?? HYDROMETER_DEFAULTS.meniscusCorrectionCm;
  const Cd = constants.dispersingAgentCorrectionCd ?? HYDROMETER_DEFAULTS.dispersingAgentCorrectionCd;

  // Mass passed 75µ sieve: Md = (% Passing 75µ * Mw) / 100 (Page 9)
  const samplePassed75um = Number(((numFines75 * numMw) / 100).toFixed(2));
  // Mass retained on 75µ sieve = Mw - Md (Page 9)
  const sampleRetained75um = Number(Math.max(0, numMw - samplePassed75um).toFixed(2));

  // Default times if readings empty
  const activeReadings = (readings && readings.length > 0)
    ? readings
    : DEFAULT_HYDROMETER_TIMES.map((time) => ({ time, temp: 28, hmReading: '' }));

  let hasData = false;

  const rows = activeReadings.map((r, index) => {
    const time = parseFloat(r.time) || 0;
    const temp = parseFloat(r.temp) || 28;
    const rawReading = r.hmReading !== '' && r.hmReading !== null && r.hmReading !== undefined ? parseFloat(r.hmReading) : NaN;

    if (!isNaN(rawReading) && rawReading > 0) {
      hasData = true;
    }

    const waterReading = getDistilledWaterReading(temp);
    const viscosity = getWaterViscosity(temp);
    const waterDensity = getWaterDensity(temp);

    let correctedRh = 0;
    let tempCrctnCt = 0;
    let rhTotalCorrection = 0;
    let effectiveDepthHe = 0;
    let factorK = 0;
    let factorKDisplay = 0;
    let diaParticleD = 0;
    let percentageFinerN = 0;
    let massPassed75um = 0;
    let combinedPercentageFiner = 0;

    if (!isNaN(rawReading) && rawReading > 0) {
      // C6: Corrected HM Reading (Rh) = C3 + Cm (Page 21)
      correctedRh = rawReading + Cm;

      // C7: Temperature Correction (Ct) = (C4 - density) * 1000 (Page 21)
      tempCrctnCt = (waterReading - waterDensity) * 1000;

      // C8: Rh + Ct - Cd = ((Rh - 1) * 1000) + Ct - Cd (Page 22)
      const rhValue = (correctedRh - 1) * 1000;
      rhTotalCorrection = rhValue + tempCrctnCt - Cd;

      // C9: Effective Depth He (cm) (Page 22 & 27)
      effectiveDepthHe = calculateEffectiveDepth(time, correctedRh, constants);

      // C10: Factor K (Page 22)
      factorK = calculateFactorK(viscosity, numGs, numGw);
      factorKDisplay = Math.round(factorK * 100000);

      // C11: Particle Diameter D (mm) (Page 23)
      diaParticleD = calculateParticleDiameter(factorK, effectiveDepthHe, time);

      // C12: % Finer than D, N (%) (Page 23)
      const diffG = Math.max(0.01, numGs - numGw);
      const factorN = (100 * numGs) / (numWd * diffG);
      percentageFinerN = factorN * rhTotalCorrection;

      // C13: Mass of 75µ Passing Soil (gm) = (N * Md) / 100 (Page 23 & 24)
      massPassed75um = (percentageFinerN * samplePassed75um) / 100;

      // C14: Combined % Finer than D as % of Total Sample = (N * % Passing 75µ) / 100 (Page 24)
      combinedPercentageFiner = (percentageFinerN * numFines75) / 100;
    }

    return {
      index,
      time,
      temp,
      rawReading: r.hmReading ?? '',
      readingInWater: Number(waterReading.toFixed(4)),
      viscosity: Number(viscosity.toFixed(7)),
      waterDensity: Number(waterDensity.toFixed(8)),
      correctedRh: correctedRh > 0 ? Number(correctedRh.toFixed(4)) : '',
      tempCrctnCt: correctedRh > 0 ? Number(tempCrctnCt.toFixed(2)) : '',
      rhTotalCorrection: correctedRh > 0 ? Number(rhTotalCorrection.toFixed(2)) : '',
      effectiveDepthHe: correctedRh > 0 ? Number(effectiveDepthHe.toFixed(2)) : '',
      factorK: correctedRh > 0 ? Number(factorK.toFixed(5)) : '',
      factorKDisplay: correctedRh > 0 ? factorKDisplay : '',
      diaParticleD: correctedRh > 0 ? Number(diaParticleD.toFixed(3)) : '',
      percentageFinerN: correctedRh > 0 ? Number(percentageFinerN.toFixed(2)) : '',
      massPassed75um: correctedRh > 0 ? Number(massPassed75um.toFixed(2)) : '',
      combinedPercentageFiner: correctedRh > 0 ? Number(combinedPercentageFiner.toFixed(2)) : '',
    };
  });

  // Calculate Clay (< 0.002 mm) and Silt (0.075 mm - 0.002 mm) Fractions (Page 26)
  // Clay is the percentage finer than 0.002 mm.
  const validPoints = rows
    .filter((r) => typeof r.diaParticleD === 'number' && r.diaParticleD > 0 && typeof r.combinedPercentageFiner === 'number')
    .sort((a, b) => b.diaParticleD - a.diaParticleD); // descending particle diameter

  let clayFraction = 0;
  if (validPoints.length > 0) {
    const targetD = 0.002;
    // Find points around 0.002 mm
    const exact = validPoints.find((p) => Math.abs(p.diaParticleD - targetD) < 0.0002);
    if (exact) {
      clayFraction = exact.combinedPercentageFiner;
    } else {
      // Find pair straddling 0.002
      let pBefore = null;
      let pAfter = null;
      for (let i = 0; i < validPoints.length - 1; i++) {
        if (validPoints[i].diaParticleD >= targetD && validPoints[i + 1].diaParticleD <= targetD) {
          pBefore = validPoints[i];
          pAfter = validPoints[i + 1];
          break;
        }
      }

      if (pBefore && pAfter) {
        // Semi-log interpolation between log(D) and % finer
        const logD = Math.log10(targetD);
        const log1 = Math.log10(pBefore.diaParticleD);
        const log2 = Math.log10(pAfter.diaParticleD);
        const fraction = (logD - log1) / (log2 - log1);
        clayFraction = pBefore.combinedPercentageFiner + fraction * (pAfter.combinedPercentageFiner - pBefore.combinedPercentageFiner);
      } else if (validPoints[validPoints.length - 1].diaParticleD > targetD) {
        // All points > 0.002 mm, extrapolate or use smallest
        clayFraction = validPoints[validPoints.length - 1].combinedPercentageFiner;
      } else {
        clayFraction = validPoints[0].combinedPercentageFiner;
      }
    }
  }

  const clay = Number(Math.max(0, Math.min(numFines75, clayFraction)).toFixed(2));
  const silt = Number(Math.max(0, numFines75 - clay).toFixed(2));

  return {
    rows,
    samplePassed75um,
    sampleRetained75um,
    hasData,
    constants: {
      specificGravitySoil: numGs,
      specificGravityWater: numGw,
      drySampleWeight: numWd,
      meniscusCorrectionCm: Cm,
      dispersingAgentCorrectionCd: Cd,
      sectionalAreaJar: 28.169,
      hydrometerVolumeVh: 80,
      bulbLengthH: 17,
    },
    bifurcation: {
      silt,
      clay,
      totalFines: numFines75,
    },
  };
}

// Reference Test Data from PDF (Pages 1 & 19) for Quick-Fill & Testing
export const PDF_SAMPLE_DATA = {
  projectName: 'G&R for Survey, Design supply, Installation, Testing and Commissioning of TOWERS for Kavach & other works',
  client: 'M/s. South Western Railway',
  boreholeNo: 'BH-01',
  location: 'Torangallu Bypass',
  depth: '3.0',
  sieve: {
    totalWeight: 200,
    sieve_100: 0,
    sieve_80: 0,
    sieve_40: 0,
    sieve_20: 0,
    sieve0: 0,      // 10 mm
    sieve1: 2.39,   // 4.75 mm
    sieve2: 2.09,   // 2.36 mm
    sieve3: 4.78,   // 2.00 mm
    sieve4: 2.31,   // 1.18 mm
    sieve5: 2.02,   // 0.600 mm
    sieve6: 5.04,   // 0.425 mm
    sieve7: 3.21,   // 0.300 mm
    sieve8: 15.03,  // 0.150 mm
    sieve9: 12.66,  // 0.075 mm
    sieve10: 149.32,// Pan
  },
  hydrometer: {
    specificGravitySoil: 2.55,
    drySampleWeight: 50.0,
    testStartDate: '2026-08-03',
    testEndDate: '2026-08-06',
    testTime: '11:00 AM',
    temperature: 28,
    readings: [
      { time: 0.5, temp: 28, hmReading: 1.0115 },
      { time: 1, temp: 28, hmReading: 1.0115 },
      { time: 2, temp: 28, hmReading: 1.0115 },
      { time: 4, temp: 28, hmReading: 1.0115 },
      { time: 8, temp: 28, hmReading: 1.0110 },
      { time: 15, temp: 28, hmReading: 1.0105 },
      { time: 30, temp: 26, hmReading: 1.0100 },
      { time: 60, temp: 26, hmReading: 1.0100 },
      { time: 120, temp: 26, hmReading: 1.0090 },
      { time: 240, temp: 26, hmReading: 1.0085 },
      { time: 360, temp: 25, hmReading: 1.0080 },
      { time: 1380, temp: 25, hmReading: 1.0070 },
      { time: 1440, temp: 25, hmReading: 1.0070 },
    ],
  },
};
