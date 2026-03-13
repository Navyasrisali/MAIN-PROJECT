const socketIO = require('socket.io');

class SocketManager {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // socket.id -> userId
  }

  initialize(server) {
    this.io = socketIO(server, {
      cors: {
        origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"],
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
      
      // WebRTC Signaling Events
      socket.on('webrtc:offer', ({ to, offer, requestId }) => {
        if (!to) {
          console.error('❌ WebRTC offer missing "to" parameter');
          return;
        }
        const toStr = String(to);
        console.log(`📞 WebRTC offer from socket ${socket.id} (user ${this.connectedUsers.get(socket.id)}) to room ${toStr} for request ${requestId}`);
        this.io.to(toStr).emit('webrtc:offer', {
          from: this.connectedUsers.get(socket.id),
          offer,
          requestId
        });
      });

      socket.on('webrtc:answer', ({ to, answer, requestId }) => {
        if (!to) {
          console.error('❌ WebRTC answer missing "to" parameter');
          return;
        }
        const toStr = String(to);
        console.log(`📞 WebRTC answer from socket ${socket.id} (user ${this.connectedUsers.get(socket.id)}) to room ${toStr} for request ${requestId}`);
        this.io.to(toStr).emit('webrtc:answer', {
          from: this.connectedUsers.get(socket.id),
          answer,
          requestId
        });
      });

      socket.on('webrtc:ice-candidate', ({ to, candidate, requestId }) => {
        if (!to) {
          console.error('❌ WebRTC ICE candidate missing "to" parameter');
          return;
        }
        const toStr = String(to);
        console.log(`🧊 ICE candidate from socket ${socket.id} (user ${this.connectedUsers.get(socket.id)}) to room ${toStr}`);
        this.io.to(toStr).emit('webrtc:ice-candidate', {
          from: this.connectedUsers.get(socket.id),
          candidate,
          requestId
        });
      });

      socket.on('webrtc:end-call', ({ to, requestId }) => {
        if (!to) {
          console.error('❌ WebRTC end-call missing "to" parameter');
          return;
        }
        console.log(`📴 Call ended by ${socket.id} for request ${requestId}`);
        this.io.to(to.toString()).emit('webrtc:end-call', { requestId });
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