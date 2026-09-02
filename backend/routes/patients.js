const express = require('express');
const router = express.Router();
const { registerPatient, getMyPatient, createRequest, getMyRequests } = require('../controllers/patientController');
const { updateRequestStatus } = require('../controllers/requestController');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.post('/register', authMiddleware, requireRole('patient'), registerPatient);
router.get('/me', authMiddleware, getMyPatient);
router.post('/request', authMiddleware, requireRole('patient'), createRequest);
router.get('/requests/mine', authMiddleware, getMyRequests);
router.patch('/requests/:id/status', authMiddleware, requireRole('patient'), updateRequestStatus);

module.exports = router;
