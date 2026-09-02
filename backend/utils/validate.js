// Lightweight server-side validation helpers (no heavy dependencies).

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ROLES = ['donor', 'patient', 'hospital'];
const REQUEST_STATUSES = ['open', 'in-progress', 'fulfilled', 'expired'];
const URGENCY_LEVELS = ['normal', 'urgent', 'critical'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s\-()]{7,15}$/;

const isRequired = (val) => {
  if (val === undefined || val === null) return false;
  return String(val).trim().length > 0;
};

const isEmail = (val) => {
  if (!isRequired(val)) return false;
  return EMAIL_RE.test(String(val).trim());
};

const isPhone = (val) => {
  if (!isRequired(val)) return false;
  return PHONE_RE.test(String(val).trim());
};

const isBloodGroup = (val) => BLOOD_GROUPS.includes(val);

const isRole = (val) => ROLES.includes(val);

const isRequestStatus = (val) => REQUEST_STATUSES.includes(val);

const isUrgency = (val) => URGENCY_LEVELS.includes(val);

// Validates an object against a schema of { field: [validatorFn, errorMessage] }.
// Returns { ok: true } or { ok: false, errors: string[] }.
const validateBody = (body, schema) => {
  const errors = [];
  for (const [field, [validator, message]] of Object.entries(schema)) {
    if (!validator(body[field])) {
      errors.push(message.replace('{field}', field));
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true };
};

module.exports = {
  BLOOD_GROUPS,
  ROLES,
  REQUEST_STATUSES,
  URGENCY_LEVELS,
  isRequired,
  isEmail,
  isPhone,
  isBloodGroup,
  isRole,
  isRequestStatus,
  isUrgency,
  validateBody,
};