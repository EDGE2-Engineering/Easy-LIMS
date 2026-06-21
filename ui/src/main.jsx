import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import 'rsuite/dist/rsuite-no-reset.min.css';
import '@/index.css';
import { migrateStorageKeys } from '@/data/storageKeys';

// Migrate old localStorage keys to new standardized names
migrateStorageKeys();

// Handle dynamic import failures (often caused by new builds/deployments)
// This catches errors that might occur outside of lazyWithRetry
window.addEventListener(
  'error',
  (e) => {
    if (
      e.message?.includes('Failed to fetch dynamically imported module') ||
      e.message?.includes('Importing a module script failed')
    ) {
      const pageHasBeenForceRefreshed =
        window.sessionStorage.getItem('page-has-been-force-refreshed') === 'true';

      if (!pageHasBeenForceRefreshed) {
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
      }
    }
  },
  true
);

window.addEventListener('unhandledrejection', (e) => {
  if (
    e.reason?.message?.includes('Failed to fetch dynamically imported module') ||
    e.reason?.message?.includes('Importing a module script failed')
  ) {
    const pageHasBeenForceRefreshed =
      window.sessionStorage.getItem('page-has-been-force-refreshed') === 'true';

    if (!pageHasBeenForceRefreshed) {
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
      window.location.reload();
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
