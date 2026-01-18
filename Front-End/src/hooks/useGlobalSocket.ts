import { useEffect } from "react";
import { io, Socket } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Singleton socket instance for global listeners
let globalSocketInstance: Socket | null = null;

/**
 * Hook to listen for ANY violation changes globally (for Dashboard)
 * This doesn't join specific match rooms, just listens for all events
 */
export const useGlobalSocket = (onAnyChange: () => void) => {
  useEffect(() => {
    // Initialize socket if not already created
    if (!globalSocketInstance) {
      const token = localStorage.getItem("token");

      globalSocketInstance = io(API_URL, {
        auth: {
          token: token || "",
        },
        transports: ["websocket", "polling"],
      });

      globalSocketInstance.on("connect", () => {});

      globalSocketInstance.on("disconnect", () => {});

      globalSocketInstance.on("connect_error", (error) => {});
    }

    const socket = globalSocketInstance;

    // Join the global dashboard room to receive all events
    socket.emit("join-match", "dashboard");

    // Listen for ALL violation events (from any match)
    const handleAnyEvent = (data: any) => {
      onAnyChange();
    };

    // Register listeners for all event types
    socket.on("violation-updated", handleAnyEvent);
    socket.on("violation-deleted", handleAnyEvent);
    socket.on("bulk-violations-added", handleAnyEvent);
    socket.on("bulk-violations-deleted", handleAnyEvent);
    socket.on("bulk-status-changed", handleAnyEvent);

    // Cleanup
    return () => {
      socket.emit("leave-match", "dashboard");

      socket.off("violation-updated", handleAnyEvent);
      socket.off("violation-deleted", handleAnyEvent);
      socket.off("bulk-violations-added", handleAnyEvent);
      socket.off("bulk-violations-deleted", handleAnyEvent);
      socket.off("bulk-status-changed", handleAnyEvent);
    };
  }, [onAnyChange]);

  return globalSocketInstance;
};

// Cleanup function
export const disconnectGlobalSocket = () => {
  if (globalSocketInstance) {
    globalSocketInstance.disconnect();
    globalSocketInstance = null;
  }
};
