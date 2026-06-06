const PAGINATION = {
  kvFirst: 10,
  kvCont: 14,
  tableFirst: 7,
  tableCont: 10,
  listFirst: 6,
  listCont: 8,
};

export const formatKey = (key) =>
  key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (s) => s.toUpperCase());

export const formatDisplayValue = (val) => {
  if (val == null || val === '') return '';
  if (Array.isArray(val)) return val.map(formatDisplayValue).filter(Boolean).join(', ');
  if (typeof val === 'object') {
    if ('key' in val && 'value' in val) {
      return val.key ? `${val.key}: ${val.value ?? ''}` : String(val.value ?? '');
    }
    if ('value' in val) return String(val.value ?? '');
    return Object.entries(val)
      .map(([k, v]) => `${formatKey(k)}: ${formatDisplayValue(v)}`)
      .filter(Boolean)
      .join('; ');
  }
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  return String(val);
};

const isNonEmpty = (v) => {
  if (v == null || v === '' || v === false) return false;
  if (Array.isArray(v)) return v.some(isNonEmpty);
  if (typeof v === 'object') return Object.values(v).some(isNonEmpty);
  return true;
};

export const rowHasData = (row) => {
  if (!row || typeof row !== 'object') return false;
  return Object.entries(row).some(([k, v]) => {
    if (k === 'useForReport' && v === false) return false;
    return isNonEmpty(v);
  });
};

const chunk = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const paginateChunks = (items, firstSize, contSize) => {
  if (!items.length) return [];
  if (items.length <= firstSize) return [items];
  const pages = [items.slice(0, firstSize)];
  let remaining = items.slice(firstSize);
  while (remaining.length) {
    pages.push(remaining.slice(0, contSize));
    remaining = remaining.slice(contSize);
  }
  return pages;
};

const filterKvRows = (rows) => (rows || []).filter((r) => r?.key?.trim() || r?.value?.trim());

export const normalizeReportData = (formData) => ({
  reportId: formData.reportId || '',
  reportCreatedOn: formData.reportCreatedOn || new Date().toISOString().split('T')[0],
  projectName: formData.projectName || formData.projectDetails || formData.projectType || '',
  projectDetails: formData.projectDetails || '',
  projectType: formData.projectType || '',
  client: formData.client || '',
  clientAddress: formData.clientAddress || '',
  siteId: formData.siteId || '',
  siteName: formData.siteName || '',
  anchorId: formData.anchorId || '',
  siteAddress: formData.siteAddress || '',
  surveyDate: formData.surveyDate || '',
  groundWaterTable: formData.groundWaterTable || '',
  latitude: formData.latitude || '',
  longitude: formData.longitude || '',
  depthOfFoundation: formData.depthOfFoundation || '',
  recommendations:
    typeof formData.recommendations === 'string'
      ? formData.recommendations.trim()
      : formatDisplayValue(formData.recommendations),
  conclusions: (formData.conclusions || [])
    .map((c) => (typeof c === 'object' && c !== null ? c.value : c))
    .filter((c) => c?.trim()),
  isCodes: filterKvRows(formData.isCodes),
  surveyReport: filterKvRows(formData.surveyReport),
  surveyReportNote: formData.includeSurveyReportNote ? formData.surveyReportNote?.trim() : '',
  boreholeLogs: formData.boreholeLogs || [],
  maxDepths: formData.maxDepths || [],
  latitudes: formData.latitudes || [],
  longitudes: formData.longitudes || [],
  methodOfBoring: formData.methodOfBoring || '',
  labTestResults: formData.labTestResults || [],
  grainSizeAnalysis: formData.grainSizeAnalysis || [],
  sbcDetails: formData.sbcDetails || [],
  subSoilProfile: formData.subSoilProfile || [],
  directShearResults: formData.directShearResults || [],
  chemicalAnalysis: formData.chemicalAnalysis || [],
  pointLoadStrength: formData.pointLoadStrength || [],
  pointLoadStrengthLump: formData.pointLoadStrengthLump || [],
  foundationRockFormations: formData.foundationRockFormations || [],
  sitePhotos: (formData.sitePhotos || []).filter(Boolean),
});

