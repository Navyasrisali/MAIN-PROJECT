const socketIO = require('socket.io');

class SocketManager {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // socket.id -> userId
  }

  initialize(server) {
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:3003",
      "https://navyasrisali.github.io"
    ];

    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL);
    }

    this.io = socketIO(server, {
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"]
      }
    });

    this.setupEventHandlers();
    return this.io;
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);
      
      socket.on('join', (userId) => {
        const userIdStr = String(userId);
        socket.join(userIdStr);
        this.connectedUsers.set(socket.id, parseInt(userId));
        
        // Import users from database to update online status
        const db = require('../config/database');
        const user = db.users.find(u => u.id === parseInt(userId));
        if (user) {
          user.isOnline = true;
          db.save(); // Save the online status to database
          console.log(`🟢 User ${user.name} (${user.role}) connected and set online via socket, joined room: ${userIdStr}`);
          
          socket.emit('statusUpdate', { isOnline: true });
        } else {
          console.log(`⚠️ Socket join: User with ID ${userId} not found in users array`);
        }
      });
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        const userId = this.connectedUsers.get(socket.id);
        if (userId) {
          const db = require('../config/database');
          const user = db.users.find(u => u.id === parseInt(userId));
          if (user) {
            user.isOnline = false;
            db.save(); // Save the offline status to database
            console.log(`🔴 User ${user.name} is now offline (disconnected)`);
          }
          this.connectedUsers.delete(socket.id);
        }
      });
    });
  }

  // Emit to specific user
  emitToUser(userId, event, data) {
    if (this.io) {
      const userIdStr = String(userId);
      console.log(`📤 Emitting ${event} to room ${userIdStr}`);
      this.io.to(userIdStr).emit(event, data);
    }
  }

  // Emit to all clients
  emitToAll(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }
}

// Create singleton instance
const socketManager = new SocketManager();

module.exports = socketManager;