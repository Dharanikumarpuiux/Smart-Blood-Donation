const mongoose = require('mongoose');

const bloodInventorySchema = new mongoose.Schema(
  {
    'A+': { type: Number, default: 0 },
    'A-': { type: Number, default: 0 },
    'B+': { type: Number, default: 0 },
    'B-': { type: Number, default: 0 },
    'AB+': { type: Number, default: 0 },
    'AB-': { type: Number, default: 0 },
    'O+': { type: Number, default: 0 },
    'O-': { type: Number, default: 0 }
  },
  { _id: false }
);

const hospitalSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    hospitalName: { type: String, trim: true, required: true },
    regNumber: { type: String, default: '' },
    phone: { type: String, required: true },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, trim: true, required: true },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    specialization: { type: String, default: 'General' },
    bedCount: { type: String, default: '' },
    bloodInventory: { type: bloodInventorySchema, default: () => ({ 'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0 }) },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
  },
  { collection: 'hospitals' }
);

hospitalSchema.index({ userId: 1 }, { unique: true });
hospitalSchema.index({ city: 1 });

module.exports = mongoose.model('Hospital', hospitalSchema);