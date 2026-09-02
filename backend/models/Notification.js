const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'critical', 'success'], default: 'info' },
    read: { type: Boolean, default: false },
    createdAt: { type: String, default: () => new Date().toISOString() }
  },
  { collection: 'notifications' }
);

notificationSchema.index({ userId: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);