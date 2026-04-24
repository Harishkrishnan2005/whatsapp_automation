import { Server } from 'socket.io';
import logger from './logger.js';

class SocketManager {
  constructor() {
    this.io = null;
    this.onlineUsers = new Map(); // userId -> socketId
  }

  init(server) {
    this.io = new Server(server, {
      cors: {
        origin: '*', // In production, replace with actual origin
        methods: ['GET', 'POST'],
      },
    });

    this.io.on('connection', (socket) => {
      logger.info(`New client connected: ${socket.id}`);

      // User identifies themselves
      socket.on('join', (userId) => {
        if (userId) {
          this.onlineUsers.set(userId, socket.id);
          socket.join(userId);
          logger.info(`User ${userId} joined room`);
        }
      });

      // Typing indicator
      socket.on('typing', ({ conversationId, userId, isTyping }) => {
        socket.to(conversationId).emit('display_typing', { userId, isTyping });
      });

      // Join a specific conversation room
      socket.on('join_conversation', (conversationId) => {
        socket.join(conversationId);
        logger.info(`Socket ${socket.id} joined conversation ${conversationId}`);
      });

      socket.on('leave_conversation', (conversationId) => {
        socket.leave(conversationId);
      });

      socket.on('disconnect', () => {
        for (const [userId, socketId] of this.onlineUsers.entries()) {
          if (socketId === socket.id) {
            this.onlineUsers.delete(userId);
            break;
          }
        }
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  // Emit message to a specific room or user
  emitToRoom(room, event, data) {
    if (this.io) {
      this.io.to(room).emit(event, data);
    }
  }

  emitToUser(userId, event, data) {
    if (this.io && this.onlineUsers.has(userId)) {
      this.io.to(this.onlineUsers.get(userId)).emit(event, data);
    }
  }

  broadcast(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }
}

export default new SocketManager();
