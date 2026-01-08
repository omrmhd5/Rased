import { NavLink as RouterNavLink, NavLinkProps, useNavigate } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

// Internal component that uses hooks
const NavLinkInternal = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, onClick, ...props }, ref) => {
    const { user, leagues } = useAuth();
    const navigate = useNavigate();
    
    // Get selected league from localStorage
    const selectedLeague = localStorage.getItem("selectedLeague");
    
    // Validate if selected league is still available and visible
    const isValidSelectedLeague = (league: string | null): boolean => {
      if (!league || !user || !leagues) return false;
      
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
    
    // Check if navigation is allowed (only for employees and viewers - they need a valid league selected)
    const canNavigate = (): boolean => {
      // SuperAdmin can always navigate
      if (user?.role === "superAdmin") {
        return true;
      }
      // Employees and viewers need a valid league selected
      return selectedLeague && isValidSelectedLeague(selectedLeague);
    };

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Allow navigation to home and settings (for superAdmin) without league check
      const path = typeof to === "string" ? to : to.toString();
      if (path === "/" || (path === "/settings" && user?.role === "superAdmin")) {
        if (onClick) onClick(e);
        return;
      }

      // For other routes, check if navigation is allowed
      if (!canNavigate()) {
        e.preventDefault();
        
        // Clear invalid league from localStorage
        if (selectedLeague && !isValidSelectedLeague(selectedLeague)) {
          localStorage.removeItem("selectedLeague");
        }
        
        // Get available leagues
        const availableLeagues = leagues?.filter((l) => {
          if (l.isHidden) return false;
          if (user?.role === "employee" && user.leagues) {
            return user.leagues.includes(l.league);
          }
          return true;
        }) || [];
        
        if (availableLeagues.length === 0) {
          toast({
            title: "No Leagues Available",
            description: "No leagues are available. Please contact an administrator.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "League Required",
            description: "Please select a league before navigating to this page.",
            variant: "destructive",
          });
        }
        // Navigate to home to show the league selection dialog
        navigate("/");
        return;
      }

      if (onClick) onClick(e);
    };

    return (
      <RouterNavLink
        ref={ref}
        to={to}
        onClick={handleClick}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...props}
      />
    );
  },
);

NavLinkInternal.displayName = "NavLink";

export { NavLinkInternal as NavLink };
