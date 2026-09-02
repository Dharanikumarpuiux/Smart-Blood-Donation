const { isRequired, isPhone, isBloodGroup, isUrgency, validateBody } = require('../utils/validate');
const { getUrgentMatchedDonors } = require('../utils/urgent');
const { createNotification } = require('./notificationsController');
const Hospital = require('../models/Hospital');
const Patient = require('../models/Patient');
const Request = require('../models/Request');
const { toApi } = require('../utils/mongo');

// POST /api/hospitals/register — create or update the caller's hospital profile.
const registerHospital = async (req, res) => {
  try {
    const { hospitalName, regNumber, phone, email, address, city, state, pincode, specialization, bedCount } = req.body;

    const check = validateBody(req.body, {
      hospitalName: [isRequired, 'Hospital name is required.'],
      city: [isRequired, 'City is required.'],
      phone: [isPhone, 'A valid phone number is required.']
    });
    if (!check.ok) {
      return res.status(400).json({ success: false, message: check.errors.join(' ') });
    }

    const existing = await Hospital.findOne({ userId: req.user.id }).lean();

    const hospitalData = {
      hospitalName,
      regNumber: regNumber || '',
      phone,
      email: email || req.user.email,
      address: address || '',
      city,
      state: state || '',
      pincode: pincode || '',
      specialization: specialization || 'General',
      bedCount: bedCount || '',
      bloodInventory: existing ? existing.bloodInventory : {
        'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0,
        'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0
      },
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const hospital = await Hospital.findOneAndUpdate({ userId: req.user.id }, hospitalData, {
      upsert: true, new: true, setDefaultsOnInsert: true
    }).lean();

    res.status(201).json({ success: true, message: 'Hospital profile saved!', hospital: toApi(hospital) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// GET /api/hospitals
const getHospitals = async (req, res) => {
  try {
    const { city } = req.query;
    const filter = {};
    if (city) filter.city = { $regex: city, $options: 'i' };
    const hospitals = await Hospital.find(filter).lean();
    const safe = hospitals.map(({ userId, _id, __v, ...h }) => ({ id: String(_id), ...h }));
    res.json({ success: true, hospitals: safe });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// GET /api/hospitals/me
const getMyHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ userId: req.user.id }).lean();
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital profile not found.' });
    res.json({ success: true, hospital: toApi(hospital) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/hospitals/request - create blood request
const createRequest = async (req, res) => {
  try {
    const { bloodGroup, units, urgency, patientName, notes } = req.body;
    const hospital = await Hospital.findOne({ userId: req.user.id }).lean();

    const check = validateBody(req.body, {
      bloodGroup: [isBloodGroup, 'A valid blood group is required.'],
      urgency: [isUrgency, 'Urgency must be one of: normal, urgent, critical.']
    });
    if (!check.ok) {
      return res.status(400).json({ success: false, message: check.errors.join(' ') });
    }

    const newRequest = {
      type: 'hospital',
      requesterId: req.user.id,
      requesterName: hospital ? hospital.hospitalName : req.user.name,
      bloodGroup,
      units: units || 1,
      urgency: urgency || 'normal', // normal | urgent | critical
      patientName: patientName || '',
      notes: notes || '',
      city: hospital ? (hospital.city || '') : '',
      status: 'open'
    };

    // Critical requests: compute the matching available donors now.
    if (newRequest.urgency === 'critical') {
      newRequest.matchedDonorIds = (await getUrgentMatchedDonors(newRequest)).map(d => String(d.userId));
      newRequest.matchedDonorIds.forEach(donorId => {
        createNotification(
          donorId,
          `🔴 Urgent blood needed: ${newRequest.bloodGroup} in ${newRequest.city || 'your area'}. You are a compatible donor — please help.`,
          'critical'
        );
      });
    }

    const request = await Request.create(newRequest);

    res.status(201).json({ success: true, message: 'Blood request created!', request: toApi(request) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// GET /api/hospitals/requests
// Public feed: only 'open' requests, stripped of requester identity.
// Authenticated owner: full records for their own requests (all statuses).
const getRequests = async (req, res) => {
  try {
    const [requests, hospitals, patients] = await Promise.all([
      Request.find({}).sort({ createdAt: 1 }).lean(),
      Hospital.find({}).lean(),
      Patient.find({}).lean()
    ]);

    const cityFor = (r) => {
      const pool = r.type === 'patient' ? patients : hospitals;
      const record = pool.find(p => String(p.userId) === String(r.requesterId));
      return record ? record.city || '' : '';
    };

    const publicShape = (r) => ({
      id: r.id || String(r._id),
      type: r.type,
      bloodGroup: r.bloodGroup,
      units: r.units,
      urgency: r.urgency,
      city: cityFor(r),
      status: r.status,
      createdAt: r.createdAt
    });

    const isOwner = (r) => req.user && String(req.user.id) === String(r.requesterId);

    // Public feed = open requests only; owner records are swapped in with full data.
    const result = [];

    for (const r of requests) {
      const record = { ...toApi(r), status: r.status || 'open' };
      if (isOwner(r)) {
        result.push({ ...record, isOwner: true });
      } else if (record.status === 'open') {
        result.push({ ...publicShape(record), isOwner: false });
      }
    }
    res.json({ success: true, requests: result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

module.exports = { registerHospital, getHospitals, getMyHospital, createRequest, getRequests };