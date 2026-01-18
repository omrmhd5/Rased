import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Singleton socket instance
let socketInstance: Socket | null = null;

export interface SocketEvents {
  "violation-updated": (data: any) => void;
  "violation-deleted": (data: any) => void;
  "bulk-violations-added": (data: any) => void;
  "bulk-violations-deleted": (data: any) => void;
  "bulk-status-changed": (data: any) => void;
  "activity-log-updated": (data: any) => void;
  "user-joined": (data: any) => void;
  "user-left": (data: any) => void;
}

export const useSocket = (
  matchId: string | undefined,
  handlers: Partial<SocketEvents>
) => {
  const handlersRef = useRef(handlers);

  // Update handlers ref when they change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!matchId) return;

    // Initialize socket if not already created
    if (!socketInstance) {
      const token = localStorage.getItem("token");

      socketInstance = io(API_URL, {
        auth: {
          token: token || "",
        },
        transports: ["websocket", "polling"], // Try WebSocket first, fallback to polling
      });

      socketInstance.on("connect", () => {
        console.log("✅ Socket connected:", socketInstance?.id);
      });

      socketInstance.on("disconnect", () => {
        console.log("❌ Socket disconnected");
      });

      socketInstance.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
      });
    }

    const socket = socketInstance;

    // Join match room
    socket.emit("join-match", matchId);
    console.log(`👤 Joined match room: ${matchId}`);

    // Register event handlers
    const eventHandlers: [string, (data: any) => void][] = [
      [
        "violation-updated",
        (data) => handlersRef.current["violation-updated"]?.(data),
      ],
      [
        "violation-deleted",
        (data) => handlersRef.current["violation-deleted"]?.(data),
      ],
      [
        "bulk-violations-added",
        (data) => handlersRef.current["bulk-violations-added"]?.(data),
      ],
      [
        "bulk-violations-deleted",
        (data) => handlersRef.current["bulk-violations-deleted"]?.(data),
      ],
      [
        "bulk-status-changed",
        (data) => handlersRef.current["bulk-status-changed"]?.(data),
      ],
      [
        "activity-log-updated",
        (data) => handlersRef.current["activity-log-updated"]?.(data),
      ],
      ["user-joined", (data) => handlersRef.current["user-joined"]?.(data)],
      ["user-left", (data) => handlersRef.current["user-left"]?.(data)],
    ];

    eventHandlers.forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    // Cleanup
    return () => {
      socket.emit("leave-match", matchId);
      console.log(`👋 Left match room: ${matchId}`);

      eventHandlers.forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, [matchId]);

  return socketInstance;
};

// Cleanup function to disconnect socket (call on app unmount or logout)
export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    console.log("🔌 Socket disconnected and cleaned up");
  }
};
