/* ── API Helper ── */
// const API_BASE = (typeof window !== 'undefined' && (window.API_BASE_URL || window.__ENV__?.API_BASE_URL))
//   ? (window.API_BASE_URL || window.__ENV__?.API_BASE_URL).replace(/\/$/, '') + '/api'
//   : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
//     ? 'http://localhost:5000/api'
//     : '/api';

const API_BASE = "https://lifedrop-backend-ozzf.onrender.com/api"

const api = {
  getToken: () => localStorage.getItem('bd_token'),
  getUser: () => {
    try { return JSON.parse(localStorage.getItem('bd_user')); } catch { return null; }
  },
  setAuth: (token, user) => {
    localStorage.setItem('bd_token', token);
    localStorage.setItem('bd_user', JSON.stringify(user));
  },
  clearAuth: () => {
    localStorage.removeItem('bd_token');
    localStorage.removeItem('bd_user');
  },
  isLoggedIn: () => !!localStorage.getItem('bd_token'),

  async request(method, endpoint, body = null, auth = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = this.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, options);
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      return { ok: false, status: 0, data: { success: false, message: 'Network error. Is the server running?' } };
    }
  },

  get: (endpoint, auth = false) => api.request('GET', endpoint, null, auth),
  post: (endpoint, body, auth = false) => api.request('POST', endpoint, body, auth),
  patch: (endpoint, body, auth = false) => api.request('PATCH', endpoint, body, auth),
};

// HTML-escape user-entered text before interpolating into innerHTML templates (XSS guard).
function escapeHTML(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Toast notification system
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${escapeHTML(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3200);
}

// Redirect if not logged in
function requireAuth(redirectTo = 'login.html') {
  if (!api.isLoggedIn()) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
}

// Redirect if already logged in
function redirectIfLoggedIn(to = null) {
  if (api.isLoggedIn()) {
    const user = api.getUser();
    const dest = to || getDashboardUrl(user);
    window.location.href = dest;
  }
}

function getDashboardUrl(user) {
  if (!user) return 'login.html';
  if (user.role === 'donor') return 'donor.html';
  if (user.role === 'hospital') return 'hospital.html';
  return 'patient.html';
}

// Navbar scroll effect
document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    // Hamburger menu
    const hamburger = document.querySelector('.nav-hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
      hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
    }
  }

  // Update nav based on auth state
  updateNavAuth();
  initNotifications();
  init3DEffects();
});

function updateNavAuth() {
  const loginBtn = document.getElementById('nav-login-btn');
  const signupBtn = document.getElementById('nav-signup-btn');
  const profileBtn = document.getElementById('nav-profile-btn');
  const logoutBtn = document.getElementById('nav-logout-btn');

  const user = api.getUser();
  const isLoggedIn = api.isLoggedIn() && !!user;
  const role = isLoggedIn ? user.role : null;

  // Show / hide navbar links based on user role
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    const li = a.closest('li') || a;

    if (href.includes('hospital.html') || href === 'hospital.html') {
      // Hospitals link is shown ONLY if the current user role is 'hospital'
      li.style.display = (role === 'hospital') ? '' : 'none';
    } else if (href.includes('donor.html') || href === 'donor.html') {
      // Donor link shown for guests and donors
      li.style.display = (role === 'hospital' || role === 'patient') ? 'none' : '';
    } else if (href.includes('patient.html') || href === 'patient.html') {
      // Patient link shown for guests and patients
      li.style.display = (role === 'hospital' || role === 'donor') ? 'none' : '';
    }
  });

  if (isLoggedIn) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (signupBtn) signupBtn.style.display = 'none';
    if (profileBtn) {
      profileBtn.style.display = 'flex';
      profileBtn.textContent = user ? user.name.split(' ')[0] : 'Profile';
      profileBtn.href = getDashboardUrl(user);
    }
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
  } else {
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (signupBtn) signupBtn.style.display = 'inline-flex';
    if (profileBtn) profileBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }

  // Refresh liquid indicator positioning if active
  if (window.FX && typeof window.FX.initLiquidNav === 'function') {
    setTimeout(() => window.FX.initLiquidNav(), 40);
  }
}

