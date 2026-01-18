import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/contexts/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Singleton socket instance for user updates
let userUpdateSocketInstance: Socket | null = null;

/**
 * Hook to listen for user leagues updates and force refresh
 * This should be used in the root App component or AuthContext
 */
export const useUserLeaguesListener = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    // Initialize socket if not already created
    if (!userUpdateSocketInstance) {
      const token = localStorage.getItem("token");

      userUpdateSocketInstance = io(API_URL, {
        auth: {
          token: token || "",
        },
        transports: ["websocket", "polling"],
      });

      userUpdateSocketInstance.on("connect", () => {});

      userUpdateSocketInstance.on("disconnect", () => {});

      userUpdateSocketInstance.on("connect_error", (error) => {});
    }

    const socket = userUpdateSocketInstance;

    // Listen for user leagues updates
    const handleLeaguesUpdated = (data: any) => {
      // Check if this update is for the current user
      if (data.userId === user.id || data.userId === user._id) {
        // Show alert to user
        alert(
          "Your league access has been updated by an administrator. The page will now refresh."
        );

        // Force page refresh to reload user data and redirect to home
        window.location.href = "/";
      }
    };

    socket.on("user-leagues-updated", handleLeaguesUpdated);

    // Cleanup
    return () => {
      socket.off("user-leagues-updated", handleLeaguesUpdated);
    };
  }, [user, navigate, logout]);

  return userUpdateSocketInstance;
};

// Cleanup function
export const disconnectUserUpdateSocket = () => {
  if (userUpdateSocketInstance) {
    userUpdateSocketInstance.disconnect();
    userUpdateSocketInstance = null;
  }
};
