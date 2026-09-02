const { isRequired, isBloodGroup, isUrgency, validateBody } = require('../utils/validate');
const { getUrgentMatchedDonors } = require('../utils/urgent');
const { createNotification } = require('./notificationsController');
const Patient = require('../models/Patient');
const Request = require('../models/Request');
const { toApi } = require('../utils/mongo');

// POST /api/patients/register — create or update the caller's patient profile.
const registerPatient = async (req, res) => {
  try {
    const { fullName, age, gender, bloodGroup, phone, email, address, city, state, medicalCondition, hospital } = req.body;

    const check = validateBody(req.body, {
      fullName: [isRequired, 'Name is required.'],
      bloodGroup: [isBloodGroup, 'A valid blood group is required.'],
      city: [isRequired, 'City is required.']
    });
    if (!check.ok) {
      return res.status(400).json({ success: false, message: check.errors.join(' ') });
    }

    const existing = await Patient.findOne({ userId: req.user.id }).lean();

    const patientData = {
      fullName,
      age: age || '',
      gender: gender || '',
      bloodGroup,
      phone: phone || '',
      email: email || req.user.email,
      address: address || '',
      city,
      state: state || '',
      medicalCondition: medicalCondition || '',
      hospital: hospital || '',
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const patient = await Patient.findOneAndUpdate({ userId: req.user.id }, patientData, {
      upsert: true, new: true, setDefaultsOnInsert: true
    }).lean();

    res.status(201).json({ success: true, message: 'Patient profile saved!', patient: toApi(patient) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// GET /api/patients/me
const getMyPatient = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.id }).lean();
    if (!patient) return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    res.json({ success: true, patient: toApi(patient) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/patients/request
const createRequest = async (req, res) => {
  try {
    const { bloodGroup, units, urgency, notes } = req.body;
    const patient = await Patient.findOne({ userId: req.user.id }).lean();

    const check = validateBody(req.body, {
      bloodGroup: [isBloodGroup, 'A valid blood group is required.'],
      urgency: [isUrgency, 'Urgency must be one of: normal, urgent, critical.']
    });
    if (!check.ok) {
      return res.status(400).json({ success: false, message: check.errors.join(' ') });
    }

    const newRequest = {
      type: 'patient',
      requesterId: req.user.id,
      requesterName: patient ? patient.fullName : req.user.name,
      bloodGroup,
      units: units || 1,
      urgency: urgency || 'normal',
      notes: notes || '',
      city: patient ? (patient.city || '') : '',
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

    res.status(201).json({ success: true, message: 'Blood request submitted!', request: toApi(request) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// GET /api/patients/requests/mine
const getMyRequests = async (req, res) => {
  try {
    const mine = await Request.find({ requesterId: req.user.id }).sort({ createdAt: 1 }).lean();
    const mapped = mine.map(r => ({ ...toApi(r), status: r.status || 'open' }));
    res.json({ success: true, requests: mapped });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

module.exports = { registerPatient, getMyPatient, createRequest, getMyRequests };