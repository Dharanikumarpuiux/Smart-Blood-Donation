// In-app notifications (Phase 3).
// Stored in MongoDB (collection: notifications).
const Notification = require('../models/Notification');
const { toApi, toApiList } = require('../utils/mongo');

// Internal helper: create a notification for a user. Returns the created record.
const createNotification = async (userId, message, type = 'info') => {
  if (!userId || !message) return null;
  return Notification.create({ userId: String(userId), message, type });
};

// GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: 1 }).lean();
    const unread = notifications.filter(n => !n.read).length;
    res.json({ success: true, notifications: toApiList(notifications), unread });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/notifications/:id/read
const markRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    ).lean();

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    res.json({ success: true, message: 'Marked as read', notification: toApi(notification) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

module.exports = { createNotification, getNotifications, markRead };