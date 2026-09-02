/* find-blood.js — Search donors page logic */

let allDonors = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadDonors();
  await loadUrgentRequests();

  // Search form
  const searchForm = document.getElementById('search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      filterDonors();
    });
  }

  // Filter chips (blood group quick filters)
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const bg = chip.dataset.bg;
      const bgSelect = document.getElementById('search-blood-group');
      if (bgSelect && bg !== 'all') bgSelect.value = bg;
      else if (bgSelect) bgSelect.value = '';
      filterDonors();
    });
  });
});

async function loadDonors() {
  const grid = document.getElementById('donors-grid');
  if (!grid) return;

  grid.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><h3>Loading donors...</h3></div>';

  const res = await api.get('/donors?available=true');
  if (res.ok && res.data.success) {
    allDonors = res.data.donors;
    renderDonors(allDonors);
    updateCount(allDonors.length);
  } else {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Could not load donors</h3><p>Make sure the server is running</p></div>';
  }
}

// Loads open critical requests to surface as "🔴 Urgent near you".
async function loadUrgentRequests() {
  const container = document.getElementById('urgent-banner');
  if (!container) return;

  const res = await api.get('/hospitals/requests');
  if (!res.ok || !res.data.success) return;

  const critical = (res.data.requests || []).filter(r => r.status === 'open' && r.urgency === 'critical');
  if (critical.length === 0) {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'block';
  container.innerHTML = `
    <div class="urgent-alert">
      <div class="urgent-alert-icon">🆘</div>
      <div style="flex:1">
        <h3 style="color:var(--danger);margin-bottom:0.25rem;">🔴 Urgent blood needed right now</h3>
        <p style="font-size:0.85rem;">Open critical requests. Donors with compatible blood groups are encouraged to help.</p>
      </div>
    </div>
    <div class="urgent-list" id="urgent-list"></div>`;

  const list = document.getElementById('urgent-list');
  list.innerHTML = critical.map(r => `
    <div class="request-card urgency-critical">
      <div class="urgency-dot"></div>
      <div class="request-info">
        <h4>${escapeHTML(r.bloodGroup)} — ${escapeHTML(r.units)} unit(s) needed</h4>
        <p>${r.city ? escapeHTML(r.city) : 'Your region'} · ${r.status.toUpperCase()} · ${new Date(r.createdAt).toLocaleDateString('en-IN')}</p>
      </div>
      <span class="badge badge-red">${escapeHTML(r.urgency).toUpperCase()}</span>
    </div>
  `).join('');
}

function filterDonors() {
  const bloodGroup = document.getElementById('search-blood-group')?.value;
  const city = document.getElementById('search-city')?.value.trim().toLowerCase();

  let exact = [...allDonors];
  if (bloodGroup) exact = exact.filter(d => d.bloodGroup === bloodGroup);
  if (city) exact = exact.filter(d => d.city.toLowerCase().includes(city));

  let compatible = [];
  if (bloodGroup) {
    const compatibleTypes = getCompatibleDonorTypes(bloodGroup);
    compatible = allDonors.filter(d =>
      compatibleTypes.includes(d.bloodGroup) && d.bloodGroup !== bloodGroup
    );
    if (city) compatible = compatible.filter(d => d.city.toLowerCase().includes(city));
  }

  renderDonors(exact, compatible);
  updateCount(exact.length, allDonors.length, compatible.length);
}

function renderDonors(exact, compatible) {
  const grid = document.getElementById('donors-grid');
  if (!grid) return;

  if (exact.length === 0 && (!compatible || compatible.length === 0)) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🩸</div>
        <h3>No donors found</h3>
        <p>Try a different blood group or location</p>
      </div>`;
    return;
  }

  const parts = [];
  if (exact.length) {
    parts.push(exact.map(d => renderDonorCard(d, false)).join(''));
  }
  if (compatible && compatible.length && exact.length < 3) {
    parts.push(`
      <div class="compatible-header" style="grid-column:1/-1;margin:0.5rem 0 0.25rem;">
        <span class="section-tag">🔄 Compatible alternatives</span>
        <p style="font-size:0.85rem;color:var(--text-muted);">Exact matches are limited — these compatible donors can also help.</p>
      </div>`);
    parts.push(compatible.map(d => renderDonorCard(d, true)).join(''));
  }
  grid.innerHTML = parts.join('');
}

function renderDonorCard(donor, isCompatible) {
  const initials = donor.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const lastDonation = donor.lastDonationDate ? new Date(donor.lastDonationDate).toLocaleDateString('en-IN') : 'Never';
  const safeName = escapeHTML(donor.fullName);
  const safeCity = escapeHTML(donor.city);
  const safeState = escapeHTML(donor.state);
  const safePhone = escapeHTML(maskPhone(donor.phone));
  return `
    <div class="donor-card animate-in">
      <div class="donor-card-top">
        <div class="blood-tag blood-tag-lg">${escapeHTML(donor.bloodGroup)}</div>
        <div class="donor-card-name">
          <h3>${safeName}</h3>
          <span class="location">📍 ${safeCity}${donor.state ? ', ' + safeState : ''}</span>
        </div>
        ${isCompatible
          ? '<span class="badge badge-blue" style="align-self:flex-start">Compatible</span>'
          : '<span class="badge badge-green" style="align-self:flex-start">Available</span>'}
      </div>
      <div class="donor-card-details">
        <div class="detail-item">
          <span class="label">Age</span>
          <span class="value">${escapeHTML(donor.age) || '—'} yrs</span>
        </div>
        <div class="detail-item">
          <span class="label">Gender</span>
          <span class="value">${escapeHTML(donor.gender) || '—'}</span>
        </div>
        <div class="detail-item">
          <span class="label">Last Donated</span>
          <span class="value">${escapeHTML(lastDonation)}</span>
        </div>
        <div class="detail-item">
          <span class="label">Donations</span>
          <span class="value">${donor.donationCount || 0} times</span>
        </div>
      </div>
      <div class="donor-card-footer">
        <span style="font-size:0.82rem;color:var(--text-muted);">📞 ${safePhone}</span>
        <button class="btn btn-primary btn-sm" onclick="contactDonor('${safePhone}', '${safeName.replace(/'/g, "\\'")}')">
          Contact
        </button>
      </div>
    </div>`;
}

function updateCount(shown, total = null, compatible = 0) {
  const countEl = document.getElementById('results-count');
  if (countEl) {
    countEl.innerHTML = total
      ? `Showing <strong>${shown}</strong> of <strong>${total}</strong> available donors${compatible ? ` + <strong>${compatible}</strong> compatible` : ''}`
      : `<strong>${shown}</strong> available donors found${compatible ? ` + <strong>${compatible}</strong> compatible` : ''}`;
  }
}

function maskPhone(phone) {
  if (!phone || phone.length < 6) return phone || '—';
  return phone.slice(0, 3) + '*****' + phone.slice(-2);
}

function contactDonor(phone, name) {
  if (!api.isLoggedIn()) {
    showToast('Please login to contact donors', 'error');
    setTimeout(() => window.location.href = 'login.html', 1000);
    return;
  }
  showToast(`Contacting ${name}...`, 'info');
  // In a real app, this would trigger a contact request
  alert(`Donor Contact:\n\nName: ${name}\nPhone: ${phone}\n\nPlease call or message the donor directly.`);
}
