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
                <td className="border border-gray-400 px-1 py-1 text-gray-800">{(data.latitudes && data.latitudes[idx] != null && data.latitudes[idx] !== '') ? data.latitudes[idx] : (data.latitude || '-')}</td>
                <td className="border border-gray-400 px-1 py-1 text-gray-800">{(data.longitudes && data.longitudes[idx] != null && data.longitudes[idx] !== '') ? data.longitudes[idx] : (data.longitude || '-')}</td>
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

      <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-2">
        4.1 Field Investigation
      </h3>
      <p className="text-xs text-gray-800 leading-relaxed mb-2">
        Geotechnical investigation was conducted to obtain subsurface stratification in the “The
        Construction Residential Building (G+3) at Site No.201, Residential Layout, “Northern Boulevard”
        ,
        Sy No.323 & 324, at Aluru Duddanahalli Village, Kundana Hobli, Devanahalli Taluk, Bangalore.
        and to collect soil, rock and ground water samples for laboratory testing to arrive at geotechnical
        design parameters.
      </p>
      <p className="text-xs text-gray-800 leading-relaxed mb-2">
        Erecting and setting up of boring rig: at each borehole location, as per the Client’s location plan,
        Manual auger system is shifted, assembled and erected.
      </p>
      <p className="text-xs text-gray-800 leading-relaxed mb-2">
        <b>In –Situ Tests in Overburden</b>: Standard Penetration Tests are conducted in overburden. Disturbed
        soil samples are collected through split spoon sampler of SPT to determine the index properties
        from laboratory tests.
      </p>
      <p className="text-xs text-gray-800 leading-relaxed mb-2">
        <b>Standard Penetration Test</b>: SPT was conducted 1 m below ground level and was carried out at
        intervals of 1.5 m and at any change of material. Standard split spoon sampler attached to lower end
        of drill rods was driven in the boreholes by means of standard hammer of 63.50 kg falling freely
        from a height of 75 cm. The sampler was driven 45 cm as per specifications and number of blows
        required for each 15 cm penetration was recorded. The number of blows for the first 15 cm
        penetration was not considered as it is taken as seating drive. The number of blows for next 30 cm
        penetration was designated as SPT ‘N’ value. Wherever the total penetration was less than 45 cm,
        the number of blows & the depth penetrated is incorporated in respective bore logs.
        Disturbed Soil samples obtained from standard split spoon sampler were collected in polythene bags
        of suitable size. These samples were properly sealed, labelled, recorded and carefully transported
        to laboratory for testing. Based on SPT N values soil is classified for its denseness/consistency.
      </p>  
      
      <p className="text-xs text-gray-800 leading-relaxed mb-2">
        <b>Drilling in Rock</b>: Once the hard stratum or rock surface was met, the size of the bore hole was
        reduced to NX size (76mm). The hard stratum or top of the rock surface was confirmed, either by
        the refusal from standard penetration test N value or due to resistance during the drilling operation.
        In this hard stratum, further work was carried out by using NX double core barrel with Diamond
        studded drill bits. The work was done as per IS: 6926-1973. The maximum length of the drill (run)
        was maintained as 1.50m or 1.0m. At the end of each run the drill rod string with core barrel was
        extracted from the bore hole and core was recovered from the core barrel. Recovered rock cores
        were numbered and labelled serially and carefully transferred into good quality, sturdy, wooden
        core boxes and preserved. The core recovery percentage was recorded. Core Recovery percentage
        = (C.R. % = (Length of Core / Length of run) x 100). Rock Quality Designation (RQD) was also
        recorded. Rock Quality Designation (RQD) = (Total Length of core pieces of 100mm & above in
        Length / length of run) x 100). Core recovery percentage and RQD were computed for every drilled
        run based on the length of cores retrieved.
        <br />
        <b>Water Level Observation:</b> The depth of ground water table (G.W.T) was checked/ measured in all
        two bore holes. Ground water table was not found in any of the bore holes during the boring activity.
      </p>  

      <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-2">4.2 Laboratory Investigation</h3>
      <p className="text-xs text-gray-800 leading-relaxed mb-2">
        Collected soil/rock samples were transported to laboratory for further testing.
      </p>
      <p className="text-xs text-gray-800 leading-relaxed mb-2">
        Following laboratory tests were performed on collected samples:
      </p>  
