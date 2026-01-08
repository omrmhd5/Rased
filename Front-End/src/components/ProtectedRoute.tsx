import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, leagues } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Validate if selected league is still available and visible
  const isValidSelectedLeague = (league: string | null): boolean => {
    if (!league || !leagues) return false;
    
    const leagueInfo = leagues.find((l) => l.league === league);
    if (!leagueInfo) return false;
    
    // Check if league is hidden
    if (leagueInfo.isHidden) return false;
    
    // For employees, check if league is assigned to them
    if (user.role === "employee" && user.leagues) {
      return user.leagues.includes(league);
    }
    
    // For viewers and superAdmin, if league is visible, it's valid
    return true;
  };

  // Check if league is required for this route (only for employees and viewers)
  const selectedLeague = localStorage.getItem("selectedLeague");
  const currentPath = location.pathname;
  
  // Allow navigation to home and settings (for superAdmin) without league check
  const isHome = currentPath === "/";
  const isSettings = currentPath === "/settings" && user.role === "superAdmin";
  
  // For employees and viewers, require valid league selection for all routes except home
  if ((user.role === "employee" || user.role === "viewer") && !isHome && !isSettings) {
    // Check if league is selected and valid
    if (!selectedLeague || !isValidSelectedLeague(selectedLeague)) {
      // Clear invalid league from localStorage
      if (selectedLeague && !isValidSelectedLeague(selectedLeague)) {
        localStorage.removeItem("selectedLeague");
      }
      // Redirect to home to show league selection dialog
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