const boreholeCell = (row, col) => {
  switch (col.key) {
    case 'waterTable':
      return row.waterTable ? 'Yes' : '';
    case 'spt':
      return [row.spt1, row.spt2, row.spt3].filter(Boolean).join(' / ');
    case 'shear':
      return `C: ${row.shearParameters?.cValue || '-'} | Φ: ${row.shearParameters?.phiValue || '-'}`;
    default:
      return formatDisplayValue(row[col.key]);
  }
};

export const BOREHOLE_COLUMNS = [
  { key: 'depth', label: 'Depth (m)' },
  { key: 'natureOfSampling', label: 'Nature' },
  { key: 'soilType', label: 'Soil Type' },
  { key: 'waterTable', label: 'WT' },
  { key: 'spt', label: 'SPT' },
  { key: 'shear', label: 'Shear Params' },
  { key: 'coreLength', label: 'Core Len' },
  { key: 'coreRecovery', label: 'Recovery %' },
  { key: 'rqd', label: 'RQD %' },
  { key: 'sbc', label: 'SBC' },
];

export const LAB_COLUMNS = [
  { key: 'depth', label: 'Depth (m)' },
  { key: 'bulkDensity', label: 'Bulk Density' },
  { key: 'moistureContent', label: 'Moisture %' },
  { key: 'grainSize', label: 'Grain Size (G/S/SC)' },
  { key: 'atterberg', label: 'Atterberg (LL/PL/PI)' },
  { key: 'specificGravity', label: 'Sp. Gravity' },
  { key: 'freeSwellIndex', label: 'FSI' },
];

export const getLabCell = (row, col) => {
  switch (col.key) {
    case 'grainSize':
      return [
        row.grainSizeDistribution?.gravel,
        row.grainSizeDistribution?.sand,
        row.grainSizeDistribution?.siltAndClay,
      ]
        .filter(Boolean)
        .join(' / ');
    case 'atterberg':
      return [
        row.atterbergLimits?.liquidLimit,
        row.atterbergLimits?.plasticLimit,
        row.atterbergLimits?.plasticityIndex,
      ]
        .filter(Boolean)
        .join(' / ');
    default:
      return formatDisplayValue(row[col.key]);
  }
};

export const GRAIN_SIZE_COLUMNS = [
  { key: 'depth', label: 'Depth (m)' },
  { key: 'sieve0', label: '10mm' },
  { key: 'sieve1', label: '4.75mm' },
  { key: 'sieve2', label: '2.36mm' },
  { key: 'sieve3', label: '2mm' },
  { key: 'sieve4', label: '1.18mm' },
  { key: 'sieve5', label: '0.60mm' },
  { key: 'sieve6', label: '0.425mm' },
  { key: 'sieve7', label: '0.30mm' },
  { key: 'sieve8', label: '0.15mm' },
  { key: 'sieve9', label: '0.075mm' },
  { key: 'sieve10', label: 'Pan' },
];

export const SBC_COLUMNS = [
  { key: 'structure', label: 'Structure' },
  { key: 'chainage', label: 'Location' },
  { key: 'depthFromGL', label: 'Foundation Depth from GL' },
  { key: 'scourDepthFromGL', label: 'Scour Depth from GL' },
  { key: 'strata', label: 'Strata' },
  { key: 'fieldNValue', label: 'Field N Value' },
  { key: 'typeOfCorrection', label: 'Type of Correction' },
  { key: 'cpLayerThickness', label: 'CP Layer Thickness' },
  { key: 'liquidLimit', label: 'Liquid Limit' },
  { key: 'width', label: 'Width (m)' },
  { key: 'footingLength', label: 'Length (m)' },
  { key: 'shapeOfFooting', label: 'Shape of Footing' },
];

export const SUBSOIL_COLUMNS = [
  { key: 'depth', label: 'Depth (m)' },
  { key: 'description', label: 'Description' },
];

