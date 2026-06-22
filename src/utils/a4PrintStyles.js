/**
 * Injected by react-to-print so the browser print dialog matches on-screen A4 preview.
 * Kept in sync with @media print rules in index.css.
 */
export const A4_PRINT_PAGE_STYLE = `
  @page {
    size: 210mm 297mm;
    margin: 0;
  }

  html, body {
    width: 210mm !important;
    max-width: 210mm !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    background: white !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  #printable-quote-root,
  #printable-report-root {
    position: static !important;
    visibility: visible !important;
    width: 210mm !important;
    max-width: 210mm !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    box-sizing: border-box !important;
  }

  #printable-quote-root *,
  #printable-report-root * {
    box-sizing: border-box !important;
  }

  .a4-container {
    width: 210mm !important;
    max-width: 210mm !important;
    height: 297mm !important;
    min-height: 297mm !important;
    max-height: 297mm !important;
    margin: 0 !important;
    padding: 10mm !important;
    padding-bottom: 4mm !important;
    overflow: hidden !important;
    box-sizing: border-box !important;
    display: flex !important;
    flex-direction: column !important;
    page-break-after: always;
    break-inside: avoid;
    border: none !important;
    box-shadow: none !important;
    transform: none !important;
  }

  .a4-container:last-child {
    page-break-after: auto;
  }

  .a4-page-content,
  .a4-content-wrapper {
    flex: 1 1 auto !important;
    min-width: 0 !important;
    max-width: 100% !important;
    width: 100% !important;
    overflow: hidden !important;
  }

  .a4-page-footer {
    position: static !important;
    margin-top: auto !important;
    width: 100% !important;
    max-width: 100% !important;
    flex-shrink: 0 !important;
  }

  .a4-container table {
    width: 100% !important;
    max-width: 100% !important;
    table-layout: fixed !important;
  }

  .quote-items-table col:nth-child(9) {
    width: 0 !important;
  }

  .a4-container th,
  .a4-container td {
    overflow-wrap: anywhere !important;
    word-break: break-word !important;
  }

  .a4-container img {
    max-width: 100% !important;
    height: auto !important;
  }

  .a4-container .flex,
  .a4-container .grid {
    max-width: 100% !important;
  }

  .a4-container .flex > * {
    min-width: 0 !important;
    max-width: 100% !important;
  }

  .print\\:hidden {
    display: none !important;
  }
`;
