// js/receipt.js : Animated thermal receipt printer
(function(){
  const RECEIPT_DATA = [
    { label: 'Search angles', value: 6, display: '6' },
    { label: 'Live providers', value: 7, display: '7' },
    { label: 'Raw results', value: 261, display: '261' },
    { label: 'Unique results', value: 175, display: '175' },
    { label: 'Shortlisted', value: 36, display: '36' },
    { label: 'Pages read', value: 10, display: '10' },
    { label: 'Words extracted', value: 30066, display: '30,066' }
  ];

  let loopTimeout = null;
  let isPrinting = false;

  function initReceipt(){
    const container = document.getElementById('receiptPrinter');
    if (!container) return;

    // Click to copy receipt as plain text
    container.addEventListener('click', (e) => {
      // Don't trigger if clicked replay button
      if (e.target.closest('#receiptReplayBtn')) return;
      copyReceiptText();
    });

    // Replay button / hover replay
    const replayBtn = document.getElementById('receiptReplayBtn');
    if (replayBtn) {
      replayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetAndPrint();
      });
    }

    container.addEventListener('mouseenter', () => {
      // Allow user to trigger replay on hover if done
      if (!isPrinting) {
        // container.dataset.hovered = 'true';
      }
    });

    // Intersection observer
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!isPrinting && !loopTimeout) {
            printReceipt();
          }
        } else {
          clearTimeout(loopTimeout);
          loopTimeout = null;
        }
      });
    }, { threshold: 0.2 });

    obs.observe(container);

    // Initial print
    printReceipt();
  }

  function resetAndPrint(){
    clearTimeout(loopTimeout);
    loopTimeout = null;
    isPrinting = false;
    printReceipt();
  }

  function copyReceiptText(){
    const lines = [
      "==================================",
      "     QUANTA RESEARCH RECEIPT      ",
      "==================================",
      ...RECEIPT_DATA.map(d => `${d.label.padEnd(20, '.')} ${d.display}`),
      "----------------------------------",
      "TOTAL TIME ................. ~52 s",
      "==================================",
      "     PROVENANCE VERIFIED OK       "
    ];
    const text = lines.join("\n");
    navigator.clipboard?.writeText(text).then(() => {
      showToast("Receipt copied");
    }).catch(() => {});
  }

  function showToast(msg){
    let toast = document.getElementById('globalToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'globalToast';
      toast.className = 'glass g3 toast-box';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  function printReceipt(){
    const paper = document.getElementById('receiptPaper');
    const slotLed = document.getElementById('receiptSlotLed');
    if (!paper) return;

    clearTimeout(loopTimeout);
    isPrinting = true;

    const RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

    // Reset styles
    paper.classList.remove('torn');
    paper.style.transform = 'translateY(0)';
    paper.innerHTML = '';
    if (slotLed) slotLed.className = 'rcpt-led printing';

    if (RM) {
      renderStaticReceipt(paper);
      if (slotLed) slotLed.className = 'rcpt-led idle';
      isPrinting = false;
      return;
    }

    // 1. Header
    const head = document.createElement('div');
    head.className = 'rcpt-head';
    paper.appendChild(head);

    const headTitle = "QUANTA RESEARCH RECEIPT";
    let hIdx = 0;
    function typeHead(){
      if (hIdx < headTitle.length) {
        head.textContent += headTitle[hIdx++];
        loopTimeout = setTimeout(typeHead, 25);
      } else {
        const hr = document.createElement('div');
        hr.className = 'rcpt-dash-line';
        paper.appendChild(hr);
        loopTimeout = setTimeout(() => printRows(0), 100);
      }
    }
    typeHead();

    // 2. Rows
    function printRows(rowIdx){
      if (rowIdx >= RECEIPT_DATA.length) {
        // Total line
        printTotal();
        return;
      }

      const item = RECEIPT_DATA[rowIdx];
      const row = document.createElement('div');
      row.className = 'rcpt-row';
      const labelSpan = document.createElement('span');
      labelSpan.className = 'rcpt-label';
      const leader = document.createElement('span');
      leader.className = 'rcpt-leader';
      const valSpan = document.createElement('span');
      valSpan.className = 'rcpt-val';

      row.append(labelSpan, leader, valSpan);
      paper.appendChild(row);

      // translateY step on paper with small jitter
      const currentHeight = paper.scrollHeight;
      const jitter = (Math.random() - 0.5) * 2;
      paper.style.transform = `translateY(${jitter}px)`;

      // Type label
      let lIdx = 0;
      function typeLabel(){
        if (lIdx < item.label.length) {
          labelSpan.textContent += item.label[lIdx++];
          loopTimeout = setTimeout(typeLabel, 20);
        } else {
          // extend leader
          leader.classList.add('grow');
          // count up value
          countUpVal(valSpan, item.value, item.display, () => {
            loopTimeout = setTimeout(() => printRows(rowIdx + 1), 70);
          });
        }
      }
      typeLabel();
    }

    function countUpVal(el, targetNum, formattedStr, cb){
      const steps = 6;
      let step = 0;
      const interval = setInterval(() => {
        step++;
        const curr = Math.round((step / steps) * targetNum);
        el.textContent = curr.toLocaleString();
        if (step >= steps) {
          clearInterval(interval);
          el.textContent = formattedStr;
          cb();
        }
      }, 25);
    }

    // 3. Total Time + Stamp
    function printTotal(){
      const tot = document.createElement('div');
      tot.className = 'rcpt-total';
      tot.innerHTML = `<span>TOTAL TIME</span><span class="rcpt-leader grow"></span><span class="rcpt-stamp">~52 s</span>`;
      paper.appendChild(tot);

      // 4. Barcode
      loopTimeout = setTimeout(() => {
        const bc = document.createElement('div');
        bc.className = 'rcpt-barcode';
        paper.appendChild(bc);

        // Perforated line
        const perf = document.createElement('div');
        perf.className = 'rcpt-perf';
        paper.appendChild(perf);

        if (slotLed) slotLed.className = 'rcpt-led idle';
        isPrinting = false;

        // Hold 6s, then tear off and slide away
        loopTimeout = setTimeout(tearOffAndRestart, 6000);
      }, 350);
    }

    function tearOffAndRestart(){
      paper.classList.add('torn');
      loopTimeout = setTimeout(() => {
        paper.innerHTML = '';
        paper.classList.remove('torn');
        loopTimeout = setTimeout(printReceipt, 600);
      }, 1200);
    }
  }

  function renderStaticReceipt(paper){
    paper.innerHTML = `
      <div class="rcpt-head">QUANTA RESEARCH RECEIPT</div>
      <div class="rcpt-dash-line"></div>
      ${RECEIPT_DATA.map(d => `
        <div class="rcpt-row">
          <span class="rcpt-label">${d.label}</span>
          <span class="rcpt-leader grow"></span>
          <span class="rcpt-val">${d.display}</span>
        </div>
      `).join('')}
      <div class="rcpt-total">
        <span>TOTAL TIME</span>
        <span class="rcpt-leader grow"></span>
        <span class="rcpt-stamp">~52 s</span>
      </div>
      <div class="rcpt-barcode"></div>
      <div class="rcpt-perf"></div>
    `;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initReceipt);
    } else {
      initReceipt();
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initReceipt, printReceipt, copyReceiptText };
  }
})();
