// js/landing.js : Core landing page interactions (Pipeline visual, comparison matrix, depth dial, scrollytelling, constellation)
(function(){
  const H = typeof document !== 'undefined' ? document.documentElement : null;
  const RM = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion:reduce)') : { matches: false };

  // ===================== Pipeline visual (Six Tools. One Call.) =====================
  function initPipelineVisual(){
    const panel = document.getElementById('pipePanel');
    if (!panel) return;

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const svg = document.getElementById('pipeSvg');
    const mergeNode = document.getElementById('pipeMergeNode');
    const trunkLine = document.getElementById('pipeTrunkLine');
    const endpointCard = document.getElementById('pipeEndpointCard');
    const responseCard = document.getElementById('pipeResponseCard');
    const countA = document.getElementById('pipeCountA');
    const countB = document.getElementById('pipeCountB');
    const tag = document.getElementById('pipeTag');
    const cards = document.querySelectorAll('.pipe-card');
    if (!svg) return;

    // 6 Wires setup
    // Paths run from (x0=0, y0) to merge node (xm=180, ym=220)
    const cardY = [40, 110, 180, 250, 320, 390];
    const mergeX = 180, mergeY = 220;

    // Tangled curves control points (wavy, crossing)
    const tangledPaths = [
      `M 0 40 C 60 140, 100 -20, ${mergeX} ${mergeY}`,
      `M 0 110 C 120 20, 60 280, ${mergeX} ${mergeY}`,
      `M 0 180 C 40 300, 130 90, ${mergeX} ${mergeY}`,
      `M 0 250 C 90 90, 70 360, ${mergeX} ${mergeY}`,
      `M 0 320 C 140 180, 60 420, ${mergeX} ${mergeY}`,
      `M 0 390 C 80 240, 120 120, ${mergeX} ${mergeY}`
    ];

    // Untangled curves (smooth, elegant convergence)
    const untangledPaths = [
      `M 0 40 C 80 40, 110 ${mergeY}, ${mergeX} ${mergeY}`,
      `M 0 110 C 70 110, 110 ${mergeY}, ${mergeX} ${mergeY}`,
      `M 0 180 C 60 180, 120 ${mergeY}, ${mergeX} ${mergeY}`,
      `M 0 250 C 60 250, 120 ${mergeY}, ${mergeX} ${mergeY}`,
      `M 0 320 C 70 320, 110 ${mergeY}, ${mergeX} ${mergeY}`,
      `M 0 390 C 80 390, 110 ${mergeY}, ${mergeX} ${mergeY}`
    ];

    const pathElements = [];
    const packetElements = [];

    // Create paths in SVG
    svg.innerHTML = '';
    // Trunk line to right
    const trunk = document.createElementNS(SVG_NS, 'line');
    trunk.setAttribute('x1', mergeX);
    trunk.setAttribute('y1', mergeY);
    trunk.setAttribute('x2', 240);
    trunk.setAttribute('y2', mergeY);
    trunk.setAttribute('class', 'pipe-trunk');
    svg.appendChild(trunk);

    const wireColors = ['#4C6FFF', '#2DE2C0', '#FF6B5A', '#A78BFA', '#FEBC2E', '#34D399'];
    for (let i = 0; i < 6; i++) {
      const p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', tangledPaths[i]);
      p.setAttribute('class', 'pipe-wire');
      p.setAttribute('stroke', wireColors[i]);
      svg.appendChild(p);
      pathElements.push(p);

      // Traveling packet circle
      const dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('r', '4');
      dot.setAttribute('class', 'pipe-packet');
      dot.setAttribute('fill', wireColors[i]);
      svg.appendChild(dot);
      packetElements.push(dot);
    }

    let loopTimeout = null;
    let animRaf = null;
    let loopStartTime = 0;

    function playPipelineLoop(){
      if (RM.matches) {
        setPipelineSettled();
        return;
      }

      loopStartTime = performance.now();
      cards.forEach((c, idx) => {
        c.classList.remove('settled');
        c.classList.add('tangled');
        const stat = c.querySelector('.pipe-stat-text');
        if (stat) {
          stat.textContent = stat.dataset.err || 'error';
          stat.className = 'pipe-stat-text err';
        }
      });
      trunk.classList.remove('merged');
      if (endpointCard) endpointCard.classList.remove('active');
      if (responseCard) responseCard.classList.remove('active');
      if (countA) countA.textContent = '6';
      if (countB) countB.classList.remove('ok');
      if (tag) tag.textContent = '6 integrations tangled';

      pathElements.forEach((p, i) => p.setAttribute('d', tangledPaths[i]));

      function step(now){
        const elapsed = (now - loopStartTime) / 1000; // in seconds

        // 0.0 - 1.2s: Cards fade-rise, tangled status
        if (elapsed < 1.4) {
          // move packets randomly along tangled paths
          packetElements.forEach((dot, i) => {
            const p = pathElements[i];
            const len = p.getTotalLength();
            const pt = p.getPointAtLength((((elapsed * 0.4 + i * 0.15) % 1) * len));
            dot.setAttribute('cx', pt.x);
            dot.setAttribute('cy', pt.y);
          });
        }
        // 1.4 - 3.0s: Untangle transition
        else if (elapsed >= 1.4 && elapsed < 3.0) {
          const k = Math.min(1, (elapsed - 1.4) / 1.6);
          // interpolate paths
          pathElements.forEach((p, i) => {
            if (k > 0.5) {
              p.setAttribute('d', untangledPaths[i]);
            }
          });
          cards.forEach((c) => {
            c.classList.remove('tangled');
            c.classList.add('settled');
            const stat = c.querySelector('.pipe-stat-text');
            if (stat) {
              stat.textContent = 'ok';
              stat.className = 'pipe-stat-text ok';
            }
          });
          if (tag) tag.textContent = 'Converging streams...';

          packetElements.forEach((dot, i) => {
            const p = pathElements[i];
            const len = p.getTotalLength();
            const pt = p.getPointAtLength((((elapsed * 0.9 + i * 0.15) % 1) * len));
            dot.setAttribute('cx', pt.x);
            dot.setAttribute('cy', pt.y);
          });
        }
        // 3.0 - 4.0s: Merge into citrus line
        else if (elapsed >= 3.0 && elapsed < 4.0) {
          trunk.classList.add('merged');
          if (countB) countB.classList.add('ok');
          if (tag) tag.textContent = 'Collapsed into 1 request';
        }
        // 4.0 - 5.5s: Endpoint & response card slide in
        else if (elapsed >= 4.0 && elapsed < 5.5) {
          if (endpointCard) endpointCard.classList.add('active');
          if (responseCard) responseCard.classList.add('active');
          if (countA) countA.textContent = '1';
        }
        // 5.5 - 8.0s: Hold settled
        else if (elapsed >= 5.5 && elapsed < 8.0) {
          // hold
        }
        // 8.0 - 9.0s: Soft reset and loop
        else if (elapsed >= 9.0) {
          playPipelineLoop();
          return;
        }

        animRaf = requestAnimationFrame(step);
      }

      cancelAnimationFrame(animRaf);
      animRaf = requestAnimationFrame(step);
    }

    function setPipelineSettled(){
      cards.forEach(c => {
        c.classList.add('settled');
        const stat = c.querySelector('.pipe-stat-text');
        if (stat) {
          stat.textContent = 'ok';
          stat.className = 'pipe-stat-text ok';
        }
      });
      pathElements.forEach((p, i) => p.setAttribute('d', untangledPaths[i]));
      trunk.classList.add('merged');
      if (endpointCard) endpointCard.classList.add('active');
      if (responseCard) responseCard.classList.add('active');
      if (countA) countA.textContent = '1';
      if (countB) countB.classList.add('ok');
      if (tag) tag.textContent = '1 request';
    }

    // Parallax on hover
    panel.addEventListener('mousemove', (e) => {
      const rect = panel.getBoundingClientRect();
      const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      pathElements.forEach((p, idx) => {
        p.style.transform = `translateY(${dy * (idx - 2.5) * 2}px)`;
      });
    });
    panel.addEventListener('mouseleave', () => {
      pathElements.forEach(p => p.style.transform = '');
    });

    playPipelineLoop();
  }

  // ===================== Comparison Matrix (Three Ways to Get an Answer) =====================
  function initComparisonMatrix(){
    const matrix = document.getElementById('cmpMatrix');
    if (!matrix) return;

    // Mobile tabs
    const tabs = document.querySelectorAll('.cmp-tab-btn');
    const cols = document.querySelectorAll('.cmp-col');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.target;
        cols.forEach(col => {
          col.classList.toggle('active-mobile', col.dataset.col === target);
        });
      });
    });

    // Row hover highlight across columns
    const rows = matrix.querySelectorAll('.cmp-row-group');
    rows.forEach(r => {
      r.addEventListener('mouseenter', () => {
        rows.forEach(other => other.classList.toggle('dimmed', other !== r));
        r.classList.add('highlighted');
      });
      r.addEventListener('mouseleave', () => {
        rows.forEach(other => other.classList.remove('dimmed', 'highlighted'));
      });
    });

    // Animate score meters on view
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          matrix.querySelectorAll('.cmp-meter-bar').forEach(bar => {
            bar.style.width = bar.dataset.score + '%';
          });
          // Draw icons
          matrix.querySelectorAll('.chk-draw').forEach(p => {
            p.classList.add('draw');
          });
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    obs.observe(matrix);
  }

  // Initialize all landing interactions
  function initLanding(){
    initPipelineVisual();
    initComparisonMatrix();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initLanding);
    } else {
      initLanding();
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initLanding, initPipelineVisual, initComparisonMatrix };
  }
})();
