// js/telemetry.js : Time-accurate waterfall chart & synchronized telemetry dashboard
(function(){
  const TOTAL_MS = 52037;
  const COMPRESSED_DURATION_MS = 9000; // 9s sweep for 52s compressed
  const HOLD_MS = 5000;

  const STAGES = [
    {
      name: 'plan',
      start: 0,
      end: 11965,
      dur: 11965,
      pct: '23.0%',
      desc: '6 search angles planned and formulated for depth',
      color: '#4C6FFF'
    },
    {
      name: 'search',
      start: 11965,
      end: 14981,
      dur: 3016,
      pct: '5.8%',
      desc: '7 search providers queried in parallel (261 raw hits)',
      color: '#2DE2C0'
    },
    {
      name: 'rank',
      start: 14981,
      end: 15009,
      dur: 28,
      pct: '0.05%',
      desc: 'Deduplicated to 175 unique, ranked by 6 signals into 36 shortlisted',
      color: '#FFD84D'
    },
    {
      name: 'read',
      start: 15009,
      end: 25392,
      dur: 10383,
      pct: '20.0%',
      desc: '10 primary pages fetched, stripped, and extracted (30,066 words)',
      color: '#FF6B5A'
    },
    {
      name: 'write',
      start: 25392,
      end: 52037,
      dur: 26645,
      pct: '51.2%',
      desc: 'Parallel agents synthesize evidence, final writer streams cited answer',
      color: '#A78BFA'
    }
  ];

  let rafId = null;
  let startTime = null;
  let isPaused = false;
  let pauseStartTime = 0;
  let totalPausedOffset = 0;
  let isHolding = false;

  function initTelemetry(){
    const chart = document.getElementById('telemetryWaterfall');
    if (!chart) return;

    renderChartSkeleton();

    // Hover pauses loop
    chart.addEventListener('mouseenter', () => {
      isPaused = true;
      pauseStartTime = performance.now();
    });
    chart.addEventListener('mouseleave', () => {
      if (isPaused) {
        totalPausedOffset += (performance.now() - pauseStartTime);
        isPaused = false;
      }
    });

    // Tooltip handler
    const tooltip = document.getElementById('wfTooltip');
    const bars = chart.querySelectorAll('.wf-bar-wrap');
    bars.forEach(wrap => {
      wrap.addEventListener('mousemove', (e) => {
        if (!tooltip) return;
        const stageName = wrap.dataset.stage;
        const info = STAGES.find(s => s.name === stageName);
        if (!info) return;
        tooltip.innerHTML = `<strong>${info.name.toUpperCase()}</strong>: ${(info.start/1000).toFixed(1)}s → ${(info.end/1000).toFixed(1)}s (${(info.dur/1000).toFixed(1)}s, ${info.pct})<br><span style="opacity:0.8">${info.desc}</span>`;
        tooltip.style.display = 'block';
        const chartRect = chart.getBoundingClientRect();
        tooltip.style.left = Math.min(chartRect.width - 240, Math.max(10, e.clientX - chartRect.left + 15)) + 'px';
        tooltip.style.top = Math.max(10, e.clientY - chartRect.top - 45) + 'px';
      });
      wrap.addEventListener('mouseleave', () => {
        if (tooltip) tooltip.style.display = 'none';
      });
    });

    // Intersection observer to start/stop loop
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          startPlayback();
        } else {
          stopPlayback();
        }
      });
    }, { threshold: 0.15 });
    obs.observe(chart);
  }

  function renderChartSkeleton(){
    const axis = document.getElementById('wfAxis');
    const rows = document.getElementById('wfRows');
    if (!axis || !rows) return;

    // Time ticks: 0, 10, 20, 30, 40, 50, 52s
    const ticks = [0, 10, 20, 30, 40, 50, 52];
    axis.innerHTML = '';
    ticks.forEach(sec => {
      const pct = (sec * 1000 / TOTAL_MS) * 100;
      const t = document.createElement('div');
      t.className = 'wf-tick';
      t.style.left = pct + '%';
      t.innerHTML = `<span>${sec}s</span><i class="wf-gridline"></i>`;
      axis.appendChild(t);
    });

    // Rows
    rows.innerHTML = '';
    STAGES.forEach(s => {
      const row = document.createElement('div');
      row.className = 'wf-row';
      row.dataset.stage = s.name;

      const label = document.createElement('div');
      label.className = 'wf-label';
      label.innerHTML = `<span class="wf-tag">${s.name}</span>`;

      const track = document.createElement('div');
      track.className = 'wf-track';

      const barWrap = document.createElement('div');
      barWrap.className = 'wf-bar-wrap';
      barWrap.dataset.stage = s.name;
      const leftPct = (s.start / TOTAL_MS) * 100;
      const maxPct = (s.dur / TOTAL_MS) * 100;
      barWrap.style.left = leftPct + '%';
      barWrap.style.width = maxPct + '%';

      const barFill = document.createElement('div');
      barFill.className = 'wf-bar-fill';
      barFill.id = `wfBar_${s.name}`;
      barFill.style.width = '0%';
      barFill.style.backgroundColor = s.color;

      const cap = document.createElement('div');
      cap.className = 'wf-bar-cap';

      const meta = document.createElement('span');
      meta.className = 'wf-bar-meta';
      meta.textContent = `${(s.dur/1000).toFixed(1)}s · ${s.pct}`;

      barFill.appendChild(cap);
      barFill.appendChild(meta);

      if (s.name === 'write') {
        const spark = document.createElement('div');
        spark.className = 'wf-sparkline';
        spark.innerHTML = `<svg viewBox="0 0 100 20" preserveAspectRatio="none"><path d="M0 15 Q25 5 50 12 T100 8" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2"/></svg>`;
        barFill.appendChild(spark);
      }

      barWrap.appendChild(barFill);
      track.appendChild(barWrap);
      row.append(label, track);
      rows.appendChild(row);
    });
  }

  function startPlayback(){
    if (rafId) return;
    startTime = performance.now();
    totalPausedOffset = 0;
    isHolding = false;
    isPaused = false;
    rafId = requestAnimationFrame(animateLoop);
  }

  function stopPlayback(){
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function animateLoop(now){
    const RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    if (RM) {
      setImmediateFinalState();
      return;
    }

    if (!isPaused && !isHolding) {
      const elapsed = (now - startTime - totalPausedOffset);
      const progress = Math.min(1, elapsed / COMPRESSED_DURATION_MS);
      const currentMs = progress * TOTAL_MS;

      updateElements(currentMs, progress);

      if (progress >= 1) {
        // Complete sweep: show chip, hold 5s, then restart
        isHolding = true;
        const chip = document.getElementById('wfTotalChip');
        if (chip) chip.classList.add('pop');

        setTimeout(() => {
          if (chip) chip.classList.remove('pop');
          startTime = performance.now();
          totalPausedOffset = 0;
          isHolding = false;
          // reset bars
          STAGES.forEach(s => {
            const bar = document.getElementById(`wfBar_${s.name}`);
            if (bar) bar.style.width = '0%';
          });
        }, HOLD_MS);
      }
    }

    rafId = requestAnimationFrame(animateLoop);
  }

  function updateElements(currentMs, progress){
    // Update playhead & clock
    const playhead = document.getElementById('wfPlayhead');
    const clock = document.getElementById('wfClock');
    const playheadPct = progress * 100;

    if (playhead) {
      playhead.style.left = playheadPct + '%';
    }

    if (clock) {
      const totalSec = currentMs / 1000;
      const mins = Math.floor(totalSec / 60);
      const secs = (totalSec % 60).toFixed(1);
      clock.textContent = `${String(mins).padStart(2,'0')}:${secs.padStart(4,'0')}`;
    }

    // Update each bar
    let activeStageName = null;
    STAGES.forEach(s => {
      const bar = document.getElementById(`wfBar_${s.name}`);
      if (!bar) return;

      if (currentMs < s.start) {
        bar.style.width = '0%';
        bar.classList.remove('growing', 'done');
      } else if (currentMs >= s.start && currentMs <= s.end) {
        activeStageName = s.name;
        const stageProgress = (currentMs - s.start) / s.dur;
        bar.style.width = (stageProgress * 100) + '%';
        bar.classList.add('growing');
        bar.classList.remove('done');
      } else {
        bar.style.width = '100%';
        bar.classList.remove('growing');
        bar.classList.add('done');
      }
    });

    // Update legend highlight
    document.querySelectorAll('.wf-row').forEach(r => {
      r.classList.toggle('active', r.dataset.stage === activeStageName);
    });

    // Coupled Stat tiles:
    // candidates: 0 -> 175 (settles after rank ~15s)
    const candTile = document.getElementById('telemetryCandidates');
    if (candTile) {
      const candMax = 175;
      const k = Math.min(1, currentMs / 15000);
      candTile.textContent = Math.round(candMax * k).toLocaleString();
    }

    // pages: 0 -> 10 (settles after read ~25.4s)
    const pagesTile = document.getElementById('telemetryPages');
    if (pagesTile) {
      const pagesMax = 10;
      const k = Math.min(1, Math.max(0, (currentMs - 15000) / 10383));
      pagesTile.textContent = Math.round(pagesMax * k);
    }

    // words: 0 -> 30,066 (settles after read ~25.4s)
    const wordsTile = document.getElementById('telemetryWords');
    if (wordsTile) {
      const wordsMax = 30066;
      const k = Math.min(1, Math.max(0, (currentMs - 15000) / 10383));
      wordsTile.textContent = Math.round(wordsMax * k).toLocaleString();
    }

    // Circular gauges (Efficiency 100%, Pages read 28%, Providers 100%)
    updateGauges(progress);
  }

  function updateGauges(progress){
    // Efficiency: 100% (12,153 requested / 27,665 used, 0 wasted, 5 model calls)
    const effArc = document.getElementById('gaugeEffArc');
    const effVal = document.getElementById('gaugeEffVal');
    if (effArc) {
      const p = Math.min(1, progress * 1.2);
      effArc.style.strokeDashoffset = 100 - (p * 100);
    }
    if (effVal) effVal.textContent = '100%';

    // Pages read: 10 / 36 (28%)
    const pgArc = document.getElementById('gaugePgArc');
    const pgVal = document.getElementById('gaugePgVal');
    if (pgArc) {
      const p = Math.min(1, Math.max(0, (progress - 0.28) * 1.5));
      pgArc.style.strokeDashoffset = 100 - (p * 28);
    }
    if (pgVal) pgVal.textContent = '10 / 36';

    // Providers live: 7 / 7 (100%)
    const provArc = document.getElementById('gaugeProvArc');
    const provVal = document.getElementById('gaugeProvVal');
    if (provArc) {
      const p = Math.min(1, progress * 1.8);
      provArc.style.strokeDashoffset = 100 - (p * 100);
    }
    if (provVal) provVal.textContent = '7';
  }

  function setImmediateFinalState(){
    STAGES.forEach(s => {
      const bar = document.getElementById(`wfBar_${s.name}`);
      if (bar) {
        bar.style.width = '100%';
        bar.classList.add('done');
      }
    });
    const candTile = document.getElementById('telemetryCandidates');
    if (candTile) candTile.textContent = '175';
    const pagesTile = document.getElementById('telemetryPages');
    if (pagesTile) pagesTile.textContent = '10';
    const wordsTile = document.getElementById('telemetryWords');
    if (wordsTile) wordsTile.textContent = '30,066';
    const clock = document.getElementById('wfClock');
    if (clock) clock.textContent = '00:52.0';
    const playhead = document.getElementById('wfPlayhead');
    if (playhead) playhead.style.left = '100%';
    const chip = document.getElementById('wfTotalChip');
    if (chip) chip.classList.add('pop');
    updateGauges(1);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initTelemetry);
    } else {
      initTelemetry();
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initTelemetry, STAGES };
  }
})();
