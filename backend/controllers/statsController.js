// Public aggregate stats (no PII) for dashboards and the live stats strip.
const Donor = require('../models/Donor');
const Hospital = require('../models/Hospital');
const Patient = require('../models/Patient');
const Request = require('../models/Request');

// GET /api/stats
const getStats = async (req, res) => {
  try {
    const [donors, hospitals, patients, requests] = await Promise.all([
      Donor.countDocuments(),
      Hospital.countDocuments(),
      Patient.countDocuments(),
      Request.find({}).lean()
    ]);

    const stats = {
      donors,
      availableDonors: await Donor.countDocuments({ isAvailable: true }),
      hospitals,
      patients,
      openRequests: requests.filter(r => r.status === 'open').length,
      totalUnitsRequested: requests.reduce((sum, r) => sum + (Number(r.units) || 0), 0)
    };

    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getStats };