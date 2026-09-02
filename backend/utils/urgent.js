// Urgent-request matching helper (Phase 2).
// Computes available donors who can help with a given blood request,
// using an exact (blood group + city) match with a compatibility fallback.
const { getCompatibleDonorTypes } = require('./compatibility');
const Donor = require('../models/Donor');

// Returns an array of donor records that can help fulfil `request`.
// Matching donor = compatible donor blood type for the requested group,
// same city (case-insensitive), currently available.
// Accepts an optional donorsOverride array (plain objects) to avoid a query.
const getUrgentMatchedDonors = async (request, donorsOverride) => {
  if (!request || !request.bloodGroup) return [];

  const donors = Array.isArray(donorsOverride)
    ? donorsOverride
    : await Donor.find({ isAvailable: { $ne: false } }).lean();

  const requestedGroup = request.bloodGroup;
  const compatibleTypes = getCompatibleDonorTypes(requestedGroup);
  const requestCity = (request.city || '').toLowerCase();

  return donors.filter(donor => {
    const bloodMatch = compatibleTypes.includes(donor.bloodGroup);
    if (!bloodMatch) return false;
    if (!requestCity) return true;
    return String(donor.city || '').toLowerCase() === requestCity;
  });
};

module.exports = { getUrgentMatchedDonors };