<table border="1" cellpadding="8" cellspacing="0" className="w-full text-xs border-collapse border border-gray-200 table-fixed">
  <thead>
    <tr>
      <th className="py-1 border border-gray-200 px-1">Sl. No.</th>
      <th className="py-1 border border-gray-200 px-1">Test</th>
      <th className="py-1 border border-gray-200 px-1">Referenced IS Code</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td colSpan="3" className="border border-gray-200 px-1 py-1 text-center font-semibold uppercase break-words"><strong>Soil</strong></td>
    </tr>
    <tr>
      <td className="border border-gray-200 px-1 py-1 text-left font-semibold uppercase break-words text-xs">1</td>
      <td className="border border-gray-200 px-1 py-1 text-left font-semibold uppercase break-words text-xs">Water Content (WC)</td>
      <td className="border border-gray-200 px-1 py-1 text-left font-semibold uppercase break-words text-xs">IS 2720-Part 2-1973</td>
    </tr>
    <tr>
      <td className="border border-gray-200 px-1 py-1 text-left font-semibold uppercase break-words text-xs">2</td>
      <td className="border border-gray-200 px-1 py-1 text-left font-semibold uppercase break-words text-xs">Specific Gravity (G)</td>
      <td className="border border-gray-200 px-1 py-1 text-left font-semibold uppercase break-words text-xs">IS 2720 (Part 3/Sec 1): 1980</td>
    </tr>
    <tr>
      <td className="border border-gray-200 px-1 py-1 text-left font-semibold uppercase break-words text-xs">3</td>
      <td className="border border-gray-200 px-1 py-1 text-left font-semibold uppercase break-words text-xs">Grain Size Analysis (GSA)</td>
      <td className="border border-gray-200 px-1 py-1 text-left font-semibold uppercase break-words text-xs">IS 2720-Part 4-1985</td>
    </tr>
    <tr>
      <td className="border border-gray-200 px-1 py-1 text-left font-semibold uppercase break-words text-xs">4</td>
      <td className="border border-gray-200 px-1 py-1 text-left font-semibold uppercase break-words text-xs">
        Atterberg Limits:
        <ul>
          <li>Liquid Limit (LL)</li>
          <li>Plastic Limit (PL)</li>
        </ul>
      </td>
      <td className="border border-gray-200 px-1 py-1 text-left font-semibold uppercase break-words">IS 2720-Part 5-1985</td>
    </tr>
  </tbody>
</table>
  <p className="text-xs text-gray-800 w-full ">*All test results have been compiled and are presented in the Annexure-II of this report.</p>

    </div>
  );
};


