import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Settings, Calendar, ArrowRight, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

type League = string | null;

export default function Home() {
  const { user, leagues, fetchLeagues } = useAuth();
  const navigate = useNavigate();
  const [selectedLeague, setSelectedLeague] = useState<League>(null);
  const [isLeagueDialogOpen, setIsLeagueDialogOpen] = useState(false);

  // Refetch leagues when component mounts
  useEffect(() => {
    if (user) {
      fetchLeagues();
    }
  }, [user, fetchLeagues]);

  // Get available leagues based on user role
  const getAvailableLeagues = (): League[] => {
    if (!user || !leagues) return [];
    
    // Filter out hidden leagues
    const visibleLeagues = leagues.filter((l) => !l.isHidden);
    
    // SuperAdmin and Viewer can access all visible leagues
    if (user.role === "superAdmin" || user.role === "viewer") {
      return visibleLeagues.map((l) => l.league);
    }
    
    // Employees can only access their assigned leagues (that are visible)
    if (user.role === "employee" && user.leagues) {
      return visibleLeagues
        .filter((l) => user.leagues?.includes(l.league))
        .map((l) => l.league);
    }
    
    return [];
  };

  // Validate if selected league is still available and visible
  const isValidSelectedLeague = (league: League): boolean => {
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

  // Load selected league from localStorage on mount
  useEffect(() => {
    if (!user || !leagues) return;
    
    const availableLeagues = getAvailableLeagues();
    const savedLeague = localStorage.getItem("selectedLeague") as League;
    
    // Validate the saved league
    if (savedLeague && isValidSelectedLeague(savedLeague)) {
      setSelectedLeague(savedLeague);
    } else {
      // Clear invalid league from localStorage
      if (savedLeague) {
        localStorage.removeItem("selectedLeague");
        setSelectedLeague(null);
      }
      
      if (availableLeagues.length > 0) {
        // Select the first available league
        setSelectedLeague(availableLeagues[0]);
        localStorage.setItem("selectedLeague", availableLeagues[0]);
      } else {
        // No leagues available, show dialog with message
        setSelectedLeague(null);
        setIsLeagueDialogOpen(true);
      }
    }
  }, [user, leagues]);

  const handleLeagueSelect = (league: string) => {
    const availableLeagues = getAvailableLeagues();
    // Only allow selecting from available leagues
    if (availableLeagues.includes(league)) {
      setSelectedLeague(league);
      localStorage.setItem("selectedLeague", league);
      setIsLeagueDialogOpen(false);
    }
  };

  const getLeagueName = (league: League): string => {
    if (!league) return "No League Selected";
    const leagueInfo = leagues.find((l) => l.league === league);
    return leagueInfo?.knownName || leagueInfo?.name || leagueInfo?.arabicName || league;
  };

  const getLeagueIcon = (league: League): string => {
    if (!league) return "";
    const leagueInfo = leagues.find((l) => l.league === league);
    if (leagueInfo?.iconUrl) {
      // Use iconUrl from database, prepend API URL if it's a relative path
      if (leagueInfo.iconUrl.startsWith("/")) {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
        return API_URL.replace("/api", "") + leagueInfo.iconUrl;
      }
      return leagueInfo.iconUrl;
    }
    return "";
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

  // Handle navigation with league check
  const handleNavigate = (path: string) => {
    if (!canNavigate()) {
      const availableLeagues = getAvailableLeagues();
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
      setIsLeagueDialogOpen(true);
      return;
    }
    navigate(path);
  };

  return (
    <>
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl space-y-6">
          {/* Welcome Header */}
          <div className="text-center space-y-2 sm:space-y-3 px-2 sm:px-0">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold break-words">
              Hey {user?.username || "User"} 👋
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground px-2 sm:px-0">
              Ready to monitor and manage your matches? Let's get started!
            </p>
          </div>

          {/* Main Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* View Matches */}
            <Card
              className="p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer touch-manipulation active:scale-[0.98]"
              onClick={() => handleNavigate("/matches")}>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg truncate">View Matches</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                    Browse and manage all matches
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
              </div>
            </Card>

            {/* View Dashboard */}
            <Card
              className="p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer touch-manipulation active:scale-[0.98]"
              onClick={() => handleNavigate("/dashboard")}>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg truncate">View Dashboard</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                    View analytics and insights
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center px-2 sm:px-0">
            <Button
              size="lg"
              onClick={() => setIsLeagueDialogOpen(true)}
              className="w-full sm:w-48 flex flex-col items-center gap-1 h-auto py-3 sm:py-2.5 text-sm sm:text-base touch-manipulation">
              <div className="flex items-center">
                {selectedLeague && (
                  <img
                    src={getLeagueIcon(selectedLeague)}
                    alt={getLeagueName(selectedLeague)}
                    className="mr-2 h-4 w-4 sm:h-5 sm:w-5 object-contain"
                  />
                )}
                Change League
              </div>
              {selectedLeague && (
                <span className="text-xs sm:text-sm opacity-80 truncate max-w-full px-2">
                  {getLeagueName(selectedLeague)}
                </span>
              )}
            </Button>
            {user?.role === "superAdmin" && (
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/settings")}
                className="w-full sm:w-48 h-auto py-3 sm:py-2.5 border-2 text-sm sm:text-base touch-manipulation">
                <Settings className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Settings
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* League Selection Dialog */}
      <Dialog
        open={isLeagueDialogOpen}
        onOpenChange={(open) => {
          // Only allow closing if a league is already selected
          if (selectedLeague) {
            setIsLeagueDialogOpen(open);
          }
        }}>
        <DialogContent className="w-[95vw] max-w-md mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader className="px-1 sm:px-0">
            <DialogTitle className="text-xl sm:text-2xl text-center">
              Select League
            </DialogTitle>
            <DialogDescription className="text-center text-sm sm:text-base">
              Choose a league to view matches
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 sm:space-y-3 py-2 sm:py-4 px-1 sm:px-0">
            {(() => {
              const availableLeagues = getAvailableLeagues();
              const availableLeagueInfos = leagues.filter((l) => 
                !l.isHidden && availableLeagues.includes(l.league)
              );

              if (availableLeagueInfos.length === 0) {
                return (
                  <div className="text-center py-4 sm:py-6 text-muted-foreground px-2">
                    <p className="text-sm sm:text-base">No leagues available. Please contact an administrator.</p>
                  </div>
                );
              }
              return (
                <>
                  {availableLeagueInfos.map((leagueInfo) => {
                    const icon = getLeagueIcon(leagueInfo.league);
                    return (
                      <Button
                        key={leagueInfo.league}
                        variant="outline"
                        className="w-full h-auto p-4 sm:p-6 flex items-center gap-3 hover:bg-accent transition-colors touch-manipulation min-h-[64px] sm:min-h-[80px]"
                        onClick={() => handleLeagueSelect(leagueInfo.league)}>
                        {icon && (
                          <img
                            src={icon}
                            alt={leagueInfo.name}
                            className="h-7 w-7 sm:h-8 sm:w-8 object-contain flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-semibold text-base sm:text-lg truncate">
                            {leagueInfo.knownName || leagueInfo.name}
                          </div>
                          {leagueInfo.arabicName && (
                            <div className="text-xs sm:text-sm text-muted-foreground truncate">
                              {leagueInfo.arabicName}
                            </div>
                          )}
                        </div>
                      </Button>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
