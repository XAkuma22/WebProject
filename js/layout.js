/* =============================================================================
   layout.js
   Site header (nav, search panel, account menu), guest gate, footer year, back link.
   ============================================================================= */
(() => {
  'use strict';
  const PF = window.PF;
  if (!PF || PF.redirecting) return;
  const { PROTECTED, safeNext, signinUrl, getSession, $, $$, h, store, KEYS, matchArticles, CATALOG, articleCard } = PF;

  /* ---------- Access gate (guests) ----------------------------------------- */
  function initGate() {
    if (getSession()) return;
    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!safeNext(href) || !PROTECTED.has(href.split(/[?#]/)[0].toLowerCase())) return;
      e.preventDefault();
      window.location.href = signinUrl(href);
    });
  }

  function initGuestUser() {
    const session = getSession();

    document.querySelectorAll('[data-guest-only]').forEach(el => {
      if (session) {
        el.setAttribute('hidden', '');
      } else {
        el.removeAttribute('hidden');
      }
    });

    document.querySelectorAll('[data-user-only]').forEach(el => {
      if (session) {
        el.removeAttribute('hidden');
      } else {
        el.setAttribute('hidden', '');
      }
    });
  }

  /* ---------- Layout: Header Events -------------------------------------- */
  function initHeader(header) {
    const session = getSession();
    const loginLink = $('[data-login-link]', header);
    const accountWrapper = $('.account', header);

    if (session) {
      if (loginLink) loginLink.hidden = true;
      if (accountWrapper) accountWrapper.hidden = false;
      const full = (session.name || session.email || '').trim();
      const first = session.firstName || full.split(' ')[0] || '?';
      const avatarEl = $('[data-avatar]', header);
      const nameEl = $('[data-account-name]', header);
      const emailEl = $('[data-account-email]', header);

      if (avatarEl) avatarEl.textContent = first.charAt(0).toUpperCase();
      if (nameEl) nameEl.textContent = full;
      if (emailEl) emailEl.textContent = session.email || '';
    } else {
      if (loginLink) loginLink.hidden = false;
      if (accountWrapper) accountWrapper.hidden = true;
    }

    const panel = $('#searchPanel', header);
    const backdrop = $('.search-backdrop', header);
    const input = $('#panelSearch', header);
    const openBtn = $('[data-search-open]', header);
    const menuBtn = $('[data-menu-toggle]', header);
    const accBtn = $('[data-account-toggle]', header);
    const accMenu = $('#accountMenu', header);
    const results = $('[data-results]', header);
    const label = $('[data-results-label]', header);

    /* ---------- Sliding Gradient Navbar Pill (Hover + Cross-Page Click) ---- */
   /* ---------- Sliding Gradient Navbar Pill (Hover + Cross-Page Click) ---- */
    const nav = $('#siteNav', header);
    const navList = nav ? $('.nav-links', nav) : null;
    if (nav && navList) {
      const pill = h('li', { class: 'nav-indicator', 'aria-hidden': 'true' });
      navList.prepend(pill);
      const navLinks = $$('.nav-link', header);
      const currentLink = navLinks.find((l) => l.getAttribute('aria-current') === 'page') || null;
      let activeTarget = currentLink;
      let isGliding = false;

      const PILL_PREFIX = 'pf_pill:';
      const isMobile = () => window.matchMedia && window.matchMedia('(max-width: 1100px)').matches;
      const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const getMetrics = (el) => {
        if (!el) return null;
        const base = navList.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        if (!r.width) return null;
        return {
          x: r.left - base.left - navList.clientLeft,
          y: r.top - base.top - navList.clientTop,
          width: r.width,
          height: r.height
        };
      };

      const readPrevRect = () => {
        try {
          if (typeof window.name === 'string' && window.name.startsWith(PILL_PREFIX)) {
            const data = JSON.parse(window.name.slice(PILL_PREFIX.length));
            window.name = '';
            return data;
          }
        } catch (e) { /* ignore */ }
        return null;
      };

      const savePrevRect = (rect) => {
        if (!rect) return;
        try {
          window.name = PILL_PREFIX + JSON.stringify(rect);
        } catch (e) { /* ignore */ }
      };

      const setTextHighlight = (targetEl) => {
        navLinks.forEach((link) => {
          link.classList.toggle('is-pill-active', link === targetEl);
        });
      };

      const setInstantRect = (rect) => {
        if (!rect || isMobile()) {
          pill.style.opacity = '0';
          return;
        }
        pill.classList.add('is-instant');
        pill.style.width = rect.width + 'px';
        pill.style.height = rect.height + 'px';
        pill.style.transform = 'translate(' + rect.x + 'px, ' + rect.y + 'px)';
        pill.style.opacity = '1';
        void pill.offsetWidth;
      };

      const animateToRect = (rect) => {
        if (!rect || isMobile()) {
          pill.style.opacity = '0';
          return;
        }
        pill.classList.remove('is-instant');
        void pill.offsetWidth;
        pill.style.width = rect.width + 'px';
        pill.style.height = rect.height + 'px';
        pill.style.transform = 'translate(' + rect.x + 'px, ' + rect.y + 'px)';
        pill.style.opacity = '1';
      };

      const placePill = (el, animate = true) => {
        activeTarget = el;
        setTextHighlight(el);
        const rect = getMetrics(el);
        if (animate && !reduceMotion()) {
          animateToRect(rect);
        } else {
          setInstantRect(rect);
        }
      };

      // Start on the previous page's active tab and glide to the new page's tab
      const prevRect = readPrevRect();
      const targetRect = getMetrics(currentLink);

      if (prevRect && targetRect && !isMobile() && !reduceMotion()) {
        isGliding = true;
        setTextHighlight(currentLink);
        setInstantRect(prevRect);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            animateToRect(targetRect);
            setTimeout(() => { isGliding = false; }, 800);
          });
        });
      } else {
        placePill(currentLink, false);
      }

      window.addEventListener('resize', () => placePill(activeTarget, false));
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => { if (!isGliding) placePill(activeTarget, false); });
      }
      window.addEventListener('load', () => { if (!isGliding) placePill(activeTarget, false); });

      navLinks.forEach((l) => {
        l.addEventListener('mouseenter', () => {
          isGliding = false;
          placePill(l, true);
        });
        l.addEventListener('focusin', () => {
          isGliding = false;
          placePill(l, true);
        });

        l.addEventListener('click', (e) => {
          if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          // Always save the current page's active tab so the next page slides from it
          savePrevRect(getMetrics(currentLink));
        });
      });

      navList.addEventListener('mouseleave', () => {
        isGliding = false;
        placePill(currentLink, true);
      });
      nav.addEventListener('focusout', (e) => {
        if (!nav.contains(e.relatedTarget)) {
          isGliding = false;
          placePill(currentLink, true);
        }
      });
    }
    
    if (!panel || !input) return;

    const renderResults = (q) => {
      const query = q.trim();
      const list = query ? matchArticles(query, 4) : CATALOG.slice(0, 4);
      if (label) label.textContent = query ? (list.length ? 'Results' : 'No results') : 'Recommended';
      if (results) {
        results.replaceChildren(...(list.length
          ? list.map((a) => articleCard(a, false))
          : [h('li', { class: 'rec-empty' }, 'No articles match “' + query + '”. Try “battery”, “passcode” or “Wi-Fi”, or ', h('a', { href: 'chat.html' }, 'ask Live Support'), '.')]));
      }
    };

    const setMenu = (open) => {
      header.classList.toggle('is-open', open);
      if (menuBtn) {
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      }
    };

    const setAccount = (open) => {
      if (!accBtn || !accMenu) return;
      accMenu.hidden = !open;
      accBtn.setAttribute('aria-expanded', String(open));
    };

    const closeSearch = (restore) => {
      if (panel.hidden) return;
      panel.hidden = true;
      if (backdrop) backdrop.hidden = true;
      if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
      if (restore && openBtn) openBtn.focus();
    };

    const openSearch = () => {
      if (!getSession()) { window.location.href = signinUrl('HomePage.html'); return; }
      setMenu(false); setAccount(false);
      panel.hidden = false;
      if (backdrop) backdrop.hidden = false;
      if (openBtn) openBtn.setAttribute('aria-expanded', 'true');
      renderResults(input.value);
      input.focus();
    };

    if (openBtn) openBtn.addEventListener('click', () => (panel.hidden ? openSearch() : closeSearch(true)));
    $$('[data-search-close]', header).forEach((b) => b.addEventListener('click', () => closeSearch(true)));
    input.addEventListener('input', () => renderResults(input.value));

    $$('.popular-list button', header).forEach((b) => b.addEventListener('click', () => {
      input.value = b.dataset.q;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    }));

    header.addEventListener('search:submit', () => closeSearch(false));

    if (menuBtn) menuBtn.addEventListener('click', () => { closeSearch(false); setAccount(false); setMenu(!header.classList.contains('is-open')); });
    $$('.nav-link', header).forEach((l) => l.addEventListener('click', () => setMenu(false)));
    if (accBtn) accBtn.addEventListener('click', () => { closeSearch(false); setAccount(accMenu.hidden); });

    const logout = $('[data-action="logout"]', header);
    if (logout) logout.addEventListener('click', () => {
      store.remove(KEYS.session);
      store.remove('pf_active_agent');
      window.location.href = 'Signin.html';
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!panel.hidden) closeSearch(true);
      else if (accMenu && !accMenu.hidden) { setAccount(false); accBtn.focus(); }
      else if (header.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); }
    });

    document.addEventListener('click', (e) => {
      if (!header.contains(e.target)) { setMenu(false); setAccount(false); }
    });

    if (window.matchMedia) window.matchMedia('(min-width: 1101px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function initLayout() {
    const header = $('.site-header');
    if (!header || header.dataset.pfLayoutReady === '1') return;
    header.dataset.pfLayoutReady = '1';
    initHeader(header);
    $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
  }

  /* ---------- Smart back button ---------------------------------------------- */
  function initBackLink() {
    const backLink = document.querySelector('.content-back a, .back-link');
    if (!backLink) return;
    backLink.addEventListener('click', (e) => {
      // Only go back when this tab actually has history (a link opened in a new tab has none)
      if (history.length > 1 && document.referrer && document.referrer.includes(window.location.hostname)) {
        e.preventDefault();
        history.back();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLayout, { once: true });
  } else {
    initLayout();
  }

  Object.assign(PF, { initGate, initGuestUser, initLayout, initBackLink });
})();