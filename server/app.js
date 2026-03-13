const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
require('dotenv').config();

// Import configurations
const db = require('./src/config/database');
const { testEmailConnection } = require('./src/config/email');
const socketManager = require('./src/config/socket');

// Import routes
const routes = require('./src/routes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = socketManager.initialize(server);

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test email configuration on startup
testEmailConnection();

// Register all routes
app.use('/', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: {
      users: db.users.length,
      requests: db.requests.length,
      reviews: db.reviews.length,
      notifications: db.notifications.length
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Frontend: http://localhost:3001`);
  console.log(`🔧 Backend API: http://localhost:${PORT}`);
  console.log(`� Persistent in-memory database active - data will be saved automatically`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown handlers
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT (Ctrl+C). Gracefully shutting down...');
  db.save(); // Save data before exit
  console.log('💾 Database saved successfully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM. Gracefully shutting down...');
  db.save(); // Save data before exit
  console.log('💾 Database saved successfully');
  server.close(() => {
    console.log('🔒 Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  db.save(); // Save data before crash
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  db.save(); // Save data before crash
  process.exit(1);
});