export const ROCK_COLUMNS = [
  { key: 'rock', label: 'Rock' },
  { key: 'strength', label: 'Strength' },
  { key: 'rqd', label: 'RQD' },
  { key: 'spacingDiscontinuity', label: 'Spacing' },
  { key: 'conditionOfDiscontinuity', label: 'Condition' },
  { key: 'gwtCondition', label: 'GWT' },
  { key: 'discontinuityOrientation', label: 'Orientation' },
  { key: 'rockGrade', label: 'Grade' },
  { key: 'inferredNetSbp', label: 'Net SBP' },
];

const flattenChemicalRows = (entries) => {
  const rows = [];
  (entries || []).forEach((entry, idx) => {
    if (!rowHasData(entry)) return;
    const base = {
      sample: `Sample ${idx + 1}`,
      phValue: entry.phValue,
      sulphates: entry.sulphates,
      chlorides: entry.chlorides,
    };
    if (rowHasData(base)) rows.push(base);
    (entry.additionalKeys || []).forEach((k) => {
      if (k?.key?.trim() || k?.value?.trim()) {
        rows.push({ sample: k.key, phValue: k.value, sulphates: '', chlorides: '' });
      }
    });
  });
  return rows;
};

const flattenDirectShearRows = (levelRows) => {
  const rows = [];
  (levelRows || []).forEach((entry) => {
    if (!rowHasData(entry)) return;
    rows.push({
      depth: entry.depthOfSample,
      shearBoxSize: entry.shearBoxSize,
      cValue: entry.cValue,
      phiValue: entry.phiValue,
      stresses: (entry.stressReadings || [])
        .filter((s) => s.normalStress || s.shearStress)
        .map((s) => `σ=${s.normalStress || '-'}, τ=${s.shearStress || '-'}`)
        .join('; '),
    });
  });
  return rows;
};

const flattenPointLoadRows = (levelRows, isLump = false) => {
  const rows = [];
  (levelRows || []).forEach((entry) => {
    (entry.readings || []).forEach((reading) => {
      const row = {
        depth: entry.depth,
        loadAtFailure: reading.loadAtFailure,
        d50: reading.d50,
        d: reading.d,
        ucs: reading.ucs,
        ...(isLump ? { w: reading.w } : {}),
      };
      if (rowHasData(row)) rows.push(row);
    });
  });
  return rows;
};

const addTableSectionPages = (pages, title, columns, rows, getCell) => {
  const filtered = rows.filter(rowHasData);
  if (!filtered.length) return;
  const chunks = paginateChunks(filtered, PAGINATION.tableFirst, PAGINATION.tableCont);
  chunks.forEach((chunkRows, i) => {
    pages.push({
      isFirstPage: false,
      isContinuation: i > 0,
      sectionTitle: i === 0 ? title : `${title} (Continued)`,
      blocks: [
        {
          type: 'data-table',
          title: i === 0 ? title : `${title} (Continued)`,
          columns,
          rows: chunkRows,
          getCell,
        },
      ],
    });
  });
};

const addKvSectionPages = (pages, title, rows) => {
  const filtered = filterKvRows(rows);
  if (!filtered.length) return;
  const chunks = paginateChunks(filtered, PAGINATION.kvFirst, PAGINATION.kvCont);
  chunks.forEach((chunkRows, i) => {
    pages.push({
      isFirstPage: false,
      isContinuation: i > 0,
      sectionTitle: i === 0 ? title : `${title} (Continued)`,
      blocks: [
        { type: 'kv-table', title: i === 0 ? title : `${title} (Continued)`, rows: chunkRows },
      ],
    });
  });
};

const addListSectionPages = (pages, title, items) => {
  if (!items.length) return;
  const chunks = paginateChunks(items, PAGINATION.listFirst, PAGINATION.listCont);
  chunks.forEach((chunkItems, i) => {
    pages.push({
      isFirstPage: false,
      isContinuation: i > 0,
      sectionTitle: i === 0 ? title : `${title} (Continued)`,
      blocks: [
        {
          type: 'list',
          title: i === 0 ? title : `${title} (Continued)`,
          items: chunkItems,
        },
      ],
    });
  });
};

