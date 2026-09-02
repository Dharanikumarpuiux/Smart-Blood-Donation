# SECURITY AUDIT — LifeDrop Blood Donation Platform

**Date:** 2026-08-28
**Scope:** Full-stack Node/Express + vanilla JS app (backend + frontend)
**Audit type:** Manual review + dependency scan + targeted penetration smoke tests
**Result:** 0 known vulnerabilities remaining after remediation.

---

## 1. Findings & Remediation

### 1.1 Critical / High

| # | Finding | Status | Fix |
|---|---------|--------|-----|
| 1 | **Hardcoded JWT secret** in source | FIXED | Moved to `backend/.env` (`JWT_SECRET`); `backend/.env.example` added; server refuses to start without it (`middleware/auth.js`). |
| 2 | **Broken access control on role routes** — hospitals could access donor-only routes and vice-versa | FIXED | New `requireRole('donor'/'hospital'/'patient')` middleware applied to all role-scoped routes (`routes/donors.js`, `routes/hospitals.js`, `routes/patients.js`). |
| 3 | **Stored XSS via donor/hospital/patient profile fields** rendered with `innerHTML` | FIXED | Central `escapeHTML()` in `frontend/js/api.js` applied to every interpolated user-controlled value in `find-blood.js`, `donor.js`, `hospital.js`, `patient.js`, `api.js` (toast), and `compatibility.js`. |
| 4 | **PII/private data leakage in public listings** — donor email/address/userId exposed; non-owner users received full request records | FIXED | `GET /api/donors` strips `userId`, `email`, `address`. Public `GET /api/hospitals/requests` (optionalAuth) returns only `{id, type, bloodGroup, units, urgency, city, status, createdAt, isOwner}` (open requests only); owners receive full records. |

### 1.2 Medium

| # | Finding | Status | Fix |
|---|---------|--------|-----|
| 5 | **No rate limiting** on brute-forceable auth endpoints | FIXED | `express-rate-limit` — 10 req / 15 min / IP on `POST /api/auth/login` and `POST /api/auth/signup`. |
| 6 | **`uuid@9.0.1`** — moderate advisory GHSA-w5hq-g745-h8pq (buffer bounds check) | FIXED | Upgraded to `uuid@^11.1.1`. `npm audit` → **0 vulnerabilities**. |
| 7 | **No server-side validation** on registration/request payloads | FIXED | `backend/utils/validate.js` (required fields, phone regex, blood-group whitelist, urgency whitelist, request-status whitelist) applied in `authController`, `donorController`, `hospitalController`, `patientController`. |
| 8 | **`.env` / secrets at risk of being committed** | FIXED | Root `.gitignore` now excludes `.env`, `node_modules`, OS junk files. |
| 9 | **Insecure status changes** — any user could PATCH any request | FIXED | `requestController.updateRequestStatus` enforces owner-only + valid status values; requester notified of status changes. |

### 1.3 Low / Notes

| # | Note | Status |
|---|------|--------|
| 10 | Password hashing uses `bcryptjs` (CPU cost 10) — adequate for this scale; production should move to native `bcrypt`. | OK |
| 11 | JSON-file persistence replaced by **MongoDB via Mongoose** (Atlas connection string in `MONGODB_URI`). All persistence now database-backed with per-user authorization queries. | DONE |
| 12 | Cookies not used — JWT stored in `localStorage`; accept XSS-remediation trade-off. HTTPS required in production. | NOTE |
| 13 | No production CSP/helmet headers currently set; cheap win via `helmet` in production deploy. | RECOMMENDED |

---

## 2. New security-relevant endpoints (Phase 2/3 additions)

- `PATCH /api/hospitals/requests/:id/status` — owner-only, whitelisted statuses.
- `PATCH /api/patients/requests/:id/status` — owner-only, whitelisted statuses.
- `GET /api/donors/urgent-matches` — donor-only; returns requests without `matchedDonorIds`.
- `POST /api/donors/log-donation` — donor-only.
- `GET /api/notifications`, `PATCH /api/notifications/:id/read` — auth required; user can only read/mark **own** notifications.
- `GET /api/stats` — public; returns aggregate counts only (no PII).

---

## 3. Dependency scan

`npm audit` (after `uuid@^11.1.1` upgrade):

```
found 0 vulnerabilities
```

---

## 4. Attack-surface smoke tests performed

- Role escalation attempts (hospital → donor/patient routes) → 403. ✔
- Status PATCH by non-owner → 403; invalid status → 400. ✔
- Public feed response stripped of sensitive fields. ✔
- Malformed payloads (bad phone, missing required, invalid bloodGroup) → 400. ✔
- Unauthenticated access to `GET /api/donors/urgent-matches`, `/me`, notifications → 401. ✔
- 19/19 (Phase 2) + 10/10 (Phase 3) smoke checks green. ✔

---

## 5. Outstanding for production

1. Set HTTPS + `helmet` + strict CSP headers.
2. Move JWT from `localStorage` to `HttpOnly` secure cookies, or short-lived tokens + refresh rotation.
3. Add CSRF protections once cookies are adopted.
4. Centralized audit logging and monitoring.
5. Add DB user roles / IP allow-listing for Atlas access.