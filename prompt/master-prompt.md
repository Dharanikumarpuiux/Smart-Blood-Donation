# LifeDrop — Master Implementation Prompt (for OpenCode)

Paste this whole document as your instruction to the OpenCode agent. It is written so the agent works in safe, verifiable phases instead of one giant edit.

---

## 0. Ground rules (read first, apply throughout)

You are extending an existing working project called **LifeDrop** (Node.js/Express backend, JSON-file storage, JWT auth, plain HTML/CSS/JS frontend). The app already works end-to-end for Donors, Patients, and Hospitals.

**Non-negotiable constraints:**
1. Do not rewrite or restructure any existing file wholesale. Only add new files or make minimal, additive, backward-compatible edits to existing ones.
2. Never change an existing function's name, route path, or JSON field name that other files already depend on. If you must extend a data shape, add new **optional** fields with safe defaults — never rename or remove existing fields.
3. Before editing any existing file, read it fully first. After editing, re-read it to confirm nothing else broke.
4. Work in this exact phase order. After each phase: run the app, manually smoke-test the affected pages/routes, and fix any breakage before moving to the next phase. Do not start Phase 2 with Phase 1 unverified.
5. Create a git commit (or at minimum a copy/backup) before you start, and one commit per phase, so any phase can be reverted independently.
6. Preserve the existing visual design language (colors, fonts, card/button styles) in every new UI element — new features should look like they were always part of the app, not bolted on.
7. If a requested change conflicts with something already working, stop and flag it instead of guessing.

Now implement the following four phases in order.

---

## Phase 1 — Security fixes (foundation, do this first)

