// Shared iOS/standalone-PWA detection, used by both the install prompt and
// the push-notification opt-in (both need to know "is this iOS Safari, not
// yet installed" to show the right instructions instead of a dead-end
// permission request that iOS will never honor outside a home-screen PWA).
export function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export function isIOSSafari() {
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
}
