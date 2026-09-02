require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const donorRoutes = require('./routes/donors');
const hospitalRoutes = require('./routes/hospitals');
const patientRoutes = require('./routes/patients');
const notificationRoutes = require('./routes/notifications');
const statsRoutes = require('./routes/stats');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Blood Donation API is running' });
});

// Catch-all: serve frontend index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Connect to MongoDB, then start listening.
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🩸 Blood Donation Server running at http://localhost:${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api\n`);
  });
});
