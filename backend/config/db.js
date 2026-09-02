require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

// Configure public DNS servers to resolve MongoDB Atlas SRV records reliably on Windows/ISP networks
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if unsupported in environment
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('✖ MONGODB_URI is not set. Add it to backend/.env (see .env.example).');
  process.exit(1);
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    console.log(`\n🍃 MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error(`✖ MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;