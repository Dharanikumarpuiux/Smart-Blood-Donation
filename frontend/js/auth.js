/* auth.js — Login & Signup page logic */

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect away
  if (api.isLoggedIn()) {
    const user = api.getUser();
    window.location.href = getDashboardUrl(user);
    return;
  }

  // ── Role Selector ──
  const roleBtns = document.querySelectorAll('.role-btn');
  let selectedRole = 'donor';

  roleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      roleBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedRole = btn.dataset.role;
    });
  });

  // ── Password Toggle ──
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
      } else {
        input.type = 'password';
        btn.textContent = '👁️';
      }
    });
  });

  // ── Sign Up Form ──
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = signupForm.querySelector('[type="submit"]');
      const msg = document.getElementById('auth-message');

      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const phone = document.getElementById('signup-phone').value.trim();
      const password = document.getElementById('signup-password').value;
      const confirm = document.getElementById('signup-confirm').value;

      if (password !== confirm) {
        showMessage(msg, 'error', '❌ Passwords do not match.');
        return;
      }

      if (password.length < 6) {
        showMessage(msg, 'error', '❌ Password must be at least 6 characters.');
        return;
      }

      setLoading(btn, true);

      const res = await api.post('/auth/signup', { name, email, phone, password, role: selectedRole });

      setLoading(btn, false);

      if (res.ok && res.data.success) {
        api.setAuth(res.data.token, res.data.user);
        showMessage(msg, 'success', '✅ Account created! Redirecting...');
        setTimeout(() => {
          window.location.href = getDashboardUrl(res.data.user);
        }, 1000);
      } else {
        showMessage(msg, 'error', '❌ ' + (res.data.message || 'Signup failed.'));
      }
    });
  }

  // ── Login Form ──
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector('[type="submit"]');
      const msg = document.getElementById('auth-message');

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      setLoading(btn, true);
      const res = await api.post('/auth/login', { email, password });
      setLoading(btn, false);

      if (res.ok && res.data.success) {
        api.setAuth(res.data.token, res.data.user);
        showMessage(msg, 'success', '✅ Login successful! Redirecting...');
        setTimeout(() => {
          window.location.href = getDashboardUrl(res.data.user);
        }, 800);
      } else {
        showMessage(msg, 'error', '❌ ' + (res.data.message || 'Login failed.'));
      }
    });
  }
});

function showMessage(el, type, text) {
  if (!el) return;
  el.className = `auth-message show ${type}`;
  el.innerHTML = text;
}

function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? '<span class="spinner"></span> Please wait...'
    : (btn.dataset.text || 'Submit');
}
