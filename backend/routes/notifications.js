const express = require('express');
const router = express.Router();
const { getNotifications, markRead } = require('../controllers/notificationsController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, getNotifications);
router.patch('/:id/read', authMiddleware, markRead);

module.exports = router;