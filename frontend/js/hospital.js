/* hospital.js — Hospital portal logic */

let currentTab = 'dashboard';

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  const user = api.getUser();

  // Load hospital profile
  await loadHospitalProfile();

  // Tab navigation
  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      switchTab(tab);
    });
  });

  // Hospital registration form
  const hospitalForm = document.getElementById('hospital-form');
  if (hospitalForm) {
    hospitalForm.addEventListener('submit', handleHospitalSubmit);
  }

  // Blood request form
  const requestForm = document.getElementById('request-form');
  if (requestForm) {
    requestForm.addEventListener('submit', handleRequestSubmit);
  }

  // Load requests
  await loadRequests();
  loadStats();
});

// Live platform analytics strip (public aggregate counts, no PII).
async function loadStats() {
  const ids = ['stat-donors', 'stat-available', 'stat-hospitals', 'stat-open', 'stat-units'];
  const res = await api.get('/stats');
  if (!res.ok || !res.data.success) {
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '—'; });
    return;
  }
  const s = res.data.stats;
  const map = {
    'stat-donors': s.donors,
    'stat-available': s.availableDonors,
    'stat-hospitals': s.hospitals,
    'stat-open': s.openRequests,
    'stat-units': s.totalUnitsRequested,
  };
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = map[id] ?? 0; });

  const myOpen = document.getElementById('dash-open-requests');
  if (myOpen) myOpen.textContent = s.openRequests;
  const fulfilled = document.getElementById('dash-fulfilled');
  if (fulfilled) fulfilled.textContent = document.querySelectorAll('#requests-list .request-card').length;
}

async function loadHospitalProfile() {
  const res = await api.get('/hospitals/me', true);
  if (res.ok && res.data.success) {
    const hospital = res.data.hospital;
    populateHospitalForm(hospital);
    updateHospitalSidebar(hospital);
    updateInventoryDisplay(hospital.bloodInventory);
  }
}

function populateHospitalForm(hospital) {
  const fields = {
    'h-name': hospital.hospitalName,
    'h-reg': hospital.regNumber,
    'h-phone': hospital.phone,
    'h-email': hospital.email,
    'h-address': hospital.address,
    'h-city': hospital.city,
    'h-state': hospital.state,
    'h-pincode': hospital.pincode,
    'h-specialization': hospital.specialization,
    'h-beds': hospital.bedCount,
  };
  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && val) el.value = val;
  });
}

function updateHospitalSidebar(hospital) {
  const nameEl = document.getElementById('sidebar-hospital-name');
  const cityEl = document.getElementById('sidebar-hospital-city');
  if (nameEl) nameEl.textContent = hospital.hospitalName;
  if (cityEl) cityEl.textContent = `📍 ${hospital.city}`;
}

function updateInventoryDisplay(inventory) {
  if (!inventory) return;
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  bloodGroups.forEach(bg => {
    const el = document.getElementById(`inv-${bg.replace('+', 'p').replace('-', 'n')}`);
    if (el) el.textContent = inventory[bg] || 0;
    const bar = document.getElementById(`bar-${bg.replace('+', 'p').replace('-', 'n')}`);
    if (bar) {
      const val = inventory[bg] || 0;
      const pct = Math.min((val / 50) * 100, 100);
      bar.style.width = pct + '%';
      bar.parentElement.parentElement.classList.remove('level-critical', 'level-low', 'level-good');
      if (val < 5) bar.parentElement.parentElement.classList.add('level-critical');
      else if (val < 15) bar.parentElement.parentElement.classList.add('level-low');
      else bar.parentElement.parentElement.classList.add('level-good');
    }
  });
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tab);
  });
  document.querySelectorAll('.hospital-tab').forEach(t => {
    t.classList.toggle('active', t.id === `tab-${tab}`);
  });
}

