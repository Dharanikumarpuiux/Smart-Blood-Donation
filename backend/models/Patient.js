const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    fullName: { type: String, trim: true, required: true },
    age: { type: String, default: '' },
    gender: { type: String, default: '' },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], required: true },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, trim: true, required: true },
    state: { type: String, default: '' },
    medicalCondition: { type: String, default: '' },
    hospital: { type: String, default: '' },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
  },
  { collection: 'patients' }
);

patientSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('Patient', patientSchema);