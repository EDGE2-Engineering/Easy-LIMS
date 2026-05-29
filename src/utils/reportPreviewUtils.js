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

const filterKvRows = (rows) =>
  (rows || []).filter((r) => r?.key?.trim() || r?.value?.trim());

export const normalizeReportData = (formData) => ({
  reportId: formData.reportId || '',
  reportCreatedOn: formData.reportCreatedOn || new Date().toISOString().split('T')[0],
  projectName:
    formData.projectName ||
    formData.projectDetails ||
    formData.projectType ||
    '',
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
  surveyReportNote: formData.includeSurveyReportNote
    ? formData.surveyReportNote?.trim()
    : '',
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
  { key: 'depth',   label: 'Depth (m)' },
  { key: 'sieve0',  label: '10mm'      },
  { key: 'sieve1',  label: '4.75mm'    },
  { key: 'sieve2',  label: '2.36mm'    },
  { key: 'sieve3', label: '2mm'       },
  { key: 'sieve4',  label: '1.18mm'    },
  { key: 'sieve5',  label: '0.60mm'    },
  { key: 'sieve6',  label: '0.425mm'   },
  { key: 'sieve7',  label: '0.30mm'    },
  { key: 'sieve8',  label: '0.15mm'    },
  { key: 'sieve9',  label: '0.075mm'   },
  { key: 'sieve10',  label: 'Pan'       },
];

export const SBC_COLUMNS = [
  { key: 'depth', label: 'Depth (m)' },
  { key: 'footingDimension', label: 'Footing Dim.' },
  { key: 'sbcValue', label: 'SBC Value' },
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
  const chunks = paginateChunks(
    filtered,
    PAGINATION.tableFirst,
    PAGINATION.tableCont
  );
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
      blocks: [{ type: 'kv-table', title: i === 0 ? title : `${title} (Continued)`, rows: chunkRows }],
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
 * Build paginated A4 pages for the geotechnical report preview.
 */
export const buildReportPages = (formData) => {
  const data = normalizeReportData(formData);
  const pages = [];

  const firstBlocks = [{ type: 'project-details', data }];
  const isCodeChunks = paginateChunks(data.isCodes, PAGINATION.kvFirst, PAGINATION.kvCont);

  if (isCodeChunks.length) {
    firstBlocks.push({
      type: 'kv-table',
      title: 'IS Codes',
      rows: isCodeChunks[0],
    });
  }

  pages.push({
    isFirstPage: true,
    isContinuation: false,
    sectionTitle: null,
    blocks: firstBlocks,
  });

  for (let i = 1; i < isCodeChunks.length; i++) {
    pages.push({
      isFirstPage: false,
      isContinuation: true,
      sectionTitle: 'IS Codes (Continued)',
      blocks: [
        { type: 'kv-table', title: 'IS Codes (Continued)', rows: isCodeChunks[i] },
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
      blocks: [{
        type: 'sub-profile-analysis',
        boreholeIndex: i,
        boreholeNumber: i + 1,
        logs: levelLogs,
        location: data.siteAddress || data.siteName || '',
        methodOfBoring: data.methodOfBoring || '',
      }],
    });
  });

  // One Bore Log Data Sheet page per borehole
  data.boreholeLogs.forEach((levelLogs, i) => {
    pages.push({
      isFirstPage: false,
      isContinuation: false,
      sectionTitle: `Bore Log Data Sheet – BH-${String(i + 1).padStart(2, '0')}`,
      blocks: [{
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
      }],
    });
  });

  addKvSectionPages(pages, 'Survey Report', data.surveyReport);
  if (data.surveyReportNote) {
    addTextBlockPage(pages, 'Survey Report Note', data.surveyReportNote);
  }

  data.boreholeLogs.forEach((levelLogs, i) => {
    addTableSectionPages(
      pages,
      data.boreholeLogs.length > 1 ? `Borehole Log – Level ${i + 1}` : 'Borehole Log',
      BOREHOLE_COLUMNS,
      levelLogs,
      boreholeCell
    );
  });
  data.labTestResults.forEach((levelRows, i) => {
    addTableSectionPages(
      pages,
      data.labTestResults.length > 1
        ? `Laboratory Test Results – Level ${i + 1}`
        : 'Laboratory Test Results',
      LAB_COLUMNS,
      levelRows,
      getLabCell
    );
  });

  data.grainSizeAnalysis.forEach((levelRows, i) => {
    addTableSectionPages(
      pages,
      data.grainSizeAnalysis.length > 1
        ? `Grain Size Analysis – Level ${i + 1}`
        : 'Grain Size Analysis',
      GRAIN_SIZE_COLUMNS,
      levelRows,
      (row, col) => formatDisplayValue(row[col.key])
    );
  });

  pages.push({
    isFirstPage: false,
    isContinuation: false,
    sectionTitle: 'Particle Size Distribution Curve',
    blocks: [{ type: 'particle-size-distribution-curve', data }],
  });

  // Topographic 3D Surface Plot — only when there are ≥2 boreholes with depth data
  const boreholeDepthMatrix = (data.boreholeLogs || []).map((logs) =>
    (logs || []).map((row) => parseFloat(row.depth)).filter((d) => !isNaN(d))
  );
  const hasEnoughData = boreholeDepthMatrix.some((depths) => depths.length > 0);
  if (hasEnoughData) {
    pages.push({
      isFirstPage: false,
      isContinuation: false,
      sectionTitle: 'Topographic 3D Surface Plot',
      blocks: [{
        type: 'topographic-3d-surface',
        data: {
          boreholeLogs: data.boreholeLogs,
          maxDepths: data.maxDepths,
          latitudes: data.latitudes,
          longitudes: data.longitudes,
          projectName: data.projectName || data.projectDetails || '',
        },
      }],
    });
  }

  data.sbcDetails.forEach((levelRows, i) => {
    const filtered = levelRows.filter(
      (r) => rowHasData(r) && (r.useForReport !== false)
    );
    addTableSectionPages(
      pages,
      data.sbcDetails.length > 1 ? `SBC Details – Level ${i + 1}` : 'SBC Details',
      SBC_COLUMNS,
      filtered,
      (row, col) => formatDisplayValue(row[col.key])
    );
  });

  data.subSoilProfile.forEach((levelRows, i) => {
    addTableSectionPages(
      pages,
      data.subSoilProfile.length > 1
        ? `Sub Soil Profile – Level ${i + 1}`
        : 'Sub Soil Profile',
      SUBSOIL_COLUMNS,
      levelRows,
      (row, col) => formatDisplayValue(row[col.key])
    );
  });
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