async function handleHospitalSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('save-hospital-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving...';

  const payload = {
    hospitalName: document.getElementById('h-name').value.trim(),
    regNumber: document.getElementById('h-reg').value.trim(),
    phone: document.getElementById('h-phone').value.trim(),
    email: document.getElementById('h-email').value.trim(),
    address: document.getElementById('h-address').value.trim(),
    city: document.getElementById('h-city').value.trim(),
    state: document.getElementById('h-state').value.trim(),
    pincode: document.getElementById('h-pincode').value.trim(),
    specialization: document.getElementById('h-specialization').value.trim(),
    bedCount: document.getElementById('h-beds').value,
  };

  const res = await api.post('/hospitals/register', payload, true);
  btn.disabled = false;
  btn.innerHTML = '💾 Save Hospital Profile';

  if (res.ok && res.data.success) {
    showToast('Hospital profile saved!', 'success');
    updateHospitalSidebar(res.data.hospital);
  } else {
    showToast(res.data.message || 'Failed to save', 'error');
  }
}

async function handleRequestSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('submit-request-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Submitting...';

  const payload = {
    bloodGroup: document.getElementById('req-blood-group').value,
    units: document.getElementById('req-units').value,
    urgency: document.getElementById('req-urgency').value,
    patientName: document.getElementById('req-patient').value.trim(),
    notes: document.getElementById('req-notes').value.trim(),
  };

  const res = await api.post('/hospitals/request', payload, true);
  btn.disabled = false;
  btn.innerHTML = '🚨 Submit Request';

  if (res.ok && res.data.success) {
    showToast('Blood request submitted!', 'success');
    e.target.reset();
    await loadRequests();
    switchTab('requests');
  } else {
    showToast(res.data.message || 'Failed to submit request', 'error');
  }
}

async function loadRequests() {
  const res = await api.get('/hospitals/requests');
  const container = document.getElementById('requests-list');
  if (!container) return;

  if (!res.ok || !res.data.success || res.data.requests.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><h3>No requests yet</h3><p>Submit a blood request using the form</p></div>';
    return;
  }

  const urgencyIcon = { critical: '🔴', urgent: '🟡', normal: '🟢' };
  const statusMeta = {
    'open': ['badge-yellow', 'Open'],
    'in-progress': ['badge-blue', 'In Progress'],
    'fulfilled': ['badge-green', 'Fulfilled'],
    'expired': ['badge-red', 'Expired']
  };
  container.innerHTML = res.data.requests.map(req => {
    const [badgeClass, badgeLabel] = statusMeta[req.status] || ['badge-yellow', req.status || 'Open'];
    return `
    <div class="request-card urgency-${req.urgency}">
      <div class="urgency-dot"></div>
      <div class="request-info">
        <h4>${escapeHTML(req.bloodGroup)} — ${escapeHTML(req.units)} unit(s) needed</h4>
        <p>${req.requesterName ? escapeHTML(req.requesterName) + ' · ' : ''}${escapeHTML(req.urgency).toUpperCase()} · ${new Date(req.createdAt).toLocaleDateString('en-IN')}</p>
        ${req.patientName ? `<p style="margin-top:0.2rem;font-size:0.78rem;">Patient: ${escapeHTML(req.patientName)}</p>` : ''}
        ${(req.isOwner && (req.status === 'open' || req.status === 'in-progress')) ? `
          <button class="btn btn-secondary btn-sm" style="margin-top:0.75rem;" onclick="markHospitalRequestFulfilled('${req.id}')">✅ Mark Fulfilled</button>` : ''}
      </div>
      <span class="badge ${badgeClass}">${badgeLabel}</span>
    </div>`;
  }).join('');
}

// Owner-only: mark one of this hospital's own requests as fulfilled.
async function markHospitalRequestFulfilled(requestId) {
  const res = await api.patch(`/hospitals/requests/${requestId}/status`, { status: 'fulfilled' }, true);
  if (res.ok && res.data.success) {
    showToast('Request marked as fulfilled', 'success');
    await loadRequests();
  } else {
    showToast(res.data.message || 'Failed to update request', 'error');
  }
}