1. **Role-based authorization.** Add `backend/middleware/requireRole.js` exporting a `requireRole(...allowedRoles)` middleware that checks `req.user.role` (already set by the existing JWT middleware) and returns `403` if it doesn't match. Apply it as an *additional* middleware argument on the register/update routes in `routes/donors.js`, `routes/hospitals.js`, `routes/patients.js` — do not change the route paths or handler signatures, just add the middleware in the chain.
2. **JWT secret to environment variable.** Add `dotenv` as a dependency, create a `.env` file (and `.env.example` with a placeholder), load it in `server.js`, and replace the hardcoded secret in `middleware/auth.js` with `process.env.JWT_SECRET`. Add `.env` to `.gitignore`.
3. **Trim public data exposure.**
   - `GET /api/hospitals/requests`: when the caller is unauthenticated (or not the requester's own hospital/patient), return only `{ bloodGroup, units, urgency, city, createdAt, status }` — strip requester identity fields. Keep the full object for authenticated owners/admins.
   - `GET /api/donors`: confirm `userId` and any other internal fields stay stripped (already partially done) — audit and close any remaining leaks the same way.
4. **Input validation.** Add lightweight server-side validation (e.g. a small `utils/validate.js` with plain functions, no new heavy dependency needed unless you prefer `zod`/`joi`) on all POST/PATCH bodies in every controller — required fields, blood group enum, phone/email format. Return `400` with a clear message on failure. Do not change response shapes for the success case.
5. **XSS fixes.** In `find-blood.js`, `hospital.js`, and any other frontend file using `innerHTML` with user-entered values (names, notes, hospital names, etc.), switch to `textContent` for plain text insertion or escape the string before interpolating into HTML templates. Keep the visual output identical.
6. **Rate limiting.** Add `express-rate-limit` on `/api/auth/login` and `/api/auth/signup` (e.g. 10 requests / 15 min per IP) to blunt brute-force and spam signups.

Verify after Phase 1: login/signup/register/search flows still work exactly as before for all three roles; a donor can no longer create a hospital request; unauthenticated request-list no longer leaks requester identity.

---

## Phase 2 — Social-impact features (core value-add)

1. **Blood compatibility engine.** Add `backend/utils/compatibility.js` (or a frontend equivalent in `js/`) with a pure function `getCompatibleDonorTypes(recipientBloodGroup) => string[]` implementing standard donor/recipient compatibility rules (e.g. O- is universal donor, AB+ is universal recipient). Use it in `donorController.getDonors` / `find-blood.js` so that when a search for an exact blood group returns few/no results, the UI also offers compatible alternatives, clearly labeled "Compatible alternatives" below the exact matches — additive section, doesn't remove the existing exact-match list.
2. **Urgent request broadcast.** When a hospital/patient creates a request with `urgency: 'critical'`, automatically compute matching available donors (blood group + city, using the compatibility engine as fallback) and:
   - Surface a highlighted "🔴 Urgent near you" banner/section on `find-blood.html` and the donor dashboard (`donor.html`) for matching donors, styled with the existing card/alert visual language (e.g. reuse the existing toast/alert color for `critical`).
   - Add a new endpoint `GET /api/donors/urgent-matches` (auth-protected, donor role) returning open critical requests matching that donor's profile.
3. **Request status lifecycle.** Extend `status` on request records from just `'open'` to `open | in-progress | fulfilled | expired`, defaulting existing records without the field to `'open'` for backward compatibility. Add `PATCH /api/hospitals/requests/:id/status` and the patient equivalent (auth, owner-only) so requesters can mark their own requests fulfilled. Update `find-blood.html`/dashboards to hide non-`open` requests from the public feed while still showing them in the owner's "my requests" list.

Verify after Phase 2: existing request creation and donor search still work unmodified for the "happy path"; new compatibility/urgent sections appear only as additions, never replacing existing UI.

---

## Phase 3 — Donation history, cooldown, and notifications

1. **Donation history + eligibility cooldown.** Add optional fields to donor profile: `lastDonationDate`, `donationCount` (already present per the doc — reuse it), and compute `eligibleFrom = lastDonationDate + 90 days` server-side or client-side. Replace the raw `isAvailable` boolean display with a badge: "Available now" / "Eligible from <date>" — but keep `isAvailable` itself as the underlying field other code already reads, so nothing downstream breaks. Add a small "Log a donation" action on the donor dashboard that sets `lastDonationDate` to today and increments `donationCount`.
2. **In-app notifications.** Add `notifications.json` (per-user array: `{ id, userId, message, type, read, createdAt }`) and a small controller/routes (`GET /api/notifications`, `PATCH /api/notifications/:id/read`). Trigger a notification when: a donor is matched to an urgent request (Phase 2), or a requester's request changes status. Render as a bell icon + dropdown in the shared navbar (`api.js`/navbar logic), reusing the existing `showToast()` styling for consistency — this is additive to the navbar, not a redesign of it.

Verify after Phase 3: donor dashboards load correctly for both existing profiles (no `lastDonationDate` yet) and new ones; notifications endpoint returns `[]` gracefully for users with none.

---

## Phase 4 — Visual polish, 3D effects, and responsive design

**Design constraint: reuse the existing color palette, typography, and spacing from the current CSS — 3D effects should feel like a subtle premium layer on top of the current look, not a redesign.**

1. **Dashboard analytics strip (hospitals).** Client-side computed (no new backend needed): total requests this month, fulfilled %, most-requested blood group — small stat cards above the existing inventory bars.
2. **3D visual effects, implemented lightweight and dependency-free where possible:**
   - **CSS 3D tilt-on-hover** for donor/hospital/request cards using `transform: perspective() rotateX() rotateY()` driven by mouse position (vanilla JS `mousemove` listener, ~20 lines, no library).
   - **CSS 3D flip cards** for the donor profile summary (front = summary, back = donation stats), using `transform-style: preserve-3d` and `backface-visibility: hidden`.
   - **Subtle parallax/particle hero background** on `index.html` only: either pure CSS (layered gradients moving on scroll) or, if you want richer motion, a small Three.js canvas (CDN import, isolated to that one page, must not affect load time or layout of other pages) showing abstract drifting particles (blood-drop or heartbeat motif) behind the hero text.
   - Respect `prefers-reduced-motion: reduce` — disable tilt/parallax/particle motion for users who request it.
3. **Full responsive audit.** For every existing page, verify and fix (via CSS only, not markup restructuring unless required) at these breakpoints: 320–375px (small phone), 480px, 768px (tablet), 1024px, 1440px+:
   - No horizontal scroll/overflow at any width.
   - Multi-step donor form, tabbed hospital/patient portals, and inventory bars reflow to single-column on mobile.
   - Navbar collapses to a mobile menu below ~768px if it doesn't already.
   - New 3D/analytics elements degrade gracefully on mobile (e.g. disable tilt effect on touch devices, stack analytics cards vertically).
   - Test with actual browser dev-tools device emulation, not just visual guessing.

Verify after Phase 4: every page renders without overlap/clipping at all listed breakpoints; 3D effects are visually present on desktop and cleanly absent/simplified on mobile and for reduced-motion users; page load time is not meaningfully worse than before.

---

## Phase 5 — Final security audit (do this last, across the whole app)

Run a structured audit and produce a short written report (`SECURITY_AUDIT.md`) alongside fixing what you find:

1. **Dependency audit:** run `npm audit` in `backend/`, fix or document any vulnerabilities.
2. **AuthN/AuthZ:** confirm every mutating route requires auth; confirm role checks from Phase 1 cover every register/update/delete/status-change route, including the new ones added in Phases 2–3.
3. **Injection/XSS:** grep the whole frontend for remaining `innerHTML` usage with dynamic data and confirm each is escaped or replaced; confirm no server code passes unsanitized input into file paths or shell commands.
4. **IDOR checks:** for every `:id`-based route (requests, notifications, profiles), confirm the server checks that the authenticated user owns or is authorized to access that resource, not just that a valid ID was supplied.
5. **Secrets:** confirm `.env` is git-ignored and no secret is hardcoded anywhere (grep for the old hardcoded JWT string to make sure it's gone).
6. **Rate limiting & abuse:** confirm login/signup limits from Phase 1 are active; consider adding a basic limit on request-creation endpoints to prevent spam.
7. **Data integrity under concurrency:** since storage is still JSON files, confirm read-modify-write operations (e.g. status updates, donation logging) don't race — add a simple in-process write lock/queue per file if not already effectively serialized by Node's single-threaded model and synchronous fs calls.
8. **CORS:** confirm CORS config isn't wide open (`*`) in a way that's inappropriate once auth is in play; scope it to the actual frontend origin if feasible.
9. **Error handling:** confirm error responses never leak stack traces or internal file paths to the client.

Summarize findings as: Issue → Severity → Fix applied (or Fix recommended, if out of scope) in `SECURITY_AUDIT.md`.

---

## Final deliverable checklist for the agent

- [ ] All 5 phases implemented in order, each verified before moving on
- [ ] No existing route, field name, or page behavior changed/removed
- [ ] New features visually consistent with existing design
- [ ] Responsive at all listed breakpoints, no overlap/scroll bugs
- [ ] 3D effects respect `prefers-reduced-motion` and degrade on mobile
- [ ] `SECURITY_AUDIT.md` written with findings and fixes
- [ ] App still starts cleanly with `npm run dev` and all original flows (signup/login/donor register/hospital register/patient register/search/request creation) work unchanged
