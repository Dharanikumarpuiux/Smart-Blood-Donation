const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { signup, login, getMe } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' }
});

router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.get('/me', authMiddleware, getMe);

module.exports = router;
