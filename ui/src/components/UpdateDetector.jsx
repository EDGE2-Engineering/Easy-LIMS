import React, { useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { RefreshCw } from 'lucide-react';

export default function UpdateDetector() {
  const { toast } = useToast();
  const hasDetectedUpdate = useRef(false);

  useEffect(() => {
    // Get current local build ID
    const currentBuildId = document.querySelector('meta[name="build-id"]')?.getAttribute('content');

    if (!currentBuildId || currentBuildId === 'development') {
      // In development mode or if build-id is missing, skip the check
      return;
    }

    const checkForUpdates = async () => {
      if (hasDetectedUpdate.current) return;

      try {
        // Construct the correct root index.html URL regardless of subdirectories
        let appRoot = window.location.pathname;
        if (appRoot.endsWith('.html') || appRoot.endsWith('.htm')) {
          appRoot = appRoot.substring(0, appRoot.lastIndexOf('/') + 1);
        }
        if (!appRoot.endsWith('/')) {
          appRoot += '/';
        }
        const fetchUrl = `${window.location.origin}${appRoot}index.html?cb=${Date.now()}`;

        const response = await fetch(fetchUrl, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        });

        if (!response.ok) return;

        const htmlText = await response.text();
        const match = htmlText.match(
          /<meta[^>]*name=["']build-id["'][^>]*content=["']([^"']+)["']/
        );
        const serverBuildId = match ? match[1] : null;

        if (serverBuildId && serverBuildId !== currentBuildId) {
          hasDetectedUpdate.current = true;

          toast({
            title: 'Update Available',
            description:
              'A new version of Easy LIMS has been deployed. Please refresh to load the latest updates.',
            duration: Infinity,
            action: (
              <ToastAction
                altText="Reload page to apply update"
                onClick={() => {
                  window.location.reload();
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-all"
              >
                <RefreshCw className="h-3 w-3" />
                Update Now
              </ToastAction>
            ),
          });
        }
      } catch (err) {
        console.error('[UpdateDetector] Error checking for updates:', err);
      }
    };

    // Run check on mount after a small delay (5 seconds)
    const initialTimeout = setTimeout(checkForUpdates, 5000);

    // Run check periodically (every 60 seconds)
    const interval = setInterval(checkForUpdates, 60000);

    // Run check on tab visibility change (e.g. user returns to the tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [toast]);

  return null;
}
