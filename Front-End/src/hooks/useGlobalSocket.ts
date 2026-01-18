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
    console.log("🔧 useGlobalSocket: Initializing...");

    // Initialize socket if not already created
    if (!globalSocketInstance) {
      console.log("🔧 useGlobalSocket: Creating new socket instance");
      const token = localStorage.getItem("token");

      globalSocketInstance = io(API_URL, {
        auth: {
          token: token || "",
        },
        transports: ["websocket", "polling"],
      });

      globalSocketInstance.on("connect", () => {
        console.log("✅ Global Socket connected:", globalSocketInstance?.id);
      });

      globalSocketInstance.on("disconnect", () => {
        console.log("❌ Global Socket disconnected");
      });

      globalSocketInstance.on("connect_error", (error) => {
        console.error("Global Socket connection error:", error);
      });
    } else {
      console.log(
        "🔧 useGlobalSocket: Reusing existing socket instance",
        globalSocketInstance.id
      );
    }

    const socket = globalSocketInstance;

    // Join the global dashboard room to receive all events
    console.log("🔧 useGlobalSocket: Joining dashboard room...");
    socket.emit("join-match", "dashboard");
    console.log("👤 Joined dashboard room for global updates");

    // Listen for ALL violation events (from any match)
    const handleAnyEvent = (data: any) => {
      console.log("📡 Global: Violation change detected!", data);
      onAnyChange();
    };

    // Register listeners for all event types
    console.log("🔧 useGlobalSocket: Registering event listeners...");
    socket.on("violation-updated", handleAnyEvent);
    socket.on("violation-deleted", handleAnyEvent);
    socket.on("bulk-violations-added", handleAnyEvent);
    socket.on("bulk-violations-deleted", handleAnyEvent);
    socket.on("bulk-status-changed", handleAnyEvent);
    console.log("✅ useGlobalSocket: Event listeners registered");

    // Cleanup
    return () => {
      console.log("🔧 useGlobalSocket: Cleaning up...");
      socket.emit("leave-match", "dashboard");
      console.log("👋 Left dashboard room");

      socket.off("violation-updated", handleAnyEvent);
      socket.off("violation-deleted", handleAnyEvent);
      socket.off("bulk-violations-added", handleAnyEvent);
      socket.off("bulk-violations-deleted", handleAnyEvent);
      socket.off("bulk-status-changed", handleAnyEvent);
      console.log("✅ useGlobalSocket: Cleanup complete");
    };
  }, [onAnyChange]);

  return globalSocketInstance;
};

// Cleanup function
export const disconnectGlobalSocket = () => {
  if (globalSocketInstance) {
    globalSocketInstance.disconnect();
    globalSocketInstance = null;
    console.log("🔌 Global Socket disconnected and cleaned up");
  }
};
