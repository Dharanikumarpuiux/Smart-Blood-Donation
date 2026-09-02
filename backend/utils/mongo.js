// Convenience helpers to keep the API response shape identical to before
// the JSON-file -> MongoDB migration: every resource exposes an `id` string.

// Converts a Mongoose document (or a lean/plain object) into a plain API object.
const toApi = (doc) => {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject({ virtuals: false }) : doc;
  const { _id, __v, ...rest } = obj;
  return { id: String(_id), ...rest };
};

const toApiList = (docs) => Array.isArray(docs) ? docs.map(toApi) : [];

module.exports = { toApi, toApiList };