function logout() {
  api.clearAuth();
  showToast('Logged out successfully', 'info');
  setTimeout(() => window.location.href = 'index.html', 800);
}

/* ── In-app notification bell (added to the shared navbar) ── */
async function initNotifications() {
  if (!api.isLoggedIn()) return;
  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  const wrap = document.createElement('div');
  wrap.className = 'notif';
  wrap.innerHTML = `
    <button class="notif-bell" id="notif-bell" title="Notifications" aria-label="Notifications">🔔</button>
    <span class="notif-badge" id="notif-badge" style="display:none;">0</span>
    <div class="notif-dropdown" id="notif-dropdown">
      <div class="notif-header">📬 Notifications</div>
      <div class="notif-list" id="notif-list"><div class="notif-empty">Loading...</div></div>
    </div>`;
  navActions.appendChild(wrap);

  const bell = wrap.querySelector('#notif-bell');
  const badge = wrap.querySelector('#notif-badge');
  const dropdown = wrap.querySelector('#notif-dropdown');
  const listEl = wrap.querySelector('#notif-list');

  async function refresh() {
    const res = await api.get('/notifications', true);
    if (!res.ok || !res.data.success) {
      listEl.innerHTML = '<div class="notif-empty">Could not load notifications</div>';
      return;
    }
    const items = res.data.notifications || [];
    const unread = res.data.unread || 0;
    badge.textContent = unread;
    badge.style.display = unread > 0 ? 'flex' : 'none';

    if (items.length === 0) {
      listEl.innerHTML = '<div class="notif-empty">No notifications yet</div>';
      return;
    }
    listEl.innerHTML = items.slice().reverse().slice(0, 10).map(n => `
      <div class="notif-item ${n.read ? 'read' : ''}" data-id="${n.id}">
        <span class="notif-icon">${n.type === 'critical' ? '🔴' : n.type === 'success' ? '✅' : 'ℹ️'}</span>
        <span>${escapeHTML(n.message)}</span>
      </div>
    `).join('');
  }

  bell.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = dropdown.classList.toggle('open');
    if (open) refresh();
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) dropdown.classList.remove('open');
  });

  listEl.addEventListener('click', async (e) => {
    const item = e.target.closest('.notif-item');
    if (!item || item.classList.contains('read')) return;
    await api.patch(`/notifications/${item.dataset.id}/read`, {}, true);
    item.classList.add('read');
    refresh();
  });

  // Periodically refresh so badge stays current.
  setInterval(refresh, 60000);
}

/* ── 3D tilt + parallax (desktop, fine-pointer, motion-safe only) ── */
function init3DEffects() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  if (reduceMotion || coarse) return;

  const tiltSelectors = ['.cta-card', '.how-step', '.blood-unit-card', '.donor-profile-card', '.patient-form-card', '.donor-card'];
  tiltSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if (el.dataset.tiltInit) return;
      el.dataset.tiltInit = '1';
      el.classList.add('tilt-el');
      let raf = null;
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.style.transform = `perspective(850px) rotateY(${(px * 16).toFixed(2)}deg) rotateX(${(-py * 12).toFixed(2)}deg) translateZ(6px)`;
        });
      });
      el.addEventListener('mouseleave', () => {
        if (raf) cancelAnimationFrame(raf);
        el.style.transform = '';
      });
    });
  });

  // Subtle parallax on the hero background circles.
  const circles = document.querySelector('.hero-bg-circles');
  if (circles) {
    let parRaf = null;
    document.addEventListener('mousemove', (e) => {
      if (parRaf) cancelAnimationFrame(parRaf);
      parRaf = requestAnimationFrame(() => {
        const cx = e.clientX / window.innerWidth - 0.5;
        const cy = e.clientY / window.innerHeight - 0.5;
        circles.style.transform = `translate(${(-cx * 20).toFixed(1)}px, ${(-cy * 14).toFixed(1)}px)`;
      });
    });
  }
}
