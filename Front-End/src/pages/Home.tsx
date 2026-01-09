import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
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
import {
  Settings,
  Calendar,
  ArrowRight,
  ArrowLeft,
  BarChart3,
} from "lucide-react";
import { useState, useEffect } from "react";

type League = string | null;

export default function Home() {
  const { user, leagues, fetchLeagues, loadingLeagues } = useAuth();
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [selectedLeague, setSelectedLeague] = useState<League>(null);
  const [isLeagueDialogOpen, setIsLeagueDialogOpen] = useState(false);

  // Refetch leagues when component mounts (only once, AuthContext already handles user changes)
  // Removed duplicate fetchLeagues call - AuthContext already fetches when user changes
  // This was causing duplicate fetches

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

  // Load selected league from localStorage on mount and validate it
  useEffect(() => {
    // Wait until leagues are loaded before validating
    if (!user || loadingLeagues) {
      return;
    }

    // If leagues array is empty after loading, something went wrong - but don't redirect yet
    if (leagues.length === 0) {
      return;
    }

    // Get available leagues based on user role
    const visibleLeagues = leagues.filter((l) => !l.isHidden);
    let availableLeagues: League[] = [];
    if (user.role === "superAdmin" || user.role === "viewer") {
      availableLeagues = visibleLeagues.map((l) => l.league);
    } else if (user.role === "employee" && user.leagues) {
      availableLeagues = visibleLeagues
        .filter((l) => user.leagues?.includes(l.league))
        .map((l) => l.league);
    }

    const savedLeague = localStorage.getItem("selectedLeague") as League;

    // If there's a saved league, validate it
    if (savedLeague) {
      const leagueInfo = leagues.find((l) => l.league === savedLeague);

      // For employees: only check if league is in their assigned leagues
      if (user.role === "employee") {
        const isInAssignedLeagues =
          user.leagues && user.leagues.includes(savedLeague);
        const isVisible = leagueInfo && !leagueInfo.isHidden;

        if (isInAssignedLeagues && isVisible) {
          // Valid league for employee - use it, don't show modal
          setSelectedLeague(savedLeague);
        } else {
          // League not in employee's assigned leagues - force selection
          setSelectedLeague(null);
          setIsLeagueDialogOpen(true);
        }
      } else {
        // For superAdmin/viewer: use saved league without validation
        setSelectedLeague(savedLeague);
      }
    } else if (availableLeagues.length > 0) {
      // No saved league - auto-select first available
      setSelectedLeague(availableLeagues[0]);
      localStorage.setItem("selectedLeague", availableLeagues[0]);
    } else {
      // No available leagues
      setSelectedLeague(null);
      setIsLeagueDialogOpen(true);
    }
    // Only run validation when user role, leagues finish loading, or leagues array changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user?.id, loadingLeagues, leagues?.length]);

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
    if (!league) return t("home.noLeagueSelected");
    const leagueInfo = leagues.find((l) => l.league === league);
    return (
      leagueInfo?.knownName ||
      leagueInfo?.name ||
      leagueInfo?.arabicName ||
      league
    );
  };

  const getLeagueIcon = (league: League): string => {
    if (!league) return "";
    const leagueInfo = leagues.find((l) => l.league === league);
    if (leagueInfo?.iconUrl) {
      // Use iconUrl from database, prepend API URL if it's a relative path
      if (leagueInfo.iconUrl.startsWith("/")) {
        const API_URL =
          import.meta.env.VITE_API_URL || "http://localhost:5000/api";
        return API_URL.replace("/api", "") + leagueInfo.iconUrl;
      }
      return leagueInfo.iconUrl;
    }
    return "";
  };

  return (
    <>
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl space-y-6">
          {/* Welcome Header */}
          <div className="text-center space-y-2 sm:space-y-3 px-2 sm:px-0">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold break-words">
              {user?.username
                ? t("home.welcome", { username: user.username })
                : t("home.welcomeFallback")}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground px-2 sm:px-0">
              {t("home.subtitle")}
            </p>
          </div>

          {/* Main Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* View Matches */}
            <Card
              className="p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer touch-manipulation active:scale-[0.98]"
              onClick={() => navigate("/matches")}>
              <div
                className={`flex items-center gap-3 sm:gap-4 ${
                  isRTL ? "justify-end" : "justify-start"
                }`}>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <h3 className="font-semibold text-base sm:text-lg truncate">
                    {t("home.viewMatches.title")}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                    {t("home.viewMatches.description")}
                  </p>
                </div>
                {isRTL ? (
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            </Card>

            {/* View Dashboard */}
            <Card
              className="p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer touch-manipulation active:scale-[0.98]"
              onClick={() => navigate("/dashboard")}>
              <div
                className={`flex items-center gap-3 sm:gap-4 ${
                  isRTL ? "justify-end" : "justify-start"
                }`}>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <h3 className="font-semibold text-base sm:text-lg truncate">
                    {t("home.viewDashboard.title")}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                    {t("home.viewDashboard.description")}
                  </p>
                </div>
                {isRTL ? (
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center px-2 sm:px-0">
            <Button
              size="lg"
              onClick={() => setIsLeagueDialogOpen(true)}
              className="w-full sm:w-48 flex flex-col items-center gap-1 h-auto py-3 sm:py-2.5 text-sm sm:text-base touch-manipulation">
              <div
                className={`flex items-center ${
                  isRTL ? "justify-end" : "justify-start"
                }`}>
                {selectedLeague && (
                  <img
                    src={getLeagueIcon(selectedLeague)}
                    alt={getLeagueName(selectedLeague)}
                    className={`${
                      isRTL ? "ml-2" : "mr-2"
                    } h-4 w-4 sm:h-5 sm:w-5 object-contain`}
                  />
                )}
                <span>{t("home.changeLeague")}</span>
              </div>
              {selectedLeague && (
                <span
                  className={`text-xs sm:text-sm opacity-80 whitespace-nowrap px-2 ${
                    isRTL ? "text-center" : "text-left"
                  }`}>
                  {getLeagueName(selectedLeague)}
                </span>
              )}
            </Button>
            {user?.role === "superAdmin" && (
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/settings")}
                className="w-full sm:w-48 h-auto py-3 sm:py-2.5 border-2 text-sm sm:text-base touch-manipulation flex items-center justify-start">
                <Settings className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                <span>{t("home.settings")}</span>
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
        <DialogContent className="w-[95vw] max-w-md mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto flex flex-col">
          <DialogHeader className="px-1 sm:px-0 flex-shrink-0">
            <DialogTitle className="text-xl sm:text-2xl text-center">
              {t("home.selectLeague.title")}
            </DialogTitle>
            <DialogDescription className="text-center text-sm sm:text-base">
              {t("home.selectLeague.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 sm:space-y-3 py-2 sm:py-4 px-1 sm:px-0 flex-1 overflow-y-auto">
            {(() => {
              const availableLeagues = getAvailableLeagues();
              const availableLeagueInfos = leagues.filter(
                (l) => !l.isHidden && availableLeagues.includes(l.league)
              );

              if (availableLeagueInfos.length === 0) {
                return (
                  <div className="text-center py-4 sm:py-6 text-muted-foreground px-2">
                    <p className="text-sm sm:text-base">
                      {t("home.selectLeague.noLeagues")}
                    </p>
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
                        className={`w-full h-auto p-4 sm:p-6 flex items-center gap-3 hover:bg-accent transition-colors touch-manipulation min-h-[64px] sm:min-h-[80px] ${
                          isRTL ? "justify-end" : "justify-start"
                        }`}
                        onClick={() => handleLeagueSelect(leagueInfo.league)}>
                        {icon && (
                          <img
                            src={icon}
                            alt={leagueInfo.name}
                            className="h-7 w-7 sm:h-8 sm:w-8 object-contain flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0 text-left">
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
