// highlight-metrics.js : run after document.fonts.ready; sets --mk-y / --mk-h per element (cached per font)
(function(){
  const ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
  const cache = {};
  function metrics(font){
    if (cache[font]) return cache[font];
    if (!ctx) return { y: 0.17, h: 0.985 };
    ctx.font = font.replace(/[\d.]+px/, '200px');
    const m = ctx.measureText('HExpgdyQ');
    const fa = ((m && m.fontBoundingBoxAscent) || (m && m.actualBoundingBoxAscent * 1.12) || 160) / 200;
    const a = ((m && m.actualBoundingBoxAscent) || 145) / 200;
    const d = ((m && m.actualBoundingBoxDescent) || 40) / 200;
    return cache[font] = {
      y: Math.max(0, +(fa - a - 0.04).toFixed(3)),
      h: Math.min(1.0, +(a + d + 0.08).toFixed(3))
    };
  }

  function applyHighlightMetrics(){
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.hl, mark.hl').forEach(el => {
      const cs = getComputedStyle(el);
      const k = metrics(`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`);
      el.style.setProperty('--mk-y', k.y);
      el.style.setProperty('--mk-h', k.h);
    });
  }

  if (typeof document !== 'undefined') {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(applyHighlightMetrics);
    } else {
      window.addEventListener('DOMContentLoaded', applyHighlightMetrics);
      setTimeout(applyHighlightMetrics, 80);
    }

    if (typeof IntersectionObserver !== 'undefined') {
      const hlObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('on');
            hlObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });

      document.querySelectorAll('.hl').forEach(el => {
        if (el.closest('#hero')) {
          setTimeout(() => el.classList.add('on'), 350);
        } else {
          hlObserver.observe(el);
        }
      });
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { metrics, applyHighlightMetrics };
  }
})();
