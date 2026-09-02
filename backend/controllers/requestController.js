// Shared request status lifecycle handler (Phase 2).
// PATCH /api/hospitals/requests/:id/status and /api/patients/requests/:id/status
const { isRequestStatus, REQUEST_STATUSES } = require('../utils/validate');
const { createNotification } = require('./notificationsController');
const Request = require('../models/Request');
const { toApi } = require('../utils/mongo');

// Body: { status: 'open' | 'in-progress' | 'fulfilled' | 'expired' }
const updateRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!isRequestStatus(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${REQUEST_STATUSES.join(', ')}.`
      });
    }

    const request = await Request.findOne({ _id: req.params.id });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    // Owner-only: only the requester may change their own request's status.
    if (String(request.requesterId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only update your own requests.' });
    }

    request.status = status;
    request.updatedAt = new Date().toISOString();
    await request.save();

    createNotification(
      request.requesterId,
      `${request.type === 'hospital' ? '🏥' : '🤒'} Your blood request (${request.bloodGroup}) is now marked as "${status}".`,
      status === 'fulfilled' ? 'success' : 'info'
    );

    res.json({ success: true, message: 'Request status updated.', request: toApi(request) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

module.exports = { updateRequestStatus };