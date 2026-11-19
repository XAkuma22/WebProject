/* =============================================================================
   auth.js
   Sign in, Sign up and Forgot password connected to Supabase PostgreSQL ('users').
   ============================================================================= */
(() => {
  'use strict';
  const PF = window.PF;
  if (!PF || PF.redirecting) return;
  const { KEYS, store, safeNext, $, $$, h } = PF;

  /* ---------- Helpers ------------------------------------------------------- */
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const isName = (v) => /^[\p{L}][\p{L}\s'’.-]*$/u.test(v);

  function getDb() {
    if (!window.db) {
      throw new Error('Database client (js/db.js) is not loaded on this page.');
    }
    return window.db;
  }

  function setStatus(el, message, type) {
    if (!el) return;
    el.textContent = message;
    el.hidden = !message;
    el.className = 'form-status' + (type ? ' is-' + type : '');
  }

  function setFieldError(input, show) {
    if (!input) return;
    input.setAttribute('aria-invalid', String(show));
    const err = document.getElementById(input.id + 'Error');
    if (err) err.hidden = !show;
  }

  function setLoading(btn, on, text) {
    if (!btn) return;
    btn.disabled = on;
    btn.classList.toggle('is-loading', on);
    const label = $('.btn__label', btn);
    if (!label) return;
    if (on) {
      label.dataset.orig = label.textContent;
      label.textContent = text;
    } else if (label.dataset.orig) {
      label.textContent = label.dataset.orig;
    }
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

  /* ---------- Auth Initialization ------------------------------------------- */
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
    if (forgot) {
      forgot.addEventListener('click', (e) => {
        e.preventDefault();
        openResetDialog();
      });
    }

    /* ---------- SIGN IN (Queries Supabase 'users' table) --------------------- */
    if (signin) {
      const email = $('#email');
      const password = $('#password');
      const submit = $('[data-submit]', signin);

      [email, password].forEach((i) => {
        if (i) i.addEventListener('input', () => setFieldError(i, false));
      });

      signin.addEventListener('submit', async (e) => {
        e.preventDefault();
        setStatus(status, '');
        const emailValue = email.value.trim().toLowerCase();
        const passValue = password.value;

        if (!isEmail(emailValue)) {
          setFieldError(email, true);
          email.focus();
          return;
        }
        if (!passValue) {
          setFieldError(password, true);
          password.focus();
          return;
        }

        let success = false;
        setLoading(submit, true, 'Signing in…');

        try {
          const client = getDb();
          const { data: user, error } = await client
            .from('users')
            .select('*')
            .ilike('email', emailValue)
            .maybeSingle();

          if (error) {
            setStatus(status, 'Database error: ' + error.message, 'error');
            return;
          }

          if (!user || user.password !== passValue) {
            setStatus(status, 'Invalid email or password. Please try again.', 'error');
            setFieldError(email, true);
            setFieldError(password, true);
            return;
          }

          // Save session to localStorage
          // Save session to localStorage (including middle name)
          const fullName = [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' ');
          store.set(KEYS.session, {
            id: user.id,
            name: fullName,
            firstName: user.first_name,
            middleName: user.middle_name,
            lastName: user.last_name,
            email: user.email,
            role: user.role || 'customer'
          });

          setStatus(status, 'Signed in successfully. Redirecting…', 'success');
          success = true;

          setTimeout(() => {
            const target = next || (user.role === 'admin' ? 'adminpage.html' : 'HomePageMain.html');
            window.location.href = target;
          }, 600);
        } catch (err) {
          setStatus(status, err.message || 'Unable to connect to database.', 'error');
        } finally {
          if (!success) setLoading(submit, false);
        }
      });
    }

    /* ---------- SIGN UP (Inserts into Supabase 'users' table) --------------- */
    if (signup) {
      const first = $('#firstName');
      const middle = $('#middleName');
      const last = $('#lastName');
      const email = $('#email');
      const password = $('#password');
      const confirm = $('#confirmPassword');
      const terms = $('#terms');
      const submit = $('[data-submit]', signup);
      const meter = $('#passwordStrength');
      const meterLabel = meter ? $('.strength__label', meter) : null;
      const passwordError = $('#passwordError');
      const LABELS = ['Use at least 8 characters', 'Weak', 'Fair', 'Good', 'Strong'];

      const isStrongEnough = (pw) => pw.length >= 8 && scorePassword(pw) >= 2;

      [first, middle, last, email, confirm].forEach((i) => {
        if (i) i.addEventListener('input', () => setFieldError(i, false));
      });
      if (terms) terms.addEventListener('change', () => setFieldError(terms, false));

      if (password && meter && meterLabel) {
        password.addEventListener('input', () => {
          const val = password.value;
          const level = val ? scorePassword(val) : 0;
          meter.dataset.level = String(level);
          meterLabel.textContent = LABELS[level];

          if (val.length > 0 && !isStrongEnough(val)) {
            if (passwordError) passwordError.textContent = 'Choose a better or stronger password';
            setFieldError(password, true);
          } else {
            setFieldError(password, false);
          }
        });
      }

      signup.addEventListener('submit', async (e) => {
        e.preventDefault();
        setStatus(status, '');
        const f = first.value.trim();
        const m = middle ? middle.value.trim() : '';
        const l = last.value.trim();
        const emailValue = email.value.trim().toLowerCase();
        const pwOk = isStrongEnough(password.value);

        if (!pwOk && passwordError) {
          passwordError.textContent = 'Choose a better or stronger password';
        }

        const checks = [
          [first, f.length > 1 && isName(f)],
          [middle, m === '' || isName(m)],
          [last, l.length > 1 && isName(l)],
          [email, isEmail(emailValue)],
          [password, pwOk],
          [confirm, confirm.value === password.value && pwOk],
          [terms, terms.checked]
        ];
        checks.forEach(([input, ok]) => setFieldError(input, !ok));
        const firstBad = checks.find(([, ok]) => !ok);
        if (firstBad) {
          firstBad[0].focus();
          return;
        }

        let success = false;
        setLoading(submit, true, 'Creating account…');

        try {
          const client = getDb();

          // 1. Check if email already exists in Supabase
          const { data: existing, error: checkErr } = await client
            .from('users')
            .select('id')
            .ilike('email', emailValue)
            .maybeSingle();

          if (checkErr) {
            setStatus(status, 'Database error: ' + checkErr.message, 'error');
            return;
          }
          if (existing) {
            setStatus(status, 'An account with this email already exists.', 'error');
            return;
          }

          // 2. Insert new customer into Supabase 'users' table
          const { error: insertErr } = await client
            .from('users')
            .insert([{
              first_name: f,
              middle_name: m || null,
              last_name: l,
              email: emailValue,
              password: password.value,
              role: 'customer'
            }]);

          if (insertErr) {
            setStatus(status, 'Could not create account: ' + insertErr.message, 'error');
            return;
          }

          setStatus(status, 'Account created successfully. Redirecting…', 'success');
          success = true;
          window.dispatchEvent(new Event('pf:signup-success')); // clears the saved sign-up draft
          setTimeout(() => {
            window.location.href = 'Signin.html' + (next ? '?next=' + encodeURIComponent(next) : '');
          }, 900);
        } catch (err) {
          setStatus(status, err.message || 'Unable to connect to database.', 'error');
        } finally {
          if (!success) setLoading(submit, false);
        }
      });
    }
  }

  /* ---------- Forgot Password (Updates password in Supabase 'users') -------- */
  function openResetDialog() {
    const opener = document.activeElement;
    const field = (id, label, type, placeholder, autocomplete) =>
      h('div', { class: 'field' },
        h('label', { for: id }, label),
        h('input', { id, type, placeholder, autocomplete: autocomplete || 'off' })
      );

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
      if (tries >= 5) {
        setStatus(status, 'Too many attempts. Please try again later.', 'error');
        return;
      }
      const email = val(fEmail).toLowerCase();
      const pass = fPass.querySelector('input').value;
      if (!isEmail(email)) {
        setStatus(status, 'Please enter a valid email address.', 'error');
        return;
      }
      if (pass.length < 6) {
        setStatus(status, 'New password must be at least 6 characters.', 'error');
        return;
      }

      setLoading(submit, true, 'Verifying…');
      try {
        const client = getDb();
        const { data: acct, error } = await client
          .from('users')
          .select('id, first_name, last_name')
          .ilike('email', email)
          .maybeSingle();

        if (error || !acct || !same(acct.first_name, val(fFirst)) || !same(acct.last_name, val(fLast))) {
          tries += 1;
          setLoading(submit, false);
          setStatus(status, 'We couldn’t verify those details. Please check them and try again.', 'error');
          return;
        }

        const { error: updateErr } = await client
          .from('users')
          .update({ password: pass })
          .eq('id', acct.id);

        if (updateErr) {
          setLoading(submit, false);
          setStatus(status, 'Could not update password: ' + updateErr.message, 'error');
          return;
        }

        setStatus(status, 'Password updated. You can sign in now.', 'success');
        setTimeout(() => {
          dialog.close();
          const signinEmail = document.getElementById('email');
          const signinPass = document.getElementById('password');
          if (signinEmail) signinEmail.value = email;
          if (signinPass) {
            signinPass.value = '';
            signinPass.focus();
          }
        }, 1400);
      } catch (err) {
        setLoading(submit, false);
        setStatus(status, err.message || 'Unable to connect to database.', 'error');
      }
    });

    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { dialog.remove(); if (opener && opener.focus) opener.focus(); });
    document.body.append(dialog);
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    fEmail.querySelector('input').focus();
  }

  Object.assign(PF, { initAuth });
})();