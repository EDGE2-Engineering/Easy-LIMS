import { lazy } from 'react';

/**
 * A wrapper around React.lazy that handles dynamic import failures (often caused by new deployments)
 * by automatically refreshing the page.
 *
 * @param {Function} componentImport - A function that returns a promise (e.g., () => import('./MyComponent'))
 * @returns {React.Component} A lazy-loaded component with automatic retry on failure
 */
export const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasBeenForceRefreshed =
      window.sessionStorage.getItem('page-has-been-force-refreshed') === 'true';

    try {
      const component = await componentImport();
      // Reset the flag on successful load
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      const isNetworkError =
        error.name === 'ChunkLoadError' ||
        error.message.includes('Failed to fetch dynamically imported module') ||
        error.message.includes('Importing a module script failed');

      if (!pageHasBeenForceRefreshed && isNetworkError) {
        // Set flag to prevent infinite reload loops
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');

        // Refresh the page to fetch the new index.html and asset manifest
        window.location.reload();

        // Return a dummy component that won't render while the page reloads
        return { default: () => null };
      }

      // If we've already refreshed or it's a different error, let it bubble up
      throw error;
    }
  });
