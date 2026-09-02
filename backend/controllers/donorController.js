const { isRequired, isPhone, isBloodGroup, validateBody } = require('../utils/validate');
const { getUrgentMatchedDonors } = require('../utils/urgent');
const Donor = require('../models/Donor');
const Request = require('../models/Request');
const { toApi } = require('../utils/mongo');

// POST /api/donors/register — create or update the caller's donor profile.
const registerDonor = async (req, res) => {
  try {
    const {
      fullName, age, gender, bloodGroup, phone, email,
      address, city, state, pincode,
      lastDonationDate, medicalConditions, isAvailable, weight
    } = req.body;

    if (!fullName || !bloodGroup || !phone || !city) {
      return res.status(400).json({ success: false, message: 'Name, blood group, phone, and city are required.' });
    }

    const existing = await Donor.findOne({ userId: req.user.id }).lean();

    const donorData = {
      fullName,
      age: age || '',
      gender: gender || '',
      bloodGroup,
      phone,
      email: email || req.user.email,
      address: address || '',
      city,
      state: state || '',
      pincode: pincode || '',
      lastDonationDate: lastDonationDate || null,
      medicalConditions: medicalConditions || 'None',
      isAvailable: isAvailable !== undefined ? isAvailable : (existing ? existing.isAvailable : true),
      weight: weight || '',
      donationCount: existing ? existing.donationCount : 0,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const donor = await Donor.findOneAndUpdate({ userId: req.user.id }, donorData, {
      upsert: true, new: true, setDefaultsOnInsert: true
    }).lean();

    res.status(201).json({ success: true, message: 'Donor profile saved!', donor: toApi(donor) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// GET /api/donors - search donors
const getDonors = async (req, res) => {
  try {
    const { bloodGroup, city, available } = req.query;
    const filter = {};
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (city) filter.city = { $regex: city, $options: 'i' };
    if (available === 'true') filter.isAvailable = true;

    const donors = await Donor.find(filter).lean();

    // Remove sensitive/internal fields from the public list
    const safeDonors = donors.map(({ userId, email, address, _id, __v, ...d }) => ({ id: String(_id), ...d }));
    res.json({ success: true, donors: safeDonors, count: safeDonors.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// GET /api/donors/me
const getMyDonorProfile = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.id }).lean();
    if (!donor) return res.status(404).json({ success: false, message: 'Donor profile not found.' });
    res.json({ success: true, donor: toApi(donor) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/donors/availability
const toggleAvailability = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.id });
    if (!donor) return res.status(404).json({ success: false, message: 'Donor profile not found.' });

    donor.isAvailable = !donor.isAvailable;
    donor.updatedAt = new Date().toISOString();
    await donor.save();

    res.json({ success: true, isAvailable: donor.isAvailable });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/donors/log-donation
// Records today's donation: sets lastDonationDate, increments donationCount,
// and marks the donor unavailable (enters the 90-day eligibility cooldown).
const logDonation = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.id });
    if (!donor) return res.status(404).json({ success: false, message: 'Donor profile not found.' });

    const today = new Date().toISOString().split('T')[0];
    donor.lastDonationDate = today;
    donor.donationCount = (donor.donationCount || 0) + 1;
    donor.isAvailable = false;
    donor.updatedAt = new Date().toISOString();
    await donor.save();

    res.json({ success: true, message: 'Donation logged. You are now eligible to donate again after 90 days.', donor: toApi(donor) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/donors/urgent-matches
// Returns open critical requests that this donor is matched to (compatible group + city).
const getUrgentMatches = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.id }).lean();
    if (!donor) return res.status(404).json({ success: false, message: 'Donor profile not found.' });

    const openCritical = await Request.find({ status: 'open', urgency: 'critical' }).lean();

    const matches = [];
    for (const r of openCritical) {
      const matched = await getUrgentMatchedDonors(r);
      if (matched.some(d => String(d.userId) === String(donor.userId))) {
        matches.push(toApi(r));
      }
    }

    const safe = matches.map(({ matchedDonorIds, ...r }) => ({ ...r, city: r.city || '' }));
    res.json({ success: true, requests: safe, count: safe.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

module.exports = { registerDonor, getDonors, getMyDonorProfile, toggleAvailability, logDonation, getUrgentMatches };