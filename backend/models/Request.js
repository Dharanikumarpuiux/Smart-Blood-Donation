const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['hospital', 'patient'], required: true },
    requesterId: { type: String, required: true },
    requesterName: { type: String, default: '' },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], required: true },
    units: { type: Number, default: 1 },
    urgency: { type: String, enum: ['normal', 'urgent', 'critical'], default: 'normal' },
    patientName: { type: String, default: '' },
    notes: { type: String, default: '' },
    city: { type: String, default: '' },
    status: { type: String, enum: ['open', 'in-progress', 'fulfilled', 'expired'], default: 'open' },
    matchedDonorIds: { type: [String], default: [] },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
  },
  { collection: 'requests' }
);

requestSchema.index({ status: 1 });
requestSchema.index({ urgency: 1 });
requestSchema.index({ requesterId: 1 });

module.exports = mongoose.model('Request', requestSchema);