const addTextBlockPage = (pages, title, content) => {
  if (!content?.trim()) return;
  pages.push({
    isFirstPage: false,
    isContinuation: false,
    sectionTitle: title,
    blocks: [{ type: 'text', title, content }],
  });
};

/**
 * Compute SBC summary rows from sbcDetails input data.
 *
 * For each entry the following are calculated:
 *   1. Corrected N (N_corr) — field N capped at 50, then overburden / dilatancy
 *      corrections applied per IS:2131 / IS:6403.
 *   2. SBC – Shear Criteria (kN/m²) — Terzaghi's general bearing capacity with
 *      Meyerhof's N-factors derived from φ estimated via Peck's correlation,
 *      FOS = 3.
 *   3. Allowable BC for 25 mm settlement (kN/m²) — IS:8009 / Teng's formula.
 *   4. Recommended SBC = min(shear, settlement).
 *
 * Assumptions:
 *   γ (unit weight of soil) = 18 kN/m³
 *   c (cohesion) = 0 (granular soil, SPT-based)
 *   Groundwater table assumed deep (no GWT correction applied here).
 */
export const computeSbcSummaryRows = (sbcDetails, boreholeLogs) => {
  const GAMMA = 18; // kN/m³ — unit weight of soil
  const FOS = 3; // factor of safety for shear
  const S_ALLOW = 25; // mm — allowable settlement

  // Meyerhof bearing capacity factors from φ (degrees)
  const bearingFactors = (phi_deg) => {
    const phi = (phi_deg * Math.PI) / 180;
    const Nq = Math.exp(Math.PI * Math.tan(phi)) * Math.pow(Math.tan(Math.PI / 4 + phi / 2), 2);
    const Nc = phi_deg > 0 ? (Nq - 1) / Math.tan(phi) : 5.14;
    const Ng = 2 * (Nq + 1) * Math.tan(phi);
    return { Nc, Nq, Ng };
  };

  // Peck's correlation: φ from corrected N (IS:6403)
  const phiFromN = (N) => {
    if (N <= 0) return 0;
    if (N <= 4) return 26;
    if (N <= 10) return 28 + ((N - 4) * (30 - 28)) / 6;
    if (N <= 30) return 30 + ((N - 10) * (40 - 30)) / 20;
    if (N <= 50) return 40 + ((N - 30) * (45 - 40)) / 20;
    return 45;
  };

  // Shape factors (Meyerhof) for different footing shapes
  const shapeFactors = (shape, B, L, Nq, Nc) => {
    const r = B / (L || B); // B/L ratio (≤1)
    switch ((shape || '').toLowerCase()) {
      case 'square':
        return { sc: 1 + 0.2 * r, sq: 1 + 0.1 * r, sg: 1 - 0.4 * r };
      case 'circle':
        return { sc: 1.3, sq: 1.2, sg: 0.6 };
      case 'continous strip':
      case 'strip':
        return { sc: 1.0, sq: 1.0, sg: 1.0 };
      case 'rectangle':
      default:
        return { sc: 1 + 0.2 * r, sq: 1 + 0.1 * r, sg: 1 - 0.4 * r };
    }
  };

  const rows = [];
  let sNo = 1;

  (sbcDetails || []).forEach((levelRows, bhIdx) => {
    const bhLabel = `BH-${String(bhIdx + 1).padStart(2, '0')}`;

    (levelRows || []).filter(rowHasData).forEach((entry) => {
      const rawN = parseFloat(entry.fieldNValue) || 0;
      const Df = parseFloat(entry.depthFromGL) || 0;
      const scourDf = parseFloat(entry.scourDepthFromGL) || 0;
      const B = parseFloat(entry.width) || 1.5;
      const L = parseFloat(entry.footingLength) || B;
      const LL = parseFloat(entry.liquidLimit) || 0;
      const cpThick = parseFloat(entry.cpLayerThickness) || 0;
      const correction = entry.typeOfCorrection || 'No Correction';
      const shape = entry.shapeOfFooting || 'Rectangle';

      // Effective depth = Df + scour depth
      const Df_eff = Df + scourDf;

      // Step 1 — cap N at 50
      let N = Math.min(rawN, 50);

      // Step 2 — overburden correction (CN factor, IS:2131)
      // CN = 0.77 * log10(2000 / σ'v), σ'v = γ * Df (kPa)
      const applyOverburden =
        correction === 'Over burden Correction' || correction === 'Both Corrections';
      const applyDilatancy =
        correction === 'Dilatancy Correction' || correction === 'Both Corrections';

      if (applyOverburden && Df_eff > 0) {
        const sigma_v = GAMMA * Df_eff; // kPa
        const CN = Math.min(0.77 * Math.log10(2000 / Math.max(sigma_v, 1)), 2.0);
        N = Math.min(Math.round(CN * N), 50);
      }

      // Step 3 — dilatancy correction (IS:2131 clause 4.6.2)
      // For N > 15 in fine saturated sand: N' = 15 + 0.5*(N-15)
      if (applyDilatancy && N > 15) {
        N = Math.round(15 + 0.5 * (N - 15));
      }

      const N_corr = Math.max(N, 1);

      // Step 4 — φ from corrected N
      const phi = phiFromN(N_corr);
      const { Nc, Nq, Ng } = bearingFactors(phi);
      const { sc, sq, sg } = shapeFactors(shape, B, L, Nq, Nc);

      // Step 5 — SBC (shear criteria), Terzaghi general bearing capacity
      // q_ult = c·Nc·sc + γ·Df·Nq·sq + 0.5·γ·B·Nγ·sg  (c=0 for SPT-based)
      const q_ult = GAMMA * Df_eff * Nq * sq + 0.5 * GAMMA * B * Ng * sg;
      const sbc_shear = Math.round(q_ult / FOS);

      // Step 6 — Allowable BC for 25 mm settlement (Teng's formula, IS:8009)
      // qa = 1.4 * N_corr² * B² / (B + 0.3)² * Fd  (kN/m²) for S=25mm
      // Fd = depth factor = 1 + Df/(3B) ≤ 2
      const Fd = Math.min(1 + Df_eff / (3 * B), 2.0);
      const qa_settlement = Math.round(
        ((1.4 * N_corr * N_corr * (B * B)) / Math.pow(B + 0.3, 2)) * Fd
      );

      // Step 7 — Recommended SBC
      const recommended = Math.min(sbc_shear, qa_settlement);

      rows.push({
        sNo: sNo++,
        structure: entry.structure || '-',
        chainage: entry.chainage || '-',
        bhLabel,
        depthFromGL: Df > 0 ? Df.toFixed(1) : '-',
        scourDepthFromGL: scourDf > 0 ? scourDf.toFixed(1) : '-',
        strata: entry.strata || '-',
        nCorr: `N=${N_corr}`,
        sbcShear: sbc_shear,
        qaSettlement: qa_settlement,
        recommended,
        width: B,
        footingLength: L,
        shapeOfFooting: shape,
        typeOfCorrection: correction,
      });
    });
  });

  return rows;
};

