/* =============================================================================
   auth.js
   Sign in, Sign up and Forgot password (all account logic lives here).
   ============================================================================= */
(() => {
  'use strict';
  const PF = window.PF;
  if (!PF || PF.redirecting) return;
  const { KEYS, store, safeNext, $, $$, h } = PF;

  /* ---------- Auth ---------------------------------------------------------- */
  const getAccounts = () => store.get(KEYS.accounts, []);
  const findAccount = (email) => getAccounts().find((a) => a.email.toLowerCase() === email.toLowerCase());
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const isName = (v) => /^[\p{L}][\p{L}\s'’.-]*$/u.test(v);

  function randomSalt() {
    if (window.crypto && window.crypto.getRandomValues) {
      return Array.from(window.crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    return String(Math.random()).slice(2) + Date.now();
  }

  async function hashPassword(password, salt) {
    const data = new TextEncoder().encode(salt + ':' + password);
    if (window.crypto && window.crypto.subtle) {
      const digest = await window.crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let hash = 5381;
    data.forEach((b) => { hash = ((hash << 5) + hash + b) | 0; });
    return 'weak-' + (hash >>> 0).toString(16);
  }

  async function verifyPassword(account, password) {
    if (account.hash) return (await hashPassword(password, account.salt)) === account.hash;
    return account.password === password;
  }

  function setStatus(el, message, type) {
    el.textContent = message;
    el.hidden = !message;
    el.className = 'form-status' + (type ? ' is-' + type : '');
  }
  function setFieldError(input, show) {
    input.setAttribute('aria-invalid', String(show));
    const err = document.getElementById(input.id + 'Error');
    if (err) err.hidden = !show;
  }
  function setLoading(btn, on, text) {
    btn.disabled = on;
    btn.classList.toggle('is-loading', on);
    const label = $('.btn__label', btn);
    if (!label) return;
    if (on) { label.dataset.orig = label.textContent; label.textContent = text; }
    else if (label.dataset.orig) label.textContent = label.dataset.orig;
  }

  function initPasswordToggles() {
    $$('[data-toggle-password]').forEach((btn) => {
      const input = document.getElementById(btn.getAttribute('aria-controls'));
      if (!input) return;
      btn.addEventListener('click', () => {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.setAttribute('aria-pressed', String(show));
        btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      });
    });
  }

  function scorePassword(pw) {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 6) score += 1;
    if (pw.length >= 10) score += 1;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;
    return Math.max(score, 1);
  }

  function initAuth() {
    initPasswordToggles();
    const params = new URLSearchParams(window.location.search);
    const next = safeNext(params.get('next'));
    const signin = $('#signinForm');
    const signup = $('#signupForm');
    const status = $('#formStatus');

    if (status && params.get('reason') === 'auth') {
      setStatus(status, 'Please sign in or create an account to continue.', 'info');
    }

     const forgot = $('[data-forgot]');
    if (forgot) forgot.addEventListener('click', (e) => {
      e.preventDefault();
      openResetDialog();
    });

    if (signin) {
      const email = $('#email'), password = $('#password'), remember = $('#remember'), submit = $('[data-submit]', signin);
      const remembered = store.get(KEYS.remember, '');
      if (remembered) { email.value = remembered; remember.checked = true; }
      [email, password].forEach((i) => i.addEventListener('input', () => setFieldError(i, false)));

      signin.addEventListener('submit', async (e) => {
        e.preventDefault();
        setStatus(status, '');
        const emailValue = email.value.trim().toLowerCase();
        const passwordValue = password.value;
        const okEmail = isEmail(emailValue);
        const okPassword = passwordValue.length >= 6;
        
        setFieldError(email, !okEmail);
        setFieldError(password, !okPassword);
        if (!okEmail || !okPassword) { (okEmail ? password : email).focus(); return; }

        let success = false;
        setLoading(submit, true, 'Signing in…');
        try {
          // --- HARDCODED ADMIN CHECK ---
          if (emailValue === 'admin@passionfruit.com' && passwordValue === 'admin123') {
            store.set(KEYS.session, {
              name: 'System Admin',
              firstName: 'Admin',
              email: emailValue,
              role: 'admin'
            });
            if (remember.checked) store.set(KEYS.remember, emailValue); else store.remove(KEYS.remember);
            setStatus(status, 'Admin signed in successfully. Redirecting…', 'success');
            success = true;
            setTimeout(() => { window.location.href = 'adminpage.html'; }, 800);
            return;
          }

          // --- NORMAL USER LOGIN CHECK ---
          const account = findAccount(emailValue);
          if (!account) { setStatus(status, 'No account found with that email. Please sign up first.', 'error'); return; }
          if (!(await verifyPassword(account, passwordValue))) { setStatus(status, 'Incorrect password. Please try again.', 'error'); return; }
          
          const name = account.name || [account.firstName, account.middleName, account.lastName].filter(Boolean).join(' ');
          store.set(KEYS.session, { 
            name, 
            firstName: account.firstName || name.split(' ')[0], 
            email: account.email,
            role: 'user'
          });
          
          if (remember.checked) store.set(KEYS.remember, emailValue); else store.remove(KEYS.remember);
          setStatus(status, 'Signed in successfully. Redirecting…', 'success');
          success = true;
          setTimeout(() => { window.location.href = next || 'HomePageMain.html'; }, 800);
        } finally {
          if (!success) setLoading(submit, false);
        }
      });
    }

    if (signup) {
      const first = $('#firstName'), middle = $('#middleName'), last = $('#lastName');
      const email = $('#email'), password = $('#password'), confirm = $('#confirmPassword'), terms = $('#terms');
      const submit = $('[data-submit]', signup);
      const meter = $('#passwordStrength');
      const meterLabel = $('.strength__label', meter);
      const LABELS = ['Use at least 6 characters', 'Weak', 'Fair', 'Good', 'Strong'];

      [first, middle, last, email, password, confirm].forEach((i) => i.addEventListener('input', () => setFieldError(i, false)));
      terms.addEventListener('change', () => setFieldError(terms, false));
      password.addEventListener('input', () => {
        const level = scorePassword(password.value);
        meter.dataset.level = String(level);
        meterLabel.textContent = LABELS[level];
      });

      signup.addEventListener('submit', async (e) => {
        e.preventDefault();
        setStatus(status, '');
        const f = first.value.trim(), m = middle.value.trim(), l = last.value.trim(), emailValue = email.value.trim();
        const checks = [
          [first, f.length > 1 && isName(f)],
          [middle, m === '' || isName(m)],
          [last, l.length > 1 && isName(l)],
          [email, isEmail(emailValue)],
          [password, password.value.length >= 6],
          [confirm, confirm.value === password.value && password.value.length >= 6],
          [terms, terms.checked]
        ];
        checks.forEach(([input, ok]) => setFieldError(input, !ok));
        const firstBad = checks.find(([, ok]) => !ok);
        if (firstBad) { firstBad[0].focus(); return; }

        let success = false;
        setLoading(submit, true, 'Creating account…');
        try {
          if (findAccount(emailValue)) { setStatus(status, 'An account with this email already exists.', 'error'); return; }
          const salt = randomSalt();
          const accounts = getAccounts();
          accounts.push({ firstName: f, middleName: m, lastName: l, name: [f, m, l].filter(Boolean).join(' '), email: emailValue, salt, hash: await hashPassword(password.value, salt) });
          if (!store.set(KEYS.accounts, accounts)) { setStatus(status, 'Could not save your account. Please enable browser storage.', 'error'); return; }
          setStatus(status, 'Account created successfully. Redirecting…', 'success');
          success = true;
          setTimeout(() => { window.location.href = 'Signin.html' + (next ? '?next=' + encodeURIComponent(next) : ''); }, 900);
        } finally {
          if (!success) setLoading(submit, false);
        }
      });
    }
  }

  /* ---------- Forgot password: self-service reset ---------------------------- */
  function openResetDialog() {
    const opener = document.activeElement;
    const field = (id, label, type, placeholder, autocomplete) =>
      h('div', { class: 'field' }, h('label', { for: id }, label),
        h('input', { id, type, placeholder, autocomplete: autocomplete || 'off' }));

    const fEmail = field('rsEmail', 'Email address', 'email', 'you@example.com', 'email');
    const fFirst = field('rsFirst', 'First name', 'text', 'As entered at sign-up');
    const fLast = field('rsLast', 'Last name', 'text', 'As entered at sign-up');
    const fPass = field('rsPass', 'New password', 'password', 'At least 6 characters', 'new-password');
    const status = h('p', { class: 'form-status', role: 'status', hidden: true });
    const submit = h('button', { type: 'submit', class: 'btn btn--primary' }, 'Reset password');
    const cancel = h('button', { type: 'button', class: 'btn btn--secondary', onclick: () => dialog.close() }, 'Cancel');
    const form = h('form', { novalidate: true }, fEmail, fFirst, fLast, fPass, status,
      h('div', { class: 'dialog__actions' }, cancel, submit));
    const dialog = h('dialog', { class: 'dialog', 'aria-labelledby': 'rsTitle' },
      h('div', { class: 'dialog__body' },
        h('h2', { class: 'dialog__title', id: 'rsTitle' }, 'Reset your password'),
        h('p', { class: 'dialog__text' }, 'Confirm your account details, then choose a new password.'),
        form));

    const val = (el) => el.querySelector('input').value.trim();
    const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
    let tries = 0;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (tries >= 5) { setStatus(status, 'Too many attempts. Please try again later.', 'error'); return; }
      const email = val(fEmail), pass = fPass.querySelector('input').value;
      if (!isEmail(email)) { setStatus(status, 'Please enter a valid email address.', 'error'); return; }
      if (pass.length < 6) { setStatus(status, 'New password must be at least 6 characters.', 'error'); return; }

      const accounts = getAccounts();
      const acct = accounts.find((a) => same(a.email, email));
      if (!acct || !same(acct.firstName, val(fFirst)) || !same(acct.lastName, val(fLast))) {
        tries += 1;
        setStatus(status, 'We couldn’t verify those details. Please check them and try again.', 'error');
        return;
      }

      acct.salt = randomSalt();
      acct.hash = await hashPassword(pass, acct.salt);
      delete acct.password;
      if (!store.set(KEYS.accounts, accounts)) { setStatus(status, 'Could not save your new password. Please enable browser storage.', 'error'); return; }

      setLoading(submit, true, 'Saving…');
      setStatus(status, 'Password updated. You can sign in now.', 'success');
      setTimeout(() => {
        dialog.close();
        const signinEmail = document.getElementById('email');
        const signinPass = document.getElementById('password');
        if (signinEmail) signinEmail.value = email;
        if (signinPass) { signinPass.value = ''; signinPass.focus(); }
      }, 1400);
    });

    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { dialog.remove(); if (opener && opener.focus) opener.focus(); });
    document.body.append(dialog);
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    fEmail.querySelector('input').focus();
  }

  Object.assign(PF, { initAuth });
})();