const BoreholeLogTableBlock = ({ block }) => {
  const {
    boreholeNumber,
    logs = [],
    maxDepth,
    latitude,
    longitude,
    surveyDate,
    projectName,
    location,
    methodOfBoring,
  } = block;

  const METHOD_LABELS = {
    Drilling: 'Rotary Drilling',
    Manual: 'Manual Auger',
  };
  const methodLabel = METHOD_LABELS[methodOfBoring] || methodOfBoring || 'Rotary Drilling';

  const bhLabel = `BH-${String(boreholeNumber).padStart(2, '0')}`;

  const safeDate = (dateStr) => {
    if (!dateStr) return 'NA';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return format(d, 'dd-MM-yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="text-[9px] leading-tight">
      <div className="text-center font-bold text-[11px] uppercase tracking-wide border border-gray-400 py-0 mb-0 bg-[#fcf8f2]">
        BORE LOG DATA SHEET
      </div>

      <table className="w-full border-collapse border border-gray-400 text-[9px]">
        <tbody>
          <tr>
            <td className="border border-gray-400 px-1 py-0.5 font-bold w-[18%]">Location:</td>
            <td className="border border-gray-400 px-1 py-0.5 w-[32%]">{location || 'NA'}</td>
            <td className="border border-gray-400 px-1 py-0.5 font-bold w-[20%]">Method of Boring:</td>
            <td className="border border-gray-400 px-1 py-0.5 w-[30%]">{methodLabel}</td>
          </tr>
          <tr>
            <td className="border border-gray-400 px-1 py-0.5 font-bold">Borehole No:</td>
            <td className="border border-gray-400 px-1 py-0.5 font-semibold">{bhLabel}</td>
            <td className="border border-gray-400 px-1 py-0.5 font-bold">Borehole Dia.:</td>
            <td className="border border-gray-400 px-1 py-0.5">150mm / NX</td>
          </tr>
          <tr>
            <td className="border border-gray-400 px-1 py-0.5 font-bold">Type of Structure:</td>
            <td className="border border-gray-400 px-1 py-0.5">{projectName || 'NA'}</td>
            <td className="border border-gray-400 px-1 py-0.5 font-bold">Start Date:</td>
            <td className="border border-gray-400 px-1 py-0.5">{safeDate(surveyDate)}</td>
          </tr>
          <tr>
            <td className="border border-gray-400 px-1 py-0.5 font-bold">Termination Depth (m):</td>
            <td className="border border-gray-400 px-1 py-0.5">{maxDepth || 'NA'}</td>
            <td className="border border-gray-400 px-1 py-0.5 font-bold">Completion Date:</td>
            <td className="border border-gray-400 px-1 py-0.5">{safeDate(surveyDate)}</td>
          </tr>
          <tr>
            <td className="border border-gray-400 px-1 py-0.5 font-bold">Ground R.L (m):</td>
            <td className="border border-gray-400 px-1 py-0.5">100.000</td>
            <td className="border border-gray-400 px-1 py-0.5 font-bold">Latitude (°):</td>
            <td className="border border-gray-400 px-1 py-0.5">{latitude || 'NA'}</td>
          </tr>
          <tr>
            <td className="border border-gray-400 px-1 py-0.5 font-bold">G.W.T (m):</td>
            <td className="border border-gray-400 px-1 py-0.5">Not Encountered</td>
            <td className="border border-gray-400 px-1 py-0.5 font-bold">Longitude (°):</td>
            <td className="border border-gray-400 px-1 py-0.5">{longitude || 'NA'}</td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse border border-gray-400 text-[9px] mt-0">
        <thead>
          <tr className="bg-[#fcf8f2] text-center">
            <th className="border border-gray-400 px-1 py-1 align-middle" rowSpan="2" style={{width:'4%'}}>S.No.</th>
            <th className="border border-gray-400 px-1 py-1 align-middle" rowSpan="2" style={{width:'18%'}}>Strata Description</th>
            <th className="border border-gray-400 px-1 py-1 align-middle" rowSpan="2" style={{width:'7%'}}>Sample Type</th>
            <th className="border border-gray-400 px-1 py-1" colSpan="2" style={{width:'12%'}}>Depth of Drilling (m)</th>
            <th className="border border-gray-400 px-1 py-1" colSpan="3" style={{width:'18%'}}>SPT (No. of Blows)</th>
            <th className="border border-gray-400 px-1 py-1 align-middle" rowSpan="2" style={{width:'8%'}}>N-Value (IS-2131)</th>
            <th className="border border-gray-400 px-1 py-1 align-middle" rowSpan="2" style={{width:'6%'}}>CR (%)</th>
            <th className="border border-gray-400 px-1 py-1 align-middle" rowSpan="2" style={{width:'6%'}}>RQD (%)</th>
            <th className="border border-gray-400 px-1 py-1 align-middle" rowSpan="2" style={{width:'13%'}}>Remarks</th>
          </tr>
          <tr className="bg-[#fcf8f2] text-center">
            <th className="border border-gray-400 px-1 py-0.5">From</th>
            <th className="border border-gray-400 px-1 py-0.5">To</th>
            <th className="border border-gray-400 px-1 py-0.5">0–15 cm</th>
            <th className="border border-gray-400 px-1 py-0.5">15–30 cm</th>
            <th className="border border-gray-400 px-1 py-0.5">30–45 cm</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan="12" className="border border-gray-400 px-2 py-2 text-center text-gray-400 italic">
                No borehole data recorded.
              </td>
            </tr>
          ) : (
            logs.map((row, idx) => {
              const prevDepth = idx === 0 ? '0.0' : (logs[idx - 1]?.depth ?? '-');
              const isDS = row.natureOfSampling === 'DS';
              const spt2n = Number(row.spt2);
              const spt3n = Number(row.spt3);
              const nValue = !isDS && row.natureOfSampling === 'SPT' && !isNaN(spt2n) && !isNaN(spt3n)
                ? spt2n + spt3n
                : '-';
              return (
                <tr key={idx} className="text-center">
                  <td className="border border-gray-400 px-1 py-0.5">{idx + 1}</td>
                  <td className="border border-gray-400 px-1 py-0.5 text-left">{row.soilType || '-'}</td>
                  <td className="border border-gray-400 px-1 py-0.5">{row.natureOfSampling || '-'}</td>
                  <td className="border border-gray-400 px-1 py-0.5">{prevDepth}</td>
                  <td className="border border-gray-400 px-1 py-0.5">{row.depth || '-'}</td>
                  <td className="border border-gray-400 px-1 py-0.5">{isDS ? '-' : (row.spt1 ?? '-')}</td>
                  <td className="border border-gray-400 px-1 py-0.5">{isDS ? '-' : (row.spt2 ?? '-')}</td>
                  <td className="border border-gray-400 px-1 py-0.5">{isDS ? '-' : (row.spt3 ?? '-')}</td>
                  <td className="border border-gray-400 px-1 py-0.5 font-semibold">{nValue}</td>
                  <td className="border border-gray-400 px-1 py-0.5">{row.coreRecovery || '-'}</td>
                  <td className="border border-gray-400 px-1 py-0.5">{row.rqd || '-'}</td>
                  <td className="border border-gray-400 px-1 py-0.5 text-left">{row.waterTable ? 'GWT observed' : ''}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <table className="w-full border-collapse border border-gray-400 text-[8px] mt-0">
        <tbody>
          <tr>
            <td className="border border-gray-400 px-1 py-0.5 font-bold" colSpan="2">Description:</td>
            <td className="border border-gray-400 px-1 py-0.5">SPT – Standard Penetration Test</td>
            <td className="border border-gray-400 px-1 py-0.5">CR – Core Recovery</td>
            <td className="border border-gray-400 px-1 py-0.5">Ground R.L – Ground Reduced Level</td>
            <td className="border border-gray-400 px-1 py-0.5">WS – Washed Sample</td>
          </tr>
          <tr>
            <td className="border border-gray-400 px-1 py-0.5" colSpan="2"></td>
            <td className="border border-gray-400 px-1 py-0.5">DS – Disturbed Sample</td>
            <td className="border border-gray-400 px-1 py-0.5">RQD – Rock Quality Designation</td>
            <td className="border border-gray-400 px-1 py-0.5">G.W.T – Ground Water Level</td>
            <td className="border border-gray-400 px-1 py-0.5">NA – Not Available</td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse border border-gray-400 text-[9px] mt-0">
        <tbody>
          <tr>
            <td className="border border-gray-400 px-2 py-2 w-1/2">Site Engineer's Signature: _______________</td>
            <td className="border border-gray-400 px-2 py-2 text-right">Client's Signature: _______________</td>
          </tr>
        </tbody>
      </table>
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
    case 'borehole-log-sheet':
      return <BoreholeLogTableBlock key={index} block={block} />;
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
    tocSections.push({ title: 'Project Details', pageNumber: 3 });

    const seenTitles = new Set(['Cover Page', 'Table of Contents', 'Project Details']);

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
