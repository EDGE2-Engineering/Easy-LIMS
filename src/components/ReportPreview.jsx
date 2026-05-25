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
import { buildReportPages, formatDisplayValue } from '@/utils/reportPreviewUtils';
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

const ProjectDetailsBlock = ({ data }) => (
  <div className="mb-4">
    <div className="grid grid-cols-2 gap-6 mb-2 text-sm py-0 border-b border-gray-200 pb-3">
      <div className="space-y-1">
        <h3 className="text-gray-500 font-semibold uppercase tracking-wide border-b border-gray-100 pb-1 mb-2 text-xs">
          Client
        </h3>
        <p className="font-bold text-gray-900 text-xs">{data.client || '-'}</p>
        <p className="text-gray-600 whitespace-pre-wrap text-xs">{data.clientAddress || '-'}</p>
      </div>
      <div className="space-y-1 border-l border-gray-200 pl-4">
        <h3 className="text-gray-500 font-semibold uppercase tracking-wide border-b border-gray-100 pb-1 mb-2 text-xs">
          Project / Site
        </h3>
        <p className="font-bold text-gray-900 text-xs">{data.projectName || '-'}</p>
        <p className="text-gray-600 text-xs">
          <span className="font-semibold">Site ID:</span> {data.siteId || '-'}
        </p>
        <p className="text-gray-600 text-xs">
          <span className="font-semibold">Site Name:</span> {data.siteName || '-'}
        </p>
        <p className="text-gray-600 whitespace-pre-wrap text-xs">{data.siteAddress || '-'}</p>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
      <p>
        <span className="font-semibold text-gray-700">Survey Date:</span>{' '}
        {data.surveyDate
          ? format(new Date(data.surveyDate), 'dd MMM yyyy')
          : '-'}
      </p>
      <p>
        <span className="font-semibold text-gray-700">Ground Water:</span>{' '}
        {data.groundWaterTable || '-'}
      </p>
      <p>
        <span className="font-semibold text-gray-700">Coordinates:</span>{' '}
        {[data.latitude, data.longitude].filter(Boolean).join(', ') || '-'}
      </p>
      {data.anchorId && (
        <p>
          <span className="font-semibold text-gray-700">Anchor ID:</span> {data.anchorId}
        </p>
      )}
      {data.depthOfFoundation && (
        <p>
          <span className="font-semibold text-gray-700">Depth of Foundation:</span>{' '}
          {data.depthOfFoundation}
        </p>
      )}
    </div>
  </div>
);

const KvTableBlock = ({ title, rows }) => (
  <div className="mb-4">
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

const renderBlock = (block, index) => {
  switch (block.type) {
    case 'project-details':
      return <ProjectDetailsBlock key={index} data={block.data} />;
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
    default:
      return null;
  }
};

const ReportPreview = forwardRef(function ReportPreview(
  { formData, onClose, onSave, isSaving },
  ref
) {
  const printRef = useRef(null);

  const pages = useMemo(
    () => (formData ? buildReportPages(formData) : []),
    [formData]
  );

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
              Print / PDF
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
            {pages.map((page) => (
              <div key={page.pageNumber} className="a4-container">
                <ReportWatermark />
                <div className="a4-page-content relative z-[1]">
                  {page.isFirstPage && (
                    <ReportFullHeader reportId={reportId} reportDate={reportDate} />
                  )}
                  {!page.isFirstPage && page.sectionTitle && (
                    <ReportContinuedHeader title={page.sectionTitle} />
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
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
});

ReportPreview.displayName = 'ReportPreview';
export default ReportPreview;
