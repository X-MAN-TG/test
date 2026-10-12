// js/faq.js : "Ask Quanta about Quanta" interactive FAQ with streaming answers and documentation citations
(function(){
  const FAQ_ITEMS = [
    {
      id: '01',
      q: "Do I need an API key?",
      teaser: "Keyless quickstart or optional key protection",
      lead: "No. You can try Quanta without a key or an account.",
      body: "Open the workspace or call <code>/search</code> and it answers. If you run your own server and turn on key protection, you send it as an <mark class=\"hl\">X-API-Key</mark> header. Self-hosting is covered in the deployment docs.",
      citations: [
        { label: "docs · Quickstart", url: "/docs#quickstart" },
        { label: "docs · Configuration", url: "/docs#config" }
      ],
      sources: [
        { domain: "quanta.sh/docs/quickstart", status: "VERIFIED" },
        { domain: "quanta.sh/docs/config", status: "VERIFIED" }
      ],
      related: [1, 4]
    },
    {
      id: '02',
      q: "What is depth?",
      teaser: "From instant snippets to 36-page deep research",
      lead: "Depth is how much work Quanta does on a question.",
      body: "Instant answers from search snippets with no page reads (about 3–6 s). Fast reads a few pages, Deep reads about a dozen, Extreme about twenty, and <mark class=\"hl\">Ultra reads up to 36 pages</mark> with eight parallel agents. Pick the cheapest depth that fits the question.",
      citations: [
        { label: "docs · Depth", url: "/docs#depth" }
      ],
      sources: [
        { domain: "quanta.sh/docs/depth", status: "VERIFIED" },
        { domain: "quanta.sh/api/depths", status: "VERIFIED" }
      ],
      related: [2, 5]
    },
    {
      id: '03',
      q: "What are TeF, TeD and TeM?",
      teaser: "Model capability tiers for speed vs rigor",
      lead: "They are capability tiers for the language models doing the work:",
      body: "<mark class=\"hl\">TeF is the fast tier</mark>, TeD the deep tier and TeM the max tier. Higher tiers write better answers on hard questions and take longer. You choose one with the <code>model</code> field.",
      citations: [
        { label: "docs · Capability tiers", url: "/docs#tiers" }
      ],
      sources: [
        { domain: "quanta.sh/docs/models", status: "VERIFIED" }
      ],
      related: [1, 7]
    },
    {
      id: '04',
      q: "How are sources cited?",
      teaser: "Every statement tied to numbered domain evidence",
      lead: "Every claim in the answer carries a number like [1].",
      body: "Each number points to an entry in <code>sources</code> with its URL, domain, relevance score and whether Quanta <mark class=\"hl\">actually read the page</mark>. In the workspace, hover a number to see the source and click it to jump to the full card.",
      citations: [
        { label: "docs · Response", url: "/docs#response" }
      ],
      sources: [
        { domain: "quanta.sh/docs/response-schema", status: "VERIFIED" }
      ],
      related: [7, 8]
    },
    {
      id: '05',
      q: "Can I self-host it?",
      teaser: "FastAPI app deployable on Railway or Passenger",
      lead: "Yes. Quanta is a FastAPI app",
      body: "that runs on Railway or any cPanel/Passenger host. You get the API, the <code>/ask</code> workspace and these docs from <mark class=\"hl\">one deployment</mark>. Configuration is done with environment variables.",
      citations: [
        { label: "docs · Deployment", url: "/docs#deployment" },
        { label: "docs · Configuration", url: "/docs#config" }
      ],
      sources: [
        { domain: "quanta.sh/docs/deploy-railway", status: "VERIFIED" },
        { domain: "quanta.sh/docs/deploy-cpanel", status: "VERIFIED" }
      ],
      related: [0, 6]
    },
    {
      id: '06',
      q: "What does streaming look like?",
      teaser: "Server-Sent Events tracking research progression",
      lead: "Quanta streams Server-Sent Events while it works.",
      body: "You'll see <code>start</code>, <code>plan</code>, <code>provider</code>, <code>read_done</code>, then a stream of <mark class=\"hl\">token events</mark> with the answer, and <code>done</code> with telemetry at the end. That lets your interface show real progress instead of a spinner.",
      citations: [
        { label: "docs · Streaming", url: "/docs#streaming" },
        { label: "docs · Stream events", url: "/docs#events" }
      ],
      sources: [
        { domain: "quanta.sh/docs/sse", status: "VERIFIED" }
      ],
      related: [1, 3]
    },
    {
      id: '07',
      q: "Where is data stored?",
      teaser: "In-memory short-lived caches, zero persistence",
      lead: "Nowhere permanent.",
      body: "Quanta keeps <mark class=\"hl\">short-lived caches</mark> in memory and they clear when the server restarts. Questions and answers are not saved to a database by the app.",
      citations: [
        { label: "docs · FAQ", url: "/docs#faq" }
      ],
      sources: [
        { domain: "quanta.sh/docs/privacy", status: "VERIFIED" }
      ],
      related: [0, 4]
    },
    {
      id: '08',
      q: "Can it read every website?",
      teaser: "Paywall and robot detection with graceful fallback",
      lead: "No, and it says so.",
      body: "Some sites don't allow automated reading. When that happens Quanta marks the page <mark class=\"hl\">BLOCKED</mark>, uses the search snippet instead, and tells you in the result and the telemetry.",
      citations: [
        { label: "docs · Source engines", url: "/docs#engines" }
      ],
      sources: [
        { domain: "quanta.sh/docs/extraction-fallbacks", status: "VERIFIED" }
      ],
      related: [3, 8]
    },
    {
      id: '09',
      q: "Can the answer be wrong?",
      teaser: "Transparent citations allow immediate fact verification",
      lead: "Yes, any language-model answer can be.",
      body: "That's why Quanta cites every claim and shows its <mark class=\"hl\">sources, scores</mark> and which pages it read, so you can check the evidence yourself.",
      citations: [
        { label: "docs · How it works", url: "/docs#how-it-works" }
      ],
      sources: [
        { domain: "quanta.sh/docs/verification", status: "VERIFIED" }
      ],
      related: [3, 7]
    }
  ];

  let currentIndex = 0;
  let typingTimer = null;
  let idleTimer = null;
  let userInteracted = false;

  function initFAQ(){
    const listContainer = document.getElementById('faqList');
    const answerPanel = document.getElementById('faqAnswerPanel');
    const accordionContainer = document.getElementById('faqAccordion');
    if (!listContainer && !accordionContainer) return;

    // Render desktop list
    if (listContainer) {
      listContainer.innerHTML = '';
      FAQ_ITEMS.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'faq-row' + (idx === 0 ? ' active' : '');
        row.dataset.idx = idx;
        row.tabIndex = 0;
        row.setAttribute('role', 'button');
        row.setAttribute('aria-label', `${item.id}: ${item.q}`);

        row.innerHTML = `
          <div class="faq-row-num">${item.id}</div>
          <div class="faq-row-info">
            <h3 class="faq-row-q">${item.q}</h3>
            <span class="faq-row-teaser">${item.teaser}</span>
          </div>
          <div class="faq-row-arrow" aria-hidden="true">→</div>
        `;

        row.addEventListener('click', () => {
          userInteracted = true;
          selectQuestion(idx);
        });

        row.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            userInteracted = true;
            selectQuestion(idx);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            userInteracted = true;
            const next = (idx + 1) % FAQ_ITEMS.length;
            const nextEl = listContainer.querySelector(`[data-idx="${next}"]`);
            nextEl?.focus();
            selectQuestion(next);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            userInteracted = true;
            const prev = (idx - 1 + FAQ_ITEMS.length) % FAQ_ITEMS.length;
            const prevEl = listContainer.querySelector(`[data-idx="${prev}"]`);
            prevEl?.focus();
            selectQuestion(prev);
          }
        });

        listContainer.appendChild(row);
      });
    }

    // Render mobile accordion
    if (accordionContainer) {
      accordionContainer.innerHTML = '';
      FAQ_ITEMS.forEach((item, idx) => {
        const details = document.createElement('details');
        details.className = 'faq-acc-item';
        if (idx === 0) details.open = true;

        details.innerHTML = `
          <summary class="faq-acc-summary">
            <span class="faq-acc-num">${item.id}</span>
            <span class="faq-acc-q">${item.q}</span>
          </summary>
          <div class="faq-acc-body" id="faqAccBody_${idx}">
            <!-- streamed answer inside mobile accordion -->
          </div>
        `;

        details.addEventListener('toggle', () => {
          if (details.open) {
            userInteracted = true;
            streamAccordionAnswer(idx);
          }
        });

        accordionContainer.appendChild(details);
      });
    }

    // Select first question by default
    selectQuestion(0, true);

    // Auto-advance loop (12s idle until interaction)
    scheduleAutoAdvance();
  }

  function scheduleAutoAdvance(){
    clearTimeout(idleTimer);
    if (userInteracted) return;
    idleTimer = setTimeout(() => {
      if (!userInteracted) {
        const next = (currentIndex + 1) % FAQ_ITEMS.length;
        selectQuestion(next);
        scheduleAutoAdvance();
      }
    }, 12000);
  }

  function selectQuestion(idx, isInitial = false){
    currentIndex = idx;
    const listContainer = document.getElementById('faqList');
    if (listContainer) {
      listContainer.querySelectorAll('.faq-row').forEach((r, i) => {
        r.classList.toggle('active', i === idx);
      });
    }

    streamAnswerDesktop(idx, isInitial);
  }

  function streamAnswerDesktop(idx, isInitial = false){
    const panel = document.getElementById('faqAnswerPanel');
    if (!panel) return;

    clearTimeout(typingTimer);
    const item = FAQ_ITEMS[idx];
    const RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

    panel.innerHTML = `
      <div class="faq-panel-progress" id="faqProgress">
        <div class="faq-panel-bar"></div>
        <span class="faq-stage-line">Reading the docs…</span>
      </div>
      <div class="faq-answer-inner">
        <h3 class="faq-ans-title">${item.q}</h3>
        <div class="faq-ans-text" id="faqAnsText"></div>
        <div class="faq-citations" id="faqCitations" style="display:none">
          <span class="faq-cit-label">Docs:</span>
          ${item.citations.map(c => `<a class="faq-pill" href="${c.url}">${c.label}</a>`).join('')}
        </div>
        <div class="faq-sources-strip" id="faqSourcesStrip" style="display:none">
          <span class="faq-src-title">SOURCES CONSULTED</span>
          <div class="faq-src-list">
            ${item.sources.map(s => `<span class="faq-src-item"><i class="dot ok"></i> ${s.domain}</span>`).join('')}
          </div>
        </div>
        <div class="faq-related-row" id="faqRelatedRow" style="display:none">
          <span class="dim" style="font-size:0.8rem">Related:</span>
          ${item.related.map(rIdx => `
            <button type="button" class="chip faq-related-btn" data-r="${rIdx}">
              ${FAQ_ITEMS[rIdx].q}
            </button>
          `).join('')}
          <a class="faq-docs-link" href="/docs">Read more in the docs →</a>
        </div>
      </div>
    `;

    // Attach related buttons click
    panel.querySelectorAll('.faq-related-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        userInteracted = true;
        const rIdx = parseInt(btn.dataset.r, 10);
        selectQuestion(rIdx);
      });
    });

    const progressBar = panel.querySelector('#faqProgress');
    const textContainer = panel.querySelector('#faqAnsText');
    const citContainer = panel.querySelector('#faqCitations');
    const srcContainer = panel.querySelector('#faqSourcesStrip');
    const relContainer = panel.querySelector('#faqRelatedRow');

    if (RM || isInitial) {
      if (progressBar) progressBar.style.display = 'none';
      textContainer.innerHTML = `<p class="faq-lead"><strong>${item.lead}</strong></p><p>${item.body}</p>`;
      citContainer.style.display = 'flex';
      srcContainer.style.display = 'block';
      relContainer.style.display = 'flex';
      // Trigger highlight metrics
      textContainer.querySelectorAll('.hl').forEach(h => h.classList.add('on'));
      return;
    }

    // Step 1: 400ms progress bar researching
    setTimeout(() => {
      if (progressBar) progressBar.classList.add('fade-out');

      // Step 2: Stream answer text (typewriter at ~120 chars/s = ~8ms per char)
      const fullText = `${item.lead} ${item.body.replace(/<[^>]+>/g, '')}`;
      let charIdx = 0;
      textContainer.innerHTML = `<p class="faq-lead"><strong>${item.lead}</strong></p><p id="faqBodyStream"></p>`;
      const streamP = textContainer.querySelector('#faqBodyStream');

      const bodyClean = item.body.replace(/<[^>]+>/g, '');
      function typeChar(){
        if (charIdx < bodyClean.length) {
          charIdx += 2; // ~120 chars/sec
          streamP.textContent = bodyClean.slice(0, charIdx);
          typingTimer = setTimeout(typeChar, 16);
        } else {
          // Finished typewriter: inject full rich HTML with .hl and code tags
          textContainer.innerHTML = `<p class="faq-lead"><strong>${item.lead}</strong></p><p>${item.body}</p>`;
          citContainer.style.display = 'flex';
          srcContainer.style.display = 'block';
          relContainer.style.display = 'flex';
          // trigger highlight wipe
          setTimeout(() => {
            textContainer.querySelectorAll('.hl').forEach(h => h.classList.add('on'));
          }, 60);
        }
      }
      typeChar();
    }, 400);
  }

  function streamAccordionAnswer(idx){
    const container = document.getElementById(`faqAccBody_${idx}`);
    if (!container) return;
    const item = FAQ_ITEMS[idx];
    container.innerHTML = `
      <p class="faq-lead"><strong>${item.lead}</strong></p>
      <p>${item.body}</p>
      <div class="faq-citations">
        ${item.citations.map(c => `<a class="faq-pill" href="${c.url}">${c.label}</a>`).join('')}
      </div>
      <div class="faq-sources-strip">
        <div class="faq-src-list">
          ${item.sources.map(s => `<span class="faq-src-item"><i class="dot ok"></i> ${s.domain}</span>`).join('')}
        </div>
      </div>
    `;
    setTimeout(() => {
      container.querySelectorAll('.hl').forEach(h => h.classList.add('on'));
    }, 60);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initFAQ);
    } else {
      initFAQ();
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initFAQ, FAQ_ITEMS };
  }
})();
