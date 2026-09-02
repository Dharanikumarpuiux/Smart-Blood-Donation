const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    fullName: { type: String, trim: true, required: true },
    age: { type: String, default: '' },
    gender: { type: String, default: '' },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], required: true },
    phone: { type: String, required: true },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, trim: true, required: true },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    lastDonationDate: { type: String, default: null },
    medicalConditions: { type: String, default: 'None' },
    isAvailable: { type: Boolean, default: true },
    weight: { type: String, default: '' },
    donationCount: { type: Number, default: 0 },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
  },
  { collection: 'donors' }
);

donorSchema.index({ userId: 1 }, { unique: true });
donorSchema.index({ bloodGroup: 1 });
donorSchema.index({ city: 1 });

module.exports = mongoose.model('Donor', donorSchema);