/**
 * Build paginated A4 pages for the geotechnical report preview.
 */
export const buildReportPages = (formData) => {
  const data = normalizeReportData(formData);
  const pages = [];

  const firstBlocks = [{ type: 'project-details', data }];
  const isCodeChunks = paginateChunks(data.isCodes, PAGINATION.kvFirst, PAGINATION.kvCont);

  pages.push({
    isFirstPage: true,
    isContinuation: false,
    sectionTitle: null,
    blocks: firstBlocks,
  });

  // IS Codes on its own page(s), immediately after the cover/project-details page
  for (let i = 0; i < isCodeChunks.length; i++) {
    pages.push({
      isFirstPage: false,
      isContinuation: i > 0,
      sectionTitle: i === 0 ? 'IS Codes' : 'IS Codes (Continued)',
      blocks: [
        {
          type: 'kv-table',
          title: i === 0 ? 'IS Codes' : 'IS Codes (Continued)',
          rows: isCodeChunks[i],
        },
      ],
    });
  }

  pages.push({
    isFirstPage: false,
    isContinuation: false,
    sectionTitle: 'Geotechnical Exploration',
    blocks: [{ type: 'geotechnical-exploration', data }],
  });

  // One Sub-Soil Profile page per borehole (before Bore Log Data Sheets)
  data.boreholeLogs.forEach((levelLogs, i) => {
    pages.push({
      isFirstPage: false,
      isContinuation: false,
      sectionTitle: `Sub-Soil Profile – BH-${String(i + 1).padStart(2, '0')}`,
      blocks: [
        {
          type: 'sub-profile-analysis',
          boreholeIndex: i,
          boreholeNumber: i + 1,
          logs: levelLogs,
          location: data.siteAddress || data.siteName || '',
          methodOfBoring: data.methodOfBoring || '',
        },
      ],
    });
  });

  // One Bore Log Data Sheet page per borehole
  data.boreholeLogs.forEach((levelLogs, i) => {
    pages.push({
      isFirstPage: false,
      isContinuation: false,
      sectionTitle: `Bore Log Data Sheet – BH-${String(i + 1).padStart(2, '0')}`,
      blocks: [
        {
          type: 'borehole-log-sheet',
          boreholeIndex: i,
          boreholeNumber: i + 1,
          logs: levelLogs,
          maxDepth: data.maxDepths?.[i] ?? '',
          latitude: data.latitudes?.[i] ?? '',
          longitude: data.longitudes?.[i] ?? '',
          surveyDate: data.surveyDate || '',
          projectName: data.projectName || data.projectDetails || '',
          location: data.siteAddress || data.siteName || '',
          methodOfBoring: data.methodOfBoring || '',
        },
      ],
    });
  });

  addKvSectionPages(pages, 'Survey Report', data.surveyReport);
  if (data.surveyReportNote) {
    addTextBlockPage(pages, 'Survey Report Note', data.surveyReportNote);
  }

  pages.push({
    isFirstPage: false,
    isContinuation: false,
    sectionTitle: 'Particle Size Distribution Curve',
    blocks: [{ type: 'particle-size-distribution-curve', data }],
  });

  // Topographic 3D Surface Plot — only when there are ≥2 boreholes with depth data
  const boreholeDepthMatrix = (data.boreholeLogs || []).map((logs) =>
    (logs || []).map((row) => parseFloat(row.toDepth || row.depth)).filter((d) => !isNaN(d))
  );
  let hasEnoughData = boreholeDepthMatrix.some((depths) => depths.length > 0);
  hasEnoughData = false; // temporary. Add it back later if needed
  if (hasEnoughData) {
    pages.push({
      isFirstPage: false,
      isContinuation: false,
      sectionTitle: 'Topographic 3D Surface Plot',
      blocks: [
        {
          type: 'topographic-3d-surface',
          data: {
            boreholeLogs: data.boreholeLogs,
            maxDepths: data.maxDepths,
            latitudes: data.latitudes,
            longitudes: data.longitudes,
            projectName: data.projectName || data.projectDetails || '',
          },
        },
      ],
    });
  }

  // SBC Summary page — computed from sbcDetails input
  const sbcSummaryRows = computeSbcSummaryRows(data.sbcDetails, data.boreholeLogs);
  if (sbcSummaryRows.length > 0) {
    pages.push({
      isFirstPage: false,
      isContinuation: false,
      sectionTitle: 'Summary of Safe Bearing Capacity',
      blocks: [
        {
          type: 'sbc-summary',
          rows: sbcSummaryRows,
          sbcDetails: data.sbcDetails,
          projectName: data.projectName || data.projectDetails || '',
          siteAddress: data.siteAddress || data.siteName || '',
        },
      ],
    });
  }

  data.directShearResults.forEach((levelRows, i) => {
    addTableSectionPages(
      pages,
      data.directShearResults.length > 1
        ? `Direct Shear – Level ${i + 1}`
        : 'Direct Shear Test Results',
      [
        { key: 'depth', label: 'Depth' },
        { key: 'shearBoxSize', label: 'Box Size' },
        { key: 'cValue', label: 'C' },
        { key: 'phiValue', label: 'Φ' },
        { key: 'stresses', label: 'Stress Readings' },
      ],
      flattenDirectShearRows(levelRows),
      (row, col) => formatDisplayValue(row[col.key])
    );
  });

  const chemRows = flattenChemicalRows(data.chemicalAnalysis);
  if (chemRows.length) {
    addTableSectionPages(
      pages,
      'Chemical Analysis',
      [
        { key: 'sample', label: 'Parameter' },
        { key: 'phValue', label: 'Value / pH' },
        { key: 'sulphates', label: 'Sulphates' },
        { key: 'chlorides', label: 'Chlorides' },
      ],
      chemRows,
      (row, col) => formatDisplayValue(row[col.key])
    );
  }

  data.pointLoadStrength.forEach((levelRows, i) => {
    addTableSectionPages(
      pages,
      data.pointLoadStrength.length > 1
        ? `Point Load Strength – Level ${i + 1}`
        : 'Point Load Strength',
      [
        { key: 'depth', label: 'Depth' },
        { key: 'loadAtFailure', label: 'Load' },
        { key: 'd50', label: 'D50' },
        { key: 'd', label: 'D' },
        { key: 'ucs', label: 'UCS' },
      ],
      flattenPointLoadRows(levelRows),
      (row, col) => formatDisplayValue(row[col.key])
    );
  });

  data.pointLoadStrengthLump.forEach((levelRows, i) => {
    addTableSectionPages(
      pages,
      data.pointLoadStrengthLump.length > 1
        ? `Point Load (Lump) – Level ${i + 1}`
        : 'Point Load Strength (Lump)',
      [
        { key: 'depth', label: 'Depth' },
        { key: 'loadAtFailure', label: 'Load' },
        { key: 'd50', label: 'D50' },
        { key: 'd', label: 'D' },
        { key: 'w', label: 'W' },
        { key: 'ucs', label: 'UCS' },
      ],
      flattenPointLoadRows(levelRows, true),
      (row, col) => formatDisplayValue(row[col.key])
    );
  });

  (data.foundationRockFormations || []).forEach((formation, i) => {
    const rows = formation?.rows || formation;
    if (Array.isArray(rows) && rows.length) {
      addTableSectionPages(
        pages,
        data.foundationRockFormations.length > 1
          ? `Foundation Rock – Set ${i + 1}`
          : 'Foundation Rock Formations',
        ROCK_COLUMNS,
        rows,
        (row, col) => formatDisplayValue(row[col.key])
      );
    }
  });

  if (data.depthOfFoundation) {
    addTextBlockPage(pages, 'Depth of Foundation', data.depthOfFoundation);
  }

  addListSectionPages(pages, 'Conclusions', data.conclusions);
  if (data.recommendations) {
    addTextBlockPage(pages, 'Recommendations / Comments', data.recommendations);
  }

  if (data.sitePhotos.length) {
    const photoChunks = chunk(data.sitePhotos, 4);
    photoChunks.forEach((photos, i) => {
      pages.push({
        isFirstPage: false,
        isContinuation: i > 0,
        sectionTitle: i === 0 ? 'Site Photos' : 'Site Photos (Continued)',
        blocks: [
          {
            type: 'photos',
            title: i === 0 ? 'Site Photos' : 'Site Photos (Continued)',
            photos,
          },
        ],
      });
    });
  }

  if (pages.length === 0) {
    pages.push({
      isFirstPage: true,
      isContinuation: false,
      sectionTitle: null,
      blocks: [{ type: 'project-details', data }],
    });
  }

  return pages.map((page, index) => ({
    ...page,
    pageNumber: index + 1,
    totalPages: pages.length,
  }));
};
