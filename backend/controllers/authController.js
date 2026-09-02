const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { isRequired, isEmail, isRole, validateBody } = require('../utils/validate');
const User = require('../models/User');
const { toApi } = require('../utils/mongo');

// POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    const check = validateBody(req.body, {
      name: [isRequired, 'Name is required.'],
      email: [isEmail, 'A valid email is required.'],
      password: [(v) => isRequired(v) && String(v).length >= 6, 'Password must be at least 6 characters.'],
      role: [isRole, 'Role must be one of: donor, patient, hospital.']
    });
    if (!check.ok) {
      return res.status(400).json({ success: false, message: check.errors.join(' ') });
    }

    const emailLower = email.toLowerCase();
    const existing = await User.findOne({ email: emailLower });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email: emailLower,
      password: hashedPassword,
      role, // 'donor' | 'patient' | 'hospital'
      phone: phone || ''
    });

    const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!isRequired(email) || !isRequired(password)) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user.id });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

module.exports = { signup, login, getMe, toApi };