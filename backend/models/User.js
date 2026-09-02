const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    email: { type: String, trim: true, lowercase: true, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['donor', 'patient', 'hospital'], required: true },
    phone: { type: String, default: '' },
    createdAt: { type: String, default: () => new Date().toISOString() }
  },
  { collection: 'users' }
);

// Join a hospital or patient profile for the same user when present.
userSchema.methods.toSafeObject = function () {
  const { password, __v, ...safe } = this.toObject({ virtuals: false });
  safe.id = this.id;
  return safe;
};

module.exports = mongoose.model('User', userSchema);