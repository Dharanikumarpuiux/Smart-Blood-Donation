/* donor.js — Donor registration page logic */

let currentStep = 1;
const totalSteps = 4;
let donorProfile = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  const user = api.getUser();

  // Pre-fill user info
  const nameField = document.getElementById('d-fullname');
  const emailField = document.getElementById('d-email');
  if (nameField && user) nameField.value = user.name;
  if (emailField && user) emailField.value = user.email;

  // Load existing donor profile
  await loadDonorProfile();

  // Step navigation
  document.querySelectorAll('.btn-next').forEach(btn => {
    btn.addEventListener('click', () => nextStep());
  });

  document.querySelectorAll('.btn-prev').forEach(btn => {
    btn.addEventListener('click', () => prevStep());
  });

  // Form submit
  const donorForm = document.getElementById('donor-form');
  if (donorForm) {
    donorForm.addEventListener('submit', handleDonorSubmit);
  }

  // Availability toggle
  const availToggle = document.getElementById('avail-toggle');
  if (availToggle) {
    availToggle.addEventListener('change', toggleAvailability);
  }
});

async function loadDonorProfile() {
  const res = await api.get('/donors/me', true);
  if (res.ok && res.data.success) {
    donorProfile = res.data.donor;
    populateForm(donorProfile);
    showProfileCard(donorProfile);
    loadUrgentMatches();
  } else {
    showFormSection();
  }
}

// Shows critical requests this donor is matched to.
async function loadUrgentMatches() {
  const container = document.getElementById('donor-urgent-banner');
  if (!container) return;
  const res = await api.get('/donors/urgent-matches', true);
  if (!res.ok || !res.data.success || !res.data.requests.length) return;
  container.style.display = 'block';
  container.innerHTML = `
    <div class="urgent-alert">
      <div class="urgent-alert-icon">🆘</div>
      <div style="flex:1">
        <h3 style="color:var(--danger);margin-bottom:0.25rem;">🔴 Urgent near you</h3>
        <p style="font-size:0.85rem;">Someone in your area needs blood you can donate.</p>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:0.75rem;">
      ${res.data.requests.map(r => `
        <div class="request-card urgency-critical">
          <div class="urgency-dot"></div>
          <div class="request-info">
            <h4>${escapeHTML(r.bloodGroup)} — ${escapeHTML(r.units)} unit(s) needed</h4>
            <p>${escapeHTML(r.requesterName)} · ${r.city ? escapeHTML(r.city) : 'Your region'} · ${new Date(r.createdAt).toLocaleDateString('en-IN')}</p>
            ${r.notes ? `<p style="margin-top:0.2rem;font-size:0.78rem;">${escapeHTML(r.notes)}</p>` : ''}
          </div>
          <span class="badge badge-red">CRITICAL</span>
        </div>
      `).join('')}
    </div>`;
}

function populateForm(donor) {
  const fields = {
    'd-fullname': donor.fullName,
    'd-age': donor.age,
    'd-gender': donor.gender,
    'd-phone': donor.phone,
    'd-email': donor.email,
    'd-address': donor.address,
    'd-city': donor.city,
    'd-state': donor.state,
    'd-pincode': donor.pincode,
    'd-weight': donor.weight,
    'd-lastdonation': donor.lastDonationDate,
    'd-medical': donor.medicalConditions,
  };

  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && val) el.value = val;
  });

  // Blood group
  const bgOption = document.querySelector(`input[name="bloodGroup"][value="${donor.bloodGroup}"]`);
  if (bgOption) bgOption.checked = true;
}

function showProfileCard(donor) {
  const formSection = document.getElementById('donor-form-section');
  const profileSection = document.getElementById('donor-profile-section');
  if (formSection) formSection.style.display = 'none';
  if (profileSection) {
    profileSection.style.display = 'block';
    renderProfileCard(donor);
  }
}

function showFormSection() {
  const formSection = document.getElementById('donor-form-section');
  const profileSection = document.getElementById('donor-profile-section');
  if (formSection) formSection.style.display = 'block';
  if (profileSection) profileSection.style.display = 'none';
}

