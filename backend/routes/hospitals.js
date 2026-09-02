const express = require('express');
const router = express.Router();
const { registerHospital, getHospitals, getMyHospital, createRequest, getRequests } = require('../controllers/hospitalController');
const { updateRequestStatus } = require('../controllers/requestController');
const authMiddleware = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const requireRole = require('../middleware/requireRole');

router.get('/', getHospitals);
router.post('/register', authMiddleware, requireRole('hospital'), registerHospital);
router.get('/me', authMiddleware, getMyHospital);
router.post('/request', authMiddleware, requireRole('hospital'), createRequest);
router.get('/requests', optionalAuth, getRequests);
router.patch('/requests/:id/status', authMiddleware, requireRole('hospital'), updateRequestStatus);

module.exports = router;
