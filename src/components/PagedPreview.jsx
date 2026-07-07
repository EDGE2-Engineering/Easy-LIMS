import React, { useRef, useEffect, useImperativeHandle, useCallback, useState } from 'react';

/**
 * PagedPreview — renders flowing quotation content inside an iframe
 * using Paged.js to paginate into perfect A4 pages.
 *
 * Props:
 *   contentNode: React element tree (QuotationContent) — used to capture HTML via a hidden div
 *   documentTitle: string — used for the browser print dialog title
 *
 * Ref methods:
 *   print() — triggers browser print of the iframe
 */
const PagedPreview = React.forwardRef(function PagedPreview({ contentNode, documentTitle }, ref) {
  const iframeRef = useRef(null);
  const hiddenDivRef = useRef(null);
  const debounceRef = useRef(null);
  const [iframeHeight, setIframeHeight] = useState('800px');

  // Expose print() method to parent
  useImperativeHandle(ref, () => ({
    print() {
      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentWindow) return;
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  }), []);

  const renderIntoIframe = useCallback(async () => {
    const iframe = iframeRef.current;
    const hiddenDiv = hiddenDivRef.current;
    if (!iframe || !hiddenDiv) return;

    // Capture serialized HTML from the hidden React render div
    const htmlContent = hiddenDiv.innerHTML;
    const iDoc = iframe.contentDocument;
    if (!iDoc) return;

    // Build a complete HTML document string
    // Loads Paged.js directly inside the iframe context.
    // This isolates all styles, layout calculations, and resize listeners inside the iframe's window context.
    // When the iframe document is reset/written, all associated window listeners are automatically garbage-collected.
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${documentTitle || 'Quotation'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/quotation-print.css" />
  <style>
    /* Preview shell */
    html, body { margin: 0; padding: 0; background: #f3f4f6; }
    /* Hide source content until Paged.js processes it */
    #source-content { display: none; }
  </style>
  <script>
    // Tell Paged.js not to run automatically on load
    window.PagedConfig = { auto: false };

    // Block 'resize' event registration to prevent loop thrashing when React resizes the iframe
    if (!window.addEventListener.__patched__) {
      const originalAddEventListener = window.addEventListener;
      window.addEventListener = function(type, listener, options) {
        if (type === 'resize') {
          return;
        }
        originalAddEventListener.call(window, type, listener, options);
      };
      window.addEventListener.__patched__ = true;
    }
  </script>
  <script src="/paged.polyfill.js"></script>
  <script>
    // Wrap in IIFE to prevent syntax re-declaration errors on iframe document refresh
    (() => {
      class RepeatTableHeadersHandler extends Paged.Handler {
        constructor(chunker, polisher, caller) {
          super(chunker, polisher, caller);
        }
        afterPageLayout(pageElement, page, breakToken, chunker) {
          const tables = pageElement.querySelectorAll('table');
          tables.forEach((table) => {
            const splitFrom = table.getAttribute('data-split-from');
            if (splitFrom) {
              const sourceTable = chunker.source.querySelector('table[data-ref="' + splitFrom + '"]');
              if (sourceTable) {
                const colgroup = sourceTable.querySelector('colgroup');
                if (colgroup && !table.querySelector('colgroup')) {
                  table.insertBefore(colgroup.cloneNode(true), table.firstChild);
                }
                const thead = sourceTable.querySelector('thead');
                if (thead && !table.querySelector('thead')) {
                  const refEl = table.querySelector('colgroup') ? table.querySelector('colgroup').nextSibling : table.firstChild;
                  table.insertBefore(thead.cloneNode(true), refEl);
                }
              }
            }
          });
        }
      }
      Paged.registerHandlers(RepeatTableHeadersHandler);
    })();
  </script>
</head>
<body>
  <div id="source-content">${htmlContent}</div>
</body>
</html>`;

    // Write the HTML structure and load scripts inside the iframe
    iDoc.open();
    iDoc.write(fullHtml);
    iDoc.close();

    // Helper: Poll until Paged.js is fully loaded inside the iframe
    const waitForPaged = () => {
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          if (iframe.contentWindow && iframe.contentWindow.Paged) {
            clearInterval(interval);
            resolve(true);
          }
        }, 50);
        // Timeout after 4 seconds
        setTimeout(() => {
          clearInterval(interval);
          resolve(false);
        }, 4000);
      });
    };

    const isLoaded = await waitForPaged();
    if (!isLoaded || !iframe.contentWindow || !iframe.contentWindow.Paged) {
      console.warn('[PagedPreview] Paged.js polyfill failed to load inside the iframe.');
      return;
    }

    try {
      const Paged = iframe.contentWindow.Paged;
      const paged = new Paged.Previewer();

      const sourceEl = iDoc.getElementById('source-content');
      if (!sourceEl) return;

      // Make source content briefly visible so Paged.js can measure it
      sourceEl.style.display = 'block';

      // Paged.js renders the content into iDoc.body, creating .pagedjs_pages.
      // Since it executes in the iframe context, its polisher automatically styles the iframe's head.
      await paged.preview(sourceEl, ['/quotation-print.css'], iDoc.body);

      // Hide the source content again once pagination is complete
      sourceEl.style.display = 'none';

      // Auto-size iframe height based on the generated pages
      const pagedPages = iDoc.querySelector('.pagedjs_pages');
      if (pagedPages) {
        const totalH = pagedPages.scrollHeight;
        setIframeHeight(`${totalH + 48}px`);
      }
    } catch (err) {
      console.error('[PagedPreview] Paged.js render error:', err);
    }
  }, [documentTitle]);

  // Re-render whenever contentNode changes (debounced 500ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      renderIntoIframe();
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [renderIntoIframe, contentNode]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Hidden div where React renders the content tree to capture innerHTML */}
      <div
        ref={hiddenDivRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-99999px',
          top: 0,
          width: '794px', // A4 width at 96 DPI — ensures correct text wrapping on serialization
          visibility: 'hidden',
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {contentNode}
      </div>

      {/* Paged.js preview iframe */}
      <iframe
        ref={iframeRef}
        title="Document Preview"
        style={{
          width: '100%',
          height: iframeHeight,
          minHeight: '800px',
          border: 'none',
          background: '#f3f4f6',
          display: 'block',
        }}
      />
    </div>
  );
});

export default PagedPreview;
