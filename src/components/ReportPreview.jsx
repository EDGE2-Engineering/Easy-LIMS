import React, {
  forwardRef,
  useRef,
  useImperativeHandle,
  useMemo,
  useEffect,
} from 'react';
import { createPortal } from 'react-dom';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { X, Printer } from 'lucide-react';
import { buildReportPages, formatDisplayValue, formatKey } from '@/utils/reportPreviewUtils';
import { A4_PRINT_PAGE_STYLE } from '@/utils/a4PrintStyles';
import './ReportPreview.css';

const COMPANY_NAME = 'EDGE2 Engineering Solutions India Pvt. Ltd.';
const LOGO_SRC = `${import.meta.env.BASE_URL}edge2-logo.png`;

const ReportWatermark = () => (
  <div
    className="absolute inset-0 flex items-center justify-center pointer-events-none"
    style={{ transform: 'rotate(-55deg)', zIndex: 0 }}
  >
    <span
      style={{
        fontSize: '42pt',
        fontWeight: 700,
        color: 'rgba(0,0,0,0.02)',
        whiteSpace: 'nowrap',
      }}
    >
      {COMPANY_NAME}
    </span>
  </div>
);

const ReportFullHeader = ({ reportId, reportDate }) => (
  <div className="flex justify-between items-start gap-2 border-b border-gray-200 pb-4 mb-2 min-w-0 max-w-full overflow-hidden">
    <div className="w-[30%] min-w-0 shrink">
      <h3 className="text-lg font-bold text-gray-900 tracking-tight">
        GEOTECHNICAL REPORT
      </h3>
      <p className="text-gray-500 mt-1 text-xs break-all">
        {reportId ? `#${reportId}` : <span className="text-red-500 italic">Pending</span>}
      </p>
      <p className="text-gray-500 mt-1 text-xs">
        Date:{' '}
        {reportDate
          ? format(new Date(reportDate), 'dd MMM yyyy')
          : format(new Date(), 'dd MMM yyyy')}
      </p>
    </div>
    <div className="w-[70%] min-w-0 shrink flex items-center gap-2 text-right">
      <div className="text-right min-w-0 flex-1">
        <h2 className="font-bold text-lg text-gray-900">{COMPANY_NAME}</h2>
        <p className="text-gray-600 text-xs">
          Shivaganga Arcade, B35/130, 6th Cross, 6th Block,
        </p>
        <p className="text-gray-600 text-xs">
          Vishweshwaraiah Layout, Ullal Upanagar,
        </p>
        <p className="text-gray-600 text-xs">Bangalore - 560056, Karnataka</p>
        <p className="text-gray-600 text-xs">
          <span className="font-bold">PAN:</span> AACCE1702A,{' '}
          <span className="font-bold">GSTIN:</span> 29AACCE1702A1ZD
        </p>
        <p className="text-gray-600 text-xs">
          <span className="font-bold">Phone:</span> 09448377127 / 09880973810 / 080-50056086
        </p>
        <p className="text-gray-600 text-xs flex justify-end gap-4">
          <span>
            <span className="font-bold">Email:</span> info@edge2.in
          </span>
          <span>
            <span className="font-bold">Website:</span> https://edge2.in
          </span>
        </p>
      </div>
      <img src={LOGO_SRC} alt="EDGE2 Logo" className="w-16 h-16 object-contain flex-shrink-0" />
    </div>
  </div>
);

const ReportContinuedHeader = ({ title }) => (
  <div className="border-b border-gray-200 pb-2 mb-3">
    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
      Geotechnical Report — {title}
    </h3>
  </div>
);

