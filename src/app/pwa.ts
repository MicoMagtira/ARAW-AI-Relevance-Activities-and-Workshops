// Registers the service worker (production builds only) so the app shell works offline after the first visit.
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const register = () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
      /* blocked or unsupported (private mode, http): the app simply stays online-only */
    });
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