function renderProfileCard(donor) {
  const card = document.getElementById('profile-card');
  if (!card) return;

  const initials = donor.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const lastDonation = donor.lastDonationDate ? new Date(donor.lastDonationDate).toLocaleDateString('en-IN') : 'Never';
  const safeName = escapeHTML(donor.fullName);
  const safeCity = escapeHTML(donor.city);
  const safeState = escapeHTML(donor.state);

  // 90-day eligibility cooldown badge
  const eligibleFrom = getEligibleFrom(donor.lastDonationDate);
  let availabilityBadge;
  if (donor.isAvailable) {
    availabilityBadge = '<span class="badge badge-green">✅ Available now</span>';
  } else if (eligibleFrom && eligibleFrom > new Date()) {
    availabilityBadge = `<span class="badge badge-yellow">⏳ Eligible from ${eligibleFrom.toLocaleDateString('en-IN')}</span>`;
  } else {
    availabilityBadge = '<span class="badge badge-yellow">⏸ Unavailable</span>';
  }

  card.innerHTML = `
    <div class="donor-card-header">
      <div class="donor-avatar-lg">${escapeHTML(initials)}</div>
      <div class="donor-card-info">
        <h2>${safeName}</h2>
        <div class="meta">
          <span class="blood-tag">${escapeHTML(donor.bloodGroup)}</span>
          ${availabilityBadge}
          <span class="badge badge-blue">${escapeHTML(donor.gender) || 'N/A'}</span>
        </div>
        <p style="margin-top:0.4rem;font-size:0.85rem;color:var(--text-muted);">
          📍 ${safeCity}${donor.state ? ', ' + safeState : ''}
        </p>
      </div>
    </div>

    <div class="donor-stats">
      <div class="donor-stat">
        <div class="val">${donor.donationCount}</div>
        <div class="lbl">Donations</div>
      </div>
      <div class="donor-stat">
        <div class="val">${escapeHTML(donor.age) || '—'}</div>
        <div class="lbl">Age</div>
      </div>
      <div class="donor-stat">
        <div class="val">${donor.weight ? escapeHTML(donor.weight) + ' kg' : '—'}</div>
        <div class="lbl">Weight</div>
      </div>
    </div>

    <div class="divider"></div>

    <div class="availability-section">
      <div class="avail-text">
        <strong>Donation Availability</strong>
        <span>${donor.isAvailable ? 'You are visible to patients & hospitals' : 'You are currently hidden from searches'}</span>
      </div>
      <label class="toggle">
        <input type="checkbox" id="avail-toggle" ${donor.isAvailable ? 'checked' : ''} onchange="toggleAvailability()">
        <span class="toggle-slider"></span>
      </label>
    </div>

    <div class="divider"></div>

    <div style="display:flex;gap:0.75rem;margin-top:0.5rem;flex-wrap:wrap;">
      <button class="btn btn-secondary btn-sm" onclick="editProfile()">✏️ Edit Profile</button>
      <button class="btn btn-primary btn-sm" onclick="logDonation()">🩸 Log a Donation</button>
      <div style="flex:1"></div>
      <span style="font-size:0.8rem;color:var(--text-muted);align-self:center;">
        Last donation: ${escapeHTML(lastDonation)}
      </span>
    </div>
  `;
}

// lastDonationDate + 90 days.
function getEligibleFrom(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 90);
  return d;
}

// POST /donors/log-donation → sets today as last donation, +1 count, enters cooldown.
async function logDonation() {
  const res = await api.post('/donors/log-donation', {}, true);
  if (res.ok && res.data.success) {
    donorProfile = res.data.donor;
    showToast('Donation logged. You can donate again after 90 days.', 'success');
    renderProfileCard(donorProfile);
  } else {
    showToast(res.data.message || 'Failed to log donation', 'error');
  }
}

function editProfile() {
  if (donorProfile) populateForm(donorProfile);
  showFormSection();
}

function nextStep() {
  if (!validateStep(currentStep)) return;
  if (currentStep < totalSteps) {
    document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.remove('active');
    currentStep++;
    document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.add('active');
    updateSteps();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function prevStep() {
  if (currentStep > 1) {
    document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.remove('active');
    currentStep--;
    document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.add('active');
    updateSteps();
  }
}

function updateSteps() {
  document.querySelectorAll('.step').forEach((step, i) => {
    const stepNum = i + 1;
    step.classList.remove('active', 'done');
    if (stepNum < currentStep) step.classList.add('done');
    else if (stepNum === currentStep) step.classList.add('active');
  });
}

function validateStep(step) {
  if (step === 1) {
    const name = document.getElementById('d-fullname').value.trim();
    const age = document.getElementById('d-age').value;
    const phone = document.getElementById('d-phone').value.trim();
    if (!name) { showToast('Please enter your full name', 'error'); return false; }
    if (!age || age < 18 || age > 65) { showToast('Age must be between 18 and 65', 'error'); return false; }
    if (!phone || phone.length < 10) { showToast('Please enter a valid phone number', 'error'); return false; }
  }
  if (step === 2) {
    const bg = document.querySelector('input[name="bloodGroup"]:checked');
    if (!bg) { showToast('Please select your blood group', 'error'); return false; }
  }
  if (step === 3) {
    const city = document.getElementById('d-city').value.trim();
    if (!city) { showToast('Please enter your city', 'error'); return false; }
  }
  return true;
}

async function handleDonorSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('submit-donor-btn');
  const bloodGroup = document.querySelector('input[name="bloodGroup"]:checked')?.value;

  if (!bloodGroup) { showToast('Please select your blood group', 'error'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving...';

  const payload = {
    fullName: document.getElementById('d-fullname').value.trim(),
    age: document.getElementById('d-age').value,
    gender: document.getElementById('d-gender').value,
    bloodGroup,
    phone: document.getElementById('d-phone').value.trim(),
    email: document.getElementById('d-email').value.trim(),
    address: document.getElementById('d-address').value.trim(),
    city: document.getElementById('d-city').value.trim(),
    state: document.getElementById('d-state').value.trim(),
    pincode: document.getElementById('d-pincode').value.trim(),
    weight: document.getElementById('d-weight').value,
    lastDonationDate: document.getElementById('d-lastdonation').value || null,
    medicalConditions: document.getElementById('d-medical').value.trim() || 'None',
    isAvailable: true,
  };

  const res = await api.post('/donors/register', payload, true);

  btn.disabled = false;
  btn.innerHTML = '💾 Save Profile';

  if (res.ok && res.data.success) {
    donorProfile = res.data.donor;
    showToast('Donor profile saved successfully!', 'success');
    setTimeout(() => showProfileCard(donorProfile), 800);
  } else {
    showToast(res.data.message || 'Failed to save profile', 'error');
  }
}

async function toggleAvailability() {
  const res = await api.patch('/donors/availability', {}, true);
  if (res.ok && res.data.success) {
    if (donorProfile) donorProfile.isAvailable = res.data.isAvailable;
    const status = res.data.isAvailable ? 'Available' : 'Unavailable';
    showToast(`Status changed to: ${status}`, 'success');
    if (donorProfile) renderProfileCard(donorProfile);
  } else {
    showToast('Failed to update availability', 'error');
  }
}