const Edge2Stamp = () => (
  <div className="absolute bottom-4 right-4 pointer-events-none opacity-80" style={{ transform: 'rotate(-5deg)', zIndex: 10 }}>
    <svg width="100" height="100" viewBox="0 0 100 100" className="text-blue-700/80">
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3 1" />
      <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path id="stamp-text-path-1" d="M 12 50 A 38 38 0 0 1 88 50" fill="none" />
      <path id="stamp-text-path-2" d="M 88 50 A 38 38 0 0 1 12 50" fill="none" />
      
      <text fontFamily="monospace" fontSize="6.5" fontWeight="bold" fill="currentColor">
        <textPath href="#stamp-text-path-1" startOffset="50%" textAnchor="middle">
          EDGE2 ENGINEERING SOLUTIONS
        </textPath>
      </text>
      <text fontFamily="monospace" fontSize="6.5" fontWeight="bold" fill="currentColor">
        <textPath href="#stamp-text-path-2" startOffset="50%" textAnchor="middle">
          INDIA PRIVATE LIMITED
        </textPath>
      </text>
      
      <circle cx="50" cy="50" r="2" fill="currentColor" />
      <text x="50" y="47" fontFamily="monospace" fontSize="6" fontWeight="bold" textAnchor="middle" fill="currentColor">
        BANGALORE
      </text>
      <text x="50" y="57" fontFamily="monospace" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="currentColor">
        560056
      </text>
    </svg>
  </div>
);

const ContentPageHeader = () => (
  <div
    className="content-page-header"
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
      borderBottom: "2px solid #1e3a8a",
      paddingTop: "16px",
      paddingBottom: "8px",
      marginBottom: "16px",
      width: "100%",
      marginTop: "-15px",
      position: "relative",
      zIndex: 20,
    }}
  >
    <img
      src={LOGO_SRC}
      alt="EDGE2 Logo"
      // width={72}
      height={20}
      style={{
        // width: "72px",
        height: "20px",
        // minWidth: "72px",
        // maxWidth: "72px",
        // minHeight: "20px",
        // maxHeight: "20px",
        objectFit: "contain",
        display: "block",
      }}
    />

    <h3
      style={{
        fontSize: "14px",
        fontWeight: 900,
        letterSpacing: "1px",
        textTransform: "uppercase",
        color: "#172554",
        margin: 0,
      }}
    >
      Edge2 Engineering Solutions India Private Limited
    </h3>
  </div>
);

