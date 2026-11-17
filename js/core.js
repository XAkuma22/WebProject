/* =============================================================================
   core.js  -  LOAD FIRST
   Shared config, storage, route guard, DOM helpers, theme and the dialog.
   Everything the other files need is exposed on window.PF.
   ============================================================================= */
(() => {
  'use strict';

  /* ---------- Config ------------------------------------------------------- */
  const KEYS = { theme: 'pf_theme', accounts: 'pf_accounts', session: 'pf_session', feedback: 'pf_feedback', remember: 'pf_remember' };
  const FILE = window.location.pathname.split('/').pop() || '';

  // Pages that require a signed-in user (lower-case file names)
  const PROTECTED = new Set([
    'homepage.html', 'chat.html', 'fruitphone.html', 'fruitmac.html', 'fruitpad.html', 'fruitwatch.html', 'fruitpods.html',
    'articlebattery.html', 'articlenetwork.html', 'articlepasscode.html', 'articletouch.html', 'admin.html'
  ]);
  const safeNext = (v) => (typeof v === 'string' && /^[\w-]+\.html(\?[^#\s]*)?(#[\w-]*)?$/i.test(v) ? v : null);
  const signinUrl = (next) => 'Signin.html?reason=auth' + (safeNext(next) ? '&next=' + encodeURIComponent(next) : '');

  /* ---------- Storage ------------------------------------------------------ */
  const store = {
    get(key, fallback) {
      try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (e) { return fallback; }
    },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; } },
    remove(key) { try { localStorage.removeItem(key); } catch (e) { /* unavailable */ } }
  };
  const getSession = () => store.get(KEYS.session, null);

  // Hard guard: runs in <head>, before the page paints
  if (PROTECTED.has(FILE.toLowerCase()) && !getSession()) {
    window.PF = { redirecting: true };   // tells the other files to stand down
    window.location.replace(signinUrl(FILE + window.location.search + window.location.hash));
    return;
  }

  /* ---------- Utilities ---------------------------------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (value === false || value === null || value === undefined) return;
      if (key === 'class') el.className = value;
      else if (key === 'html') el.innerHTML = value;
      else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
      else el.setAttribute(key, value === true ? '' : value);
    });
    kids.flat().forEach((kid) => {
      if (kid === null || kid === undefined || kid === false) return;
      el.append(kid.nodeType ? kid : document.createTextNode(kid));
    });
    return el;
  }

  const norm = (s) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const stem = (w) => (w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '') : w);
  const toTerms = (s) => norm(s).split(' ').filter(Boolean).map(stem);

  const icon = (name, size = 20, cls = '') =>
    `<svg class="icon icon-${name} ${cls}" width="${size}" height="${size}" aria-hidden="true" focusable="false"><use href="#icon-${name}"></use></svg>`;
  
  const hydrateIcons = () => $$('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon, Number(el.dataset.size) || 22); });

  /* ---------- Theme -------------------------------------------------------- */
  const Theme = {
    current() { return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'; },
    initial() {
      const saved = store.get(KEYS.theme, null);
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },
    apply(theme) {
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
      this.syncButtons();
    },
    toggle() { const next = this.current() === 'dark' ? 'light' : 'dark'; this.apply(next); store.set(KEYS.theme, next); },
    syncButtons() {
      const label = this.current() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
      $$('[data-theme-toggle]').forEach((b) => b.setAttribute('aria-label', label));
    },
    bindButtons() { $$('[data-theme-toggle]').forEach((b) => b.addEventListener('click', () => this.toggle())); this.syncButtons(); },
    watch() {
      window.addEventListener('storage', (e) => {
        if (e.key === KEYS.theme && (e.newValue === '"dark"' || e.newValue === '"light"')) this.apply(JSON.parse(e.newValue));
      });
      if (window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        if (mq.addEventListener) mq.addEventListener('change', (e) => { if (store.get(KEYS.theme, null) === null) this.apply(e.matches ? 'dark' : 'light'); });
      }
    }
  };
  Theme.apply(Theme.initial());

  function openDialog({ title, message, linkHref, linkText }) {
    const opener = document.activeElement;
    const dialog = h('dialog', { class: 'dialog', 'aria-labelledby': 'dialogTitle' },
      h('div', { class: 'dialog__body' },
        h('h2', { class: 'dialog__title', id: 'dialogTitle' }, title),
        h('p', { class: 'dialog__text' }, message),
        h('div', { class: 'dialog__actions' },
          linkHref ? h('a', { class: 'btn btn--secondary', href: linkHref }, linkText) : null,
          h('button', { type: 'button', class: 'btn btn--primary', onclick: () => dialog.close() }, 'Done'))));
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { dialog.remove(); if (opener && opener.focus) opener.focus(); });
    document.body.append(dialog);
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
  }

  window.PF = { KEYS, FILE, PROTECTED, safeNext, signinUrl, store, getSession,
    $, $$, h, norm, stem, toTerms, icon, hydrateIcons, Theme, openDialog };
})();
