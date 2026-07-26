/* ── Three.js Loader avec fallback CDN → local ── */
(function () {
  if (typeof THREE !== 'undefined') return;

  // Mobile / reduced-motion : on NE charge PAS Three.js (~600 Ko + cout WebGL economises).
  // Le fond decoratif est purement cosmetique ; le fond CSS sombre suffit.
  if (window.matchMedia &&
      (matchMedia('(max-width: 768px)').matches ||
       matchMedia('(prefers-reduced-motion: reduce)').matches)) return;

  var CDN_URL   = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var LOCAL_URL = 'js/vendor/three.min.js';

  function load(src, onError) {
    var s   = document.createElement('script');
    s.src   = src;
    s.async = false;
    if (onError) s.onerror = onError;
    document.head.appendChild(s);
  }

  load(CDN_URL, function () {
    load(LOCAL_URL);
  });
})();