const ProjectDetailsBlock = ({ data }) => {
  const safeFormatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return format(d, 'dd-MM-yy');
    } catch (e) {
      return dateStr;
    }
  };

  const getBoreholeMaxDepth = (bh, idx) => {
    console.log(data)
    return data.maxDepths?.[idx] ?? '-';
  };

  const numBoreholes = data.boreholeLogs?.length || 1;

  return (
    <div className="relative pb-24 text-left">
      {/* 1.0 INTRODUCTION */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-2">
          1.0 INTRODUCTION
        </h3>
        <p className="text-xs text-gray-800 leading-relaxed text-justify">
          M/s. <strong className="text-gray-900">{data.client || 'Client Name'}</strong> entrusted Geotechnical investigation work to M/s. <strong className="text-gray-900">Edge2 Engineering Solutions India Private Limited</strong> for the proposed Geotechnical Investigation for &ldquo;<strong className="text-gray-900">{data.projectName || data.projectDetails || 'Proposed Construction'}</strong>&rdquo; at the site <strong className="text-gray-900">{data.siteAddress || data.location || 'Site Location'}</strong>. The purpose of this investigation is to determine the surface conditions, subsurface conditions, groundwater table levels and collect representative soil/rock and water samples for testing of physical and mechanical properties. Based on this field and laboratory test results, the properties of soil available at site are concluded. This report includes all relevant field and laboratory test data, as well as the conclusions derived from their analysis.
        </p>
      </div>

      {/* 2.0 SITE DETAILS */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-2">
          2.0 SITE DETAILS
        </h3>
        <p className="text-xs text-gray-800 leading-relaxed mb-3">
          The site information observed during the investigation are summarized below for reference.
        </p>
        <h4 className="text-xs font-bold text-blue-800 mb-2">
          2.1 Details of Boreholes:
        </h4>
        
        <table className="w-full text-[10px] border-collapse border border-gray-400 text-center">
          <thead>
            <tr className="bg-[#fcf8f2] border-b border-gray-400">
              <th className="border border-gray-400 px-1 py-1.5 font-bold text-gray-900 align-middle w-[5%]" rowSpan="2">S. No</th>
              <th className="border border-gray-400 px-1 py-1.5 font-bold text-gray-900 align-middle w-[10%]" rowSpan="2">Borehole No.</th>
              <th className="border border-gray-400 px-1 py-1.5 font-bold text-gray-900 align-middle w-[25%]" rowSpan="2">Type of Structure/ Location</th>
              <th className="border border-gray-400 px-1 py-1.5 font-bold text-gray-900 align-middle w-[12%]" rowSpan="2">*Ground R.L (m)</th>
              <th className="border border-gray-400 px-1 py-1.5 font-bold text-gray-900 align-middle w-[15%]" rowSpan="2">Max. Depth of Exploration (m)</th>
              <th className="border border-gray-400 px-1 py-1.5 font-bold text-gray-900 w-[20%]" colSpan="2">Co-ordinates</th>
              <th className="border border-gray-400 px-1 py-1.5 font-bold text-gray-900 align-middle w-[10%]" rowSpan="2">Start Date</th>
              <th className="border border-gray-400 px-1 py-1.5 font-bold text-gray-900 align-middle w-[10%]" rowSpan="2">Completion Date</th>
            </tr>
            <tr className="bg-[#fcf8f2] border-b border-gray-400">
              <th className="border border-gray-400 px-1 py-1 font-bold text-gray-900">Latitude (°)</th>
              <th className="border border-gray-400 px-1 py-1 font-bold text-gray-900">Longitude (°)</th>
            </tr>
          </thead>
          <tbody>
            {(data.boreholeLogs || []).map((bh, idx) => (
              <tr key={idx} className="border-b border-gray-300">
                <td className="border border-gray-400 px-1 py-1 text-gray-800">{idx + 1}</td>
                <td className="border border-gray-400 px-1 py-1 font-semibold text-gray-900">
                  BH-{String(idx + 1).padStart(2, '0')}
                </td>
                {idx === 0 ? (
                  <td className="border border-gray-400 px-2 py-1 text-gray-800 text-xs align-middle" rowSpan={numBoreholes}>
                    {data.projectName || data.projectDetails || 'Project Site'}
                  </td>
                ) : null}
                <td className="border border-gray-400 px-1 py-1 text-gray-800">100.0</td>
                <td className="border border-gray-400 px-1 py-1 text-gray-800">{getBoreholeMaxDepth(bh, idx)}</td>
                <td className="border border-gray-400 px-1 py-1 text-gray-800">{data.latitude || '-'}</td>
                <td className="border border-gray-400 px-1 py-1 text-gray-800">{data.longitude || '-'}</td>
                <td className="border border-gray-400 px-1 py-1 text-gray-800">{safeFormatDate(data.surveyDate)}</td>
                <td className="border border-gray-400 px-1 py-1 text-gray-800">{safeFormatDate(data.surveyDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[9px] text-gray-500 mt-1 italic">*Ground R.L values are assumed as 100.000m</p>
      </div>

      {/* 3.0 SCOPE OF PRESENT WORK */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-2">
          3.0 SCOPE OF PRESENT WORK
        </h3>
        <p className="text-xs text-gray-800 leading-relaxed mb-2">
          As per client requirement, {numBoreholes} No's of boreholes were proposed for soil investigation.
        </p>
        <p className="text-xs text-gray-800 leading-relaxed mb-2">
          To achieve the above objectives, the scope includes the following:
        </p>
        <ul className="list-disc list-inside space-y-1.5 text-xs text-gray-800 pl-2">
          <li className="leading-relaxed pl-1">
            Mobilization of equipment to site and demobilization of the same on completion of work.
          </li>
          <li className="leading-relaxed pl-1">
            Drilling {numBoreholes} no. of boreholes as per client requirement.
          </li>
          <li className="leading-relaxed pl-1">
            Conducting standard penetration test at 1.0/1.5 m depth intervals.
          </li>
          <li className="leading-relaxed pl-1">
            Collecting disturbed and undisturbed soil samples wherever possible.
          </li>
          <li className="leading-relaxed pl-1">
            Observation of the water table, location coordinates.
          </li>
          <li className="leading-relaxed pl-1">
            To ascertain the sub-soil strata and ground topography.
          </li>
          <li className="leading-relaxed pl-1">
            Carry out laboratory testing on collected samples.
          </li>
          <li className="leading-relaxed pl-1">
            To arrive at safe bearing capacity.
          </li>
          <li className="leading-relaxed pl-1">
            To recommend any risks mitigations for foundation system.
          </li>
        </ul>
      </div>

      <Edge2Stamp />
    </div>
  );
};

const GeotechnicalExplorationBlock = ({ data }) => {
  const numBoreholes = data.boreholeLogs?.length || 0;
  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-2">
        4.0 GEOTECHNICAL EXPLORATION
      </h3>
    </div>
  );
};

const KvTableBlock = ({ title, rows }) => (
  <div className="mb-4 hidden">
    <h3 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-1 mb-2">
      {title}
    </h3>
    <table className="w-full text-xs border-collapse border border-gray-200">
      <thead className="bg-gray-100">
        <tr>
          <th className="border border-gray-200 px-2 py-1.5 text-left w-[40%]">Parameter</th>
          <th className="border border-gray-200 px-2 py-1.5 text-left">Details</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-gray-100">
            <td className="border border-gray-200 px-2 py-1.5 font-medium text-gray-800 align-top">
              {row.key}
            </td>
            <td className="border border-gray-200 px-2 py-1.5 text-gray-700 align-top whitespace-pre-wrap break-words">
              {row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const DataTableBlock = ({ title, columns, rows, getCell }) => (
  <div className="mb-4">
    <h3 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-1 mb-2">
      {title}
    </h3>
    <table className="w-full text-[10px] border-collapse border border-gray-200 table-fixed">
      <thead className="bg-gray-100">
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              className="border border-gray-200 px-1 py-1 text-left font-semibold uppercase break-words"
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri}>
            {columns.map((col) => (
              <td
                key={col.key}
                className="border border-gray-200 px-1 py-1 text-gray-800 align-top break-words"
              >
                {getCell ? getCell(row, col) : formatDisplayValue(row[col.key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const TextBlock = ({ title, content }) => (
  <div className="mb-4">
    <h3 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-1 mb-2">
      {title}
    </h3>
    <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">{content}</p>
  </div>
);

const ListBlock = ({ title, items }) => (
  <div className="mb-4">
    <h3 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-1 mb-2">
      {title}
    </h3>
    <ol className="list-decimal list-inside space-y-2 text-xs text-gray-800">
      {items.map((item, i) => (
        <li key={i} className="leading-relaxed pl-1">
          {item}
        </li>
      ))}
    </ol>
  </div>
);

const PhotosBlock = ({ title, photos }) => (
  <div className="mb-4">
    <h3 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-1 mb-2">
      {title}
    </h3>
    <div className="grid grid-cols-2 gap-3">
      {photos.map((src, i) => (
        <img
          key={i}
          src={src}
          alt={`Site ${i + 1}`}
          className="w-full aspect-[4/3] object-cover border border-gray-200 rounded"
        />
      ))}
    </div>
  </div>
);

const TocBlock = ({ title, sections }) => (
  <div className="mb-6 w-full">
    <h3 className="text-base font-bold text-gray-900 border-b border-gray-200 pb-2 mb-6 uppercase tracking-wider">
      {title}
    </h3>
    <div className="space-y-4 pr-2">
      {sections.map((sec, i) => (
        <div key={i} className="flex items-baseline justify-between text-xs">
          <span className="font-semibold text-gray-800 bg-white pr-2 z-10 relative">
            {sec.title}
          </span>
          <span className="flex-1 border-b border-dotted border-gray-300 mx-2 relative top-[-4px]"></span>
          <span className="font-bold text-gray-900 bg-white pl-2 z-10 relative">
            Page {sec.pageNumber}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const CoverPageBlock = ({ data }) => {
  const safeFormatDate = (dateStr) => {
    if (!dateStr) return format(new Date(), 'dd MMM yyyy');
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return format(d, 'dd MMM yyyy');
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col justify-between h-full w-full py-0 text-center">
      <div className="flex-1 flex flex-col items-center py-20">
        <h1 className="text-2xl font-bold text-blue-900 tracking-wide mb-4">
          Geotechnical Investigation Report
        </h1>
        <div className="text-center my-0 text-xs font-semibold text-gray-700">
          Report No: {data.reportId || 'EDGE2/2026/Pending'}
        </div>
        <p className="text-sm font-medium py-4 text-gray-500 mb-4">At</p>
        <p className="text-sm font-medium py-4 text-gray-500 mb-4">{data.location || 'Location'}</p>
        <p className="text-sm font-medium py-4 text-gray-500 mb-4">For</p>
        <h2 className="text-base font-bold text-gray-900 px-6 max-w-xl leading-relaxed text-center">
          {data.projectName || data.projectDetails || 'Project Details / Proposed Construction'}
        </h2>
        
        <div className="my-10 w-24 border-b border-gray-300"></div>

        <p className="text-sm font-semibold text-gray-500 mb-3">Submitted to</p>
        <h3 className="text-base font-bold text-blue-900 mb-2">
          {data.client || 'Client Name'}
        </h3>
        <p className="text-xs font-semibold text-blue-800 italic">
          Technical Draft Report – {safeFormatDate(data.reportCreatedOn)}
        </p>
      </div>

      <div className="border-t border-gray-200 pt-6 flex flex-col items-center">
        <p className="text-xs font-semibold text-gray-500 mb-2">Report by:</p>
        <img src={LOGO_SRC} alt="EDGE2 Logo" className="w-32 h-32 object-contain mb-2" />
        <h4 className="font-bold text-md text-gray-900 uppercase tracking-wider mb-3">
          Edge2 Engineering Solutions India Pvt. Ltd.
        </h4>
        
        <div className="w-full text-[10px] text-gray-600 space-y-1 max-w-2xl mx-auto">
          <p className="font-bold text-blue-900 border-b border-gray-100 pb-0.5 mb-1 text-center">
            Our Services:
          </p>
          <p className="leading-relaxed px-4 text-center">
            Geo-Technical Investigation, Construction & Highway Material Testing Laboratory, Structural Health Assessment / Stability, Non-Destructive Testing (NDT), Restoration & Rehabilitation, Project Management Consultancy & Third-Party Inspection.
          </p>
          <p className="text-gray-500 pt-1 text-center">
            <span className="font-bold">Address:</span> "Shivaganga Arcade", B35/130, 6th Cross, 6th Block, Vishweshwaraiah Layout, Ullal Upanagar, Bangalore - 560056
          </p>
          <p className="flex justify-center gap-4 text-gray-500">
            <span><span className="font-bold">Email ID:</span> <a style={{color: "#0000EE"}} href="mailto:info@edge2.in" target="_blank" rel="noopener noreferrer">info@edge2.in</a></span>
            <span><span className="font-bold">Website:</span> <a style={{color: "#0000EE"}} href="https://www.edge2.in" target="_blank" rel="noopener noreferrer">www.edge2.in</a></span>
          </p>
          <p className="font-semibold text-gray-600 text-center">
            Contact No: <a style={{color: "#0000EE"}} href="tel:+919448377127">9448377127</a> / <a style={{color: "#0000EE"}} href="tel:+9109880973810">9880973810</a>
          </p>
        </div>
      </div>
    </div>
  );
};

const renderBlock = (block, index) => {
  switch (block.type) {
    case 'project-details':
      return <ProjectDetailsBlock key={index} data={block.data} />;
    case 'geotechnical-exploration':
      return <GeotechnicalExplorationBlock key={index} data={block.data} />;
    case 'kv-table':
      return <KvTableBlock key={index} title={block.title} rows={block.rows} />;
    case 'data-table':
      return (
        <DataTableBlock
          key={index}
          title={block.title}
          columns={block.columns}
          rows={block.rows}
          getCell={block.getCell}
        />
      );
    case 'text':
      return <TextBlock key={index} title={block.title} content={block.content} />;
    case 'list':
      return <ListBlock key={index} title={block.title} items={block.items} />;
    case 'photos':
      return <PhotosBlock key={index} title={block.title} photos={block.photos} />;
    case 'toc':
      return <TocBlock key={index} title={block.title} sections={block.sections} />;
    default:
      return null;
  }
};

const ReportPreview = forwardRef(function ReportPreview(
  { formData, onClose, onSave, isSaving },
  ref
) {
  const printRef = useRef(null);

  const pages = useMemo(() => {
    if (!formData) return [];
    const basePages = buildReportPages(formData);
    if (basePages.length === 0) return [];

    const coverPage = {
      isCoverPage: true,
      pageNumber: 1,
      isFirstPage: false,
      isContinuation: false,
      sectionTitle: null,
      blocks: [],
    };

    const tocPage = {
      isCoverPage: false,
      isFirstPage: false,
      isContinuation: false,
      sectionTitle: 'Table of Contents',
      blocks: [
        {
          type: 'toc',
          title: 'Table of Contents',
          sections: [],
        },
      ],
      pageNumber: 2,
    };

    const shiftedPages = basePages.map((p, idx) => ({
      ...p,
      pageNumber: idx + 3,
      isFirstPage: idx === 0,
    }));

    const finalPages = [coverPage, tocPage, ...shiftedPages];

    const tocSections = [];
    // tocSections.push({ title: 'Cover Page', pageNumber: 1 });
    // tocSections.push({ title: 'Table of Contents', pageNumber: 2 });
    tocSections.push({ title: 'Project Details & IS Codes', pageNumber: 3 });

    const seenTitles = new Set(['Cover Page', 'Table of Contents', 'Project Details & IS Codes']);

    shiftedPages.slice(1).forEach((page) => {
      let title = page.sectionTitle;
      if (!title && page.blocks && page.blocks.length > 0) {
        const firstBlock = page.blocks[0];
        title = firstBlock.title || formatKey(firstBlock.type);
      }

      if (title) {
        const cleanTitle = title.replace(/\s*\(Continued\)\s*/gi, '').trim();
        if (cleanTitle && !seenTitles.has(cleanTitle)) {
          seenTitles.add(cleanTitle);
          tocSections.push({
            title: cleanTitle,
            pageNumber: page.pageNumber,
          });
        }
      }
    });

    tocPage.blocks[0].sections = tocSections;

    const total = finalPages.length;
    return finalPages.map((p) => ({
      ...p,
      totalPages: total,
    }));
  }, [formData]);

  const totalPages = pages.length;
  const reportId = formData?.reportId || '';
  const reportDate = formData?.reportCreatedOn;

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: reportId || 'Geotechnical-Report',
    pageStyle: A4_PRINT_PAGE_STYLE,
  });

  useImperativeHandle(ref, () => ({ print: handlePrint }));

  useEffect(() => {
    document.body.classList.add('report-preview-open');
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('report-preview-open');
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  if (!formData) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return createPortal(
    <div
      className="report-preview-overlay bg-black/60 dark:bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-label="Report preview"
      onClick={handleBackdropClick}
    >
      <div
        className="report-preview-modal bg-card text-card-foreground border border-border shadow-2xl dark:shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="report-preview-toolbar no-print bg-card border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">Report Preview</h2>
            <p className="text-xs text-muted-foreground">
              {reportId ? `#${reportId}` : 'Unsaved report'} · {totalPages} page
              {totalPages !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print PDF
            </Button>
            {onSave && (
              <Button size="sm" onClick={onSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Report'}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="a4-preview-wrapper report-preview-scroll rounded-xl border border-border">
          <div ref={printRef} id="printable-report-root">
            {pages.map((page) => {
              if (page.isCoverPage) {
                return (
                  <div key={page.pageNumber} className="a4-container bg-white relative flex flex-col justify-between">
                    <ReportWatermark />
                    <div className="a4-page-content relative z-[1] flex-1 flex flex-col justify-between h-full">
                      <CoverPageBlock data={formData} />
                    </div>
                  </div>
                );
              }
              return (
                <div key={page.pageNumber} className="a4-container">
                  <ReportWatermark />
                  <div className="a4-page-content relative z-[1]">
                    <ContentPageHeader />
                    {page.isContinuation && page.sectionTitle && (
                      <div className="text-right text-[10px] text-gray-500 italic mt-[-8px] mb-2">
                        {page.sectionTitle}
                      </div>
                    )}
                    {page.blocks.map((block, i) => renderBlock(block, i))}
                  </div>
                  <div className="a4-page-footer">
                    <span>{COMPANY_NAME}</span>
                    <span>
                      Report {reportId ? `#${reportId}` : '#Pending'} | Page{' '}
                      {page.pageNumber} of {totalPages}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
});

ReportPreview.displayName = 'ReportPreview';
export default ReportPreview;
