import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io = null;

/**
 * Initialize Socket.IO server
 * @param {http.Server} httpServer - HTTP server instance
 * @param {Array<string>} allowedOrigins - Array of allowed CORS origins
 */
export const initializeSocket = (httpServer, allowedOrigins) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          // In development, allow any localhost origin
          if (
            origin.startsWith("http://localhost:") ||
            origin.startsWith("http://127.0.0.1:")
          ) {
            callback(null, true);
          } else {
            callback(new Error("Not allowed by CORS"));
          }
        }
      },
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        // Allow connection but mark as unauthenticated
        socket.data.user = null;
        return next();
      }

      // Verify JWT token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key"
      );
      socket.data.user = decoded;
      next();
    } catch (error) {
      console.error("Socket authentication error:", error.message);
      // Allow connection but mark as unauthenticated
      socket.data.user = null;
      next();
    }
  });

  // Connection handler
  io.on("connection", (socket) => {
    const userId = socket.data.user?.userId || "anonymous";
    console.log(`✅ Socket connected: ${socket.id} (User: ${userId})`);

    // Join match-specific room
    socket.on("join-match", (matchId) => {
      socket.join(`match-${matchId}`);
      console.log(`👤 User ${userId} joined match room: match-${matchId}`);

      // Notify others in the room (optional - for user presence)
      socket.to(`match-${matchId}`).emit("user-joined", {
        userId,
        username: socket.data.user?.username || "Anonymous",
      });
    });

    // Leave match room
    socket.on("leave-match", (matchId) => {
      socket.leave(`match-${matchId}`);
      console.log(`👋 User ${userId} left match room: match-${matchId}`);

      // Notify others in the room (optional - for user presence)
      socket.to(`match-${matchId}`).emit("user-left", {
        userId,
        username: socket.data.user?.username || "Anonymous",
      });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${socket.id} (User: ${userId})`);
    });
  });

  console.log("🔌 Socket.IO initialized");
  return io;
};

/**
 * Get Socket.IO instance
 */
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initializeSocket first.");
  }
  return io;
};

/**
 * Emit violation event to all users in a match room AND dashboard
 */
export const emitViolationEvent = (matchId, eventType, data) => {
  if (!io) return;

  const eventData = {
    timestamp: new Date().toISOString(),
    ...data,
  };

  // Emit to match-specific room
  io.to(`match-${matchId}`).emit(eventType, eventData);

  // Also emit to global dashboard room
  io.to("match-dashboard").emit(eventType, eventData);

  console.log(`📡 Emitted ${eventType} to match-${matchId} and dashboard`);
};

/**
 * Emit activity log event to all users in a match room AND dashboard
 */
export const emitActivityLogEvent = (matchId, data) => {
  if (!io) return;

  const eventData = {
    timestamp: new Date().toISOString(),
    ...data,
  };

  io.to(`match-${matchId}`).emit("activity-log-updated", eventData);
  io.to("match-dashboard").emit("activity-log-updated", eventData);

  console.log(
    `📡 Emitted activity-log-updated to match-${matchId} and dashboard`
  );
};

/**
 * Emit bulk operation event to all users in a match room AND dashboard
 */
export const emitBulkEvent = (matchId, eventType, data) => {
  if (!io) return;

  const eventData = {
    timestamp: new Date().toISOString(),
    ...data,
  };

  io.to(`match-${matchId}`).emit(eventType, eventData);
  io.to("match-dashboard").emit(eventType, eventData);

  console.log(`📡 Emitted ${eventType} to match-${matchId} and dashboard`);
};
