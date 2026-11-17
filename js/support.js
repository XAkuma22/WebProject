/* =============================================================================
   support.js
   Support site content: product pages, topic accordion, search, article feedback, video tutorial.
   ============================================================================= */
(() => {
  'use strict';
  const PF = window.PF;
  if (!PF || PF.redirecting) return;
  const { FILE, KEYS, store, getSession, signinUrl, $, $$, h, norm, toTerms, icon, openDialog, PRODUCTS, TOPICS, CATALOG, articleCard } = PF;

  /* ---------- Products, popular articles, product pages -------------------- */
  function initProducts() {
    $$('[data-products]').forEach((ul) => {
      ul.replaceChildren(...Object.values(PRODUCTS).map((p) =>
        h('li', {}, h('a', { class: 'product-card', href: p.href }, h('img', {src: p.img.startsWith('images/') ? p.img : 'images/' + p.img, alt: '', loading: 'lazy', decoding: 'async' }), h('span', {}, p.name)))));
    });
    $$('[data-popular]').forEach((ul) => ul.replaceChildren(...CATALOG.slice(0, 4).map((a) => articleCard(a, true))));
  }

  function buildModels(p) {
    const tablist = h('div', { class: 'tabs', role: 'tablist', 'aria-label': p.name + ' models' });
    const panel = h('div', { class: 'model-panel', role: 'tabpanel', id: 'modelPanel', tabindex: '0' });

    const select = (i, focus) => {
      tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      const m = p.models[i];
      panel.setAttribute('aria-labelledby', 'tab-' + i);
      panel.replaceChildren(
        h('div', { class: 'model-head' }, h('h3', { class: 'model-name' }, m.name), h('span', { class: 'badge' }, m.year)),
        h('p', { class: 'model-tag' }, m.tag),
        h('dl', { class: 'spec-grid' }, p.labels.map((l, k) => h('div', { class: 'spec' }, h('dt', {}, l), h('dd', {}, m.v[k])))),
        h('a', { class: 'model-link', href: 'chat.html' }, 'Need help with your ' + m.name + '? Chat with us ›'));
      if (focus) tabs[i].focus();
    };

    const tabs = p.models.map((m, i) => {
      const tab = h('button', { type: 'button', class: 'tab', role: 'tab', id: 'tab-' + i, 'aria-controls': 'modelPanel', 'aria-selected': 'false', tabindex: '-1' }, m.name.replace(p.name + ' ', ''));
      tab.addEventListener('click', () => select(i));
      return tab;
    });

    tablist.addEventListener('keydown', (e) => {
      const cur = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
      let n = null;
      if (e.key === 'ArrowRight') n = (cur + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') n = (cur - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabs.length - 1;
      if (n !== null) { e.preventDefault(); select(n, true); }
    });

    tablist.append(...tabs);
    select(0);
    return h('div', {}, tablist, panel);
  }

  function initProductPage() {
    const mount = $('[data-product-page]');
    if (!mount) return;
    const p = PRODUCTS[mount.dataset.productPage];
    if (!p) return;
    const modelsContainer = document.getElementById('modelsContainer');
    if (modelsContainer) {
      modelsContainer.replaceChildren(buildModels(p));
    }
  }

  /* ---------- Topics: category filters + accordion -------------------------- */
  function initTopics() {
    const mount = $('[data-topics]');
    if (!mount) return null;

    const state = { query: '', category: 'all' };
    const categories = [{ id: 'all', label: 'All topics' }].concat(TOPICS.map((t) => ({ id: t.id, label: t.short })));
    const chips = categories.map((cat) => h('button', {
      type: 'button', class: 'filter-chip', 'data-cat': cat.id, 'aria-pressed': String(cat.id === 'all'),
      onclick: () => { state.category = cat.id; apply(); }
    }, cat.label));
    const filterBar = h('div', { class: 'filter-bar', role: 'group', 'aria-label': 'Filter by category' }, chips);

    const items = TOPICS.map((topic) => {
      const triggerId = 'trigger-' + topic.id;
      const panelId = 'panel-' + topic.id;
      const count = topic.articles.length + (topic.articles.length === 1 ? ' article' : ' articles');
      const trigger = h('button', { type: 'button', class: 'accordion__trigger', id: triggerId, 'aria-expanded': 'false', 'aria-controls': panelId },
        h('span', { class: 'accordion__lead' },
          h('span', { class: 'accordion__tile', html: icon(topic.icon, 22) }),
          h('span', { class: 'accordion__text' }, h('span', { class: 'accordion__name' }, topic.title), h('span', { class: 'accordion__count' }, count))),
        h('span', { class: 'accordion__icon', 'aria-hidden': 'true' }, '+'));
      const rows = topic.articles.map((a) => ({
        li: articleCard(Object.assign({}, a, { topic }), true),
        text: norm([a.title, a.desc, a.keywords, topic.title].join(' '))
      }));
      const panel = h('div', { class: 'accordion__panel', id: panelId, role: 'region', 'aria-labelledby': triggerId },
        h('div', { class: 'accordion__inner' }, h('ul', { class: 'issue-list' }, rows.map((r) => r.li))));
      const el = h('div', { class: 'accordion__item' }, h('h3', { class: 'accordion__heading' }, trigger), panel);
      const item = { topic, el, trigger, rows };
      trigger.addEventListener('click', () => setOpen(item, !el.classList.contains('is-open')));
      return item;
    });

    const empty = h('div', { class: 'empty-state', role: 'status', hidden: true },
      h('p', { class: 'empty-state__title' }, 'No matching articles'),
      h('p', {}, 'Try a different keyword, or ', h('a', { href: 'chat.html' }, 'ask Live Support'), '.'));
    const status = h('p', { class: 'visually-hidden', role: 'status', 'aria-live': 'polite' });
    mount.append(filterBar, h('div', { class: 'accordion' }, items.map((i) => i.el)), empty, status);

    function setOpen(item, open) {
      item.el.classList.toggle('is-open', open);
      item.trigger.setAttribute('aria-expanded', String(open));
    }

    function apply() {
      const terms = toTerms(state.query);
      const filtered = terms.length > 0 || state.category !== 'all';
      let total = 0;
      items.forEach((item) => {
        const inCategory = state.category === 'all' || state.category === item.topic.id;
        let matches = 0;
        item.rows.forEach((row) => {
          const ok = terms.every((t) => row.text.includes(t));
          row.li.hidden = !ok;
          if (ok) matches += 1;
        });
        item.el.hidden = !inCategory || matches === 0;
        if (!item.el.hidden) total += matches;
        setOpen(item, !item.el.hidden && filtered);
      });
      chips.forEach((chip) => chip.setAttribute('aria-pressed', String(chip.dataset.cat === state.category)));
      empty.hidden = total > 0;
      status.textContent = filtered ? total + (total === 1 ? ' article found' : ' articles found') : '';
    }

    apply();
    return {
      filter(query) { state.query = query; apply(); },
      reveal() { mount.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    };
  }

  /* ---------- Search -------------------------------------------------------- */
  function initSearch(topics) {
    const inputs = $$('[data-search]');
    const run = (value) => {
      inputs.forEach((input) => { if (input.value !== value) input.value = value; });
      if (topics) topics.filter(value);
    };
    inputs.forEach((input) => input.addEventListener('input', () => run(input.value)));

    $$('form[data-search-form]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = $('[data-search]', form).value.trim();
        const target = 'HomePage.html' + (query ? '?q=' + encodeURIComponent(query) : '');
        if (!getSession()) { window.location.href = signinUrl(target); return; }
        const header = form.closest('.site-header');
        if (header) header.dispatchEvent(new CustomEvent('search:submit'));
        if (topics) { run(query); topics.reveal(); } else { window.location.href = target; }
      });
    });

    const initial = new URLSearchParams(window.location.search).get('q');
    if (initial && topics) run(initial);
  }

  function initFeedback() {
    $$('[data-feedback]').forEach((btn) => btn.addEventListener('click', () => {
      const entries = store.get(KEYS.feedback, []);
      entries.push({ page: FILE, helpful: true, at: new Date().toISOString() });
      store.set(KEYS.feedback, entries.slice(-50));
      openDialog({ title: 'Thanks for your feedback', message: 'We’re glad this article helped. Your response helps us improve our support content.', linkHref: 'HomePage.html', linkText: 'Browse more topics' });
    }));
  }

  /* ---------- Video tutorial ---------------------------------------------- */
/* ---------- Video tutorial ---------------------------------------------- */
  function initTutorial() {
    const root = $('[data-tutorial]');
    const article = $('.article');
    if (!root || !article) return;

    const video = h('video', { class: 'video__player', controls: true, preload: 'metadata', playsinline: true, src: root.dataset.video, 'aria-label': 'Video tutorial: ' + $('.article__title', article).textContent },
      root.dataset.captions ? h('track', { kind: 'captions', srclang: 'en', label: 'English', src: root.dataset.captions, default: true }) : null,
      'Your browser does not support video playback.');
    
    const fallback = h('div', { class: 'video__fallback', role: 'note', hidden: true },
      h('p', { class: 'video__fallback-title' }, 'Video tutorial coming soon'),
      h('p', {}, 'The video for this guide isn’t available yet. Please follow the written steps above.'));
    
    video.addEventListener('error', () => { 
      video.hidden = true; 
      fallback.hidden = false; 
      if (centerPlayBtn) centerPlayBtn.hidden = true;
    });

    // YouTube-style icons
    const playIconSvg = `<svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
    const pauseIconSvg = `<svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

    // 1. Permanent center play button (shows only when paused)
    const centerPlayBtn = h('button', { type: 'button', class: 'video-center-play-btn', title: 'Play' }, h('span', { html: playIconSvg }));

    // 2. Flash overlay for when it switches to playing
    const flashIconSpan = h('span', { html: pauseIconSvg });
    const flashOverlay = h('div', { class: 'video-flash-overlay' }, flashIconSpan);

    const videoContainer = h('div', { class: 'video custom-video-wrapper is-paused' }, video, centerPlayBtn, flashOverlay, fallback);

    let flashTimeout;
    const triggerFlash = (iconHtml) => {
      flashIconSpan.innerHTML = iconHtml;
      flashOverlay.classList.remove('is-animating');
      void flashOverlay.offsetWidth; // Force reflow
      flashOverlay.classList.add('is-animating');

      clearTimeout(flashTimeout);
      flashTimeout = setTimeout(() => {
        flashOverlay.classList.remove('is-animating');
      }, 600);
    };

    video.addEventListener('play', () => {
      videoContainer.classList.remove('is-paused');
      triggerFlash(pauseIconSvg); // Flash pause icon smoothly when playing starts
    });

    video.addEventListener('pause', () => {
      videoContainer.classList.add('is-paused'); // Show permanent play button when paused
    });

    centerPlayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (video.paused) video.play();
      else video.pause();
    });

    root.setAttribute('aria-labelledby', 'tutorialTitle');
    root.append(
      h('h2', { class: 'tutorial__title', id: 'tutorialTitle' }, 'Video tutorial'),
      h('p', { class: 'tutorial__lead' }, 'Prefer to watch? Follow the video walkthrough for this guide.'),
      videoContainer
    );
  }

  Object.assign(PF, { initProducts, initProductPage, initTopics, initSearch, initFeedback, initTutorial });
})();
