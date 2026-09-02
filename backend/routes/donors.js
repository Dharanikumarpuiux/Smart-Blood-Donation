const express = require('express');
const router = express.Router();
const { registerDonor, getDonors, getMyDonorProfile, toggleAvailability, logDonation, getUrgentMatches } = require('../controllers/donorController');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.get('/', getDonors);
router.post('/register', authMiddleware, requireRole('donor'), registerDonor);
router.get('/me', authMiddleware, getMyDonorProfile);
router.post('/log-donation', authMiddleware, requireRole('donor'), logDonation);
router.get('/urgent-matches', authMiddleware, requireRole('donor'), getUrgentMatches);
router.patch('/availability', authMiddleware, requireRole('donor'), toggleAvailability);

module.exports = router;
