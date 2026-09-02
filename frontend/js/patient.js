/* patient.js — Patient portal logic */

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  await loadPatientProfile();

  // Tab switching
  document.querySelectorAll('[data-patient-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.patientTab;
      document.querySelectorAll('[data-patient-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.patient-tab').forEach(t => {
        t.classList.toggle('active', t.id === `ptab-${tab}`);
      });
    });
  });

  // Patient form
  const patientForm = document.getElementById('patient-form');
  if (patientForm) patientForm.addEventListener('submit', handlePatientSubmit);

  // Request form
  const requestForm = document.getElementById('patient-request-form');
  if (requestForm) requestForm.addEventListener('submit', handleRequestSubmit);

  await loadMyRequests();
});

async function loadPatientProfile() {
  const user = api.getUser();
  const res = await api.get('/patients/me', true);
  if (res.ok && res.data.success) {
    populatePatientForm(res.data.patient);
    showPatientHeader(res.data.patient);
  } else {
    // Pre-fill from user
    if (user) {
      const nameEl = document.getElementById('p-fullname');
      const emailEl = document.getElementById('p-email');
      if (nameEl) nameEl.value = user.name;
      if (emailEl) emailEl.value = user.email;
    }
  }
}

function populatePatientForm(patient) {
  const fields = {
    'p-fullname': patient.fullName,
    'p-age': patient.age,
    'p-gender': patient.gender,
    'p-blood-group': patient.bloodGroup,
    'p-phone': patient.phone,
    'p-email': patient.email,
    'p-address': patient.address,
    'p-city': patient.city,
    'p-state': patient.state,
    'p-condition': patient.medicalCondition,
    'p-hospital': patient.hospital,
  };
  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && val) el.value = val;
  });
}

function showPatientHeader(patient) {
  const header = document.getElementById('patient-header');
  if (!header) return;
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
      <div class="blood-tag blood-tag-lg">${escapeHTML(patient.bloodGroup)}</div>
      <div>
        <h2 style="margin:0">${escapeHTML(patient.fullName)}</h2>
        <p style="margin:0.2rem 0 0;font-size:0.85rem;">📍 ${escapeHTML(patient.city)}${patient.state ? ', ' + escapeHTML(patient.state) : ''}</p>
      </div>
    </div>`;
}

async function handlePatientSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('save-patient-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving...';

  const payload = {
    fullName: document.getElementById('p-fullname').value.trim(),
    age: document.getElementById('p-age').value,
    gender: document.getElementById('p-gender').value,
    bloodGroup: document.getElementById('p-blood-group').value,
    phone: document.getElementById('p-phone').value.trim(),
    email: document.getElementById('p-email').value.trim(),
    address: document.getElementById('p-address').value.trim(),
    city: document.getElementById('p-city').value.trim(),
    state: document.getElementById('p-state').value.trim(),
    medicalCondition: document.getElementById('p-condition').value.trim(),
    hospital: document.getElementById('p-hospital').value.trim(),
  };

  const res = await api.post('/patients/register', payload, true);
  btn.disabled = false;
  btn.innerHTML = '💾 Save Profile';

  if (res.ok && res.data.success) {
    showToast('Patient profile saved!', 'success');
    showPatientHeader(res.data.patient);
  } else {
    showToast(res.data.message || 'Failed to save', 'error');
  }
}

async function handleRequestSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('submit-req-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Submitting...';

  const payload = {
    bloodGroup: document.getElementById('req-bg').value,
    units: document.getElementById('req-units').value,
    urgency: document.getElementById('req-urgency').value,
    notes: document.getElementById('req-notes').value.trim(),
  };

  const res = await api.post('/patients/request', payload, true);
  btn.disabled = false;
  btn.innerHTML = '🩸 Submit Blood Request';

  if (res.ok && res.data.success) {
    showToast('Blood request submitted!', 'success');
    e.target.reset();
    await loadMyRequests();
    // Switch to status tab
    document.querySelector('[data-patient-tab="status"]')?.click();
  } else {
    showToast(res.data.message || 'Failed to submit', 'error');
  }
}

async function loadMyRequests() {
  const container = document.getElementById('my-requests-list');
  if (!container) return;

  const res = await api.get('/patients/requests/mine', true);
  if (!res.ok || !res.data.success || res.data.requests.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No requests yet</h3>
        <p>Submit a blood request using the form</p>
      </div>`;
    return;
  }

  container.innerHTML = res.data.requests.map(req => {
    const statusMeta = {
      'open': ['badge-yellow', 'Open'],
      'in-progress': ['badge-blue', 'In Progress'],
      'fulfilled': ['badge-green', 'Fulfilled'],
      'expired': ['badge-red', 'Expired']
    };
    const [badgeClass, badgeLabel] = statusMeta[req.status] || ['badge-yellow', req.status || 'Open'];
    return `
    <div class="request-status-card status-${req.status}">
      <div class="request-status-icon">
        ${req.urgency === 'critical' ? '🆘' : req.urgency === 'urgent' ? '⚠️' : '🩸'}
      </div>
      <div style="flex:1">
        <h4>${escapeHTML(req.bloodGroup)} Blood — ${escapeHTML(req.units)} unit(s)</h4>
        <p style="font-size:0.82rem;color:var(--text-muted);">
          ${new Date(req.createdAt).toLocaleDateString('en-IN')} ·
          ${escapeHTML(req.urgency).toUpperCase()}
        </p>
        ${req.notes ? `<p style="font-size:0.82rem;margin-top:0.2rem;">${escapeHTML(req.notes)}</p>` : ''}
        ${(req.status === 'open' || req.status === 'in-progress') ? `
          <button class="btn btn-secondary btn-sm" style="margin-top:0.75rem;" onclick="markRequestFulfilled('${req.id}')">✅ Mark Fulfilled</button>` : ''}
      </div>
      <span class="badge ${badgeClass}">${badgeLabel}</span>
    </div>`;
  }).join('');
}

// Owner-only: mark one of the patient's own requests as fulfilled.
async function markRequestFulfilled(requestId) {
  const res = await api.patch(`/patients/requests/${requestId}/status`, { status: 'fulfilled' }, true);
  if (res.ok && res.data.success) {
    showToast('Request marked as fulfilled', 'success');
    await loadMyRequests();
  } else {
    showToast(res.data.message || 'Failed to update request', 'error');
  }
}
