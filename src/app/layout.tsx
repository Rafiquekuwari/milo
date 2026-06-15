import type { Metadata, Viewport } from 'next'
import { MiloErrorBoundary } from '@/components/ui/ErrorBoundary'

import { OfflineBanner } from '@/lib/useOfflineSync'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#F26B2C',
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: "Milo's Story Mode",
  description: "Milo's interactive learning adventure for kids",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Milo',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Milo',
    'msapplication-TileColor': '#F26B2C',
    'msapplication-tap-highlight': 'no',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/icon-144.png" />
        <link rel="apple-touch-icon" sizes="128x128" href="/icons/icon-128.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <MiloErrorBoundary>
          {children}
          <OfflineBanner />
          <ToastProvider />
        </MiloErrorBoundary>
        <script dangerouslySetInnerHTML={{ __html: `
          var isLocalDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
          if (isLocalDev && 'serviceWorker' in navigator) {
            // In local dev, make sure no stale SW is intercepting requests
            // (it caches prod chunks and returns 503s once the dev server restarts).
            navigator.serviceWorker.getRegistrations().then(function(regs) {
              regs.forEach(function(r) { r.unregister(); });
            });
          }
          if (!isLocalDev && 'serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(reg) {
                  console.log('[Milo SW] Registered:', reg.scope);

                  // After page loads, tell SW to cache all loaded JS chunks
                  // This ensures offline works after one online session
                  window.setTimeout(function() {
                    var scripts = Array.from(document.querySelectorAll('script[src]'))
                      .map(function(s) { return s.src })
                      .filter(function(s) { return s.includes('/_next/static/') });
                    var links = Array.from(document.querySelectorAll('link[rel=stylesheet][href]'))
                      .map(function(l) { return l.href })
                      .filter(function(h) { return h.includes('/_next/static/') });
                    var urls = scripts.concat(links);
                    if (urls.length > 0 && reg.active) {
                      reg.active.postMessage({ type: 'CACHE_URLS', urls: urls });
                      console.log('[Milo SW] Requested caching of', urls.length, 'chunks');
                    }
                  }, 2000);
                })
                .catch(function(err) { console.warn('[Milo SW] Failed:', err); })
            })
          }
        `}} />
      </body>
    </html>
  )
}