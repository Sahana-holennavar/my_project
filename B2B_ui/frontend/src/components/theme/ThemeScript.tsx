"use client";

import { useEffect } from "react";

/**
 * Script to prevent flash of unstyled content (FOUC) on initial page load
 * This component should be placed in the root layout before other content
 */
export function ThemeScript() {
  useEffect(() => {
    // This runs on mount, but the actual theme application happens via the script tag
  }, []);

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            function getTheme() {
              const stored = localStorage.getItem('theme');
              if (stored === 'dark' || stored === 'light') return stored;
              if (stored === 'system' || !stored) {
                return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              }
              return 'light';
            }
            
            const theme = getTheme();
            if (theme === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          })();
        `,
      }}
    />
  );
}
