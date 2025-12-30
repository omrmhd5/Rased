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
import {
  Settings,
  Trophy,
  Calendar,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { useState, useEffect } from "react";

type League = "saudi" | "italian" | "spanish" | null;

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedLeague, setSelectedLeague] = useState<League>(null);
  const [isLeagueDialogOpen, setIsLeagueDialogOpen] = useState(false);

  // Load selected league from localStorage on mount
  useEffect(() => {
    const savedLeague = localStorage.getItem("selectedLeague") as League;
    if (savedLeague && ["saudi", "italian", "spanish"].includes(savedLeague)) {
      setSelectedLeague(savedLeague);
    } else {
      // If no league is selected, show the dialog
      setIsLeagueDialogOpen(true);
    }
  }, []);

  const handleLeagueSelect = (league: "saudi" | "italian" | "spanish") => {
    setSelectedLeague(league);
    localStorage.setItem("selectedLeague", league);
    setIsLeagueDialogOpen(false);
  };

  const getLeagueName = (league: League): string => {
    switch (league) {
      case "saudi":
        return "Saudi Pro League";
      case "italian":
        return "Italian Serie A";
      case "spanish":
        return "Spanish La Liga";
      default:
        return "No League Selected";
    }
  };

  return (
    <>
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl space-y-6">
          {/* Welcome Header */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl sm:text-5xl font-bold">
              Hey {user?.username || "User"} 👋
            </h1>
            <p className="text-lg text-muted-foreground">
              Ready to monitor and manage your matches? Let's get started!
            </p>
          </div>

          {/* Main Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* View Matches */}
            <Card
              className="p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate("/matches")}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">View Matches</h3>
                  <p className="text-sm text-muted-foreground">
                    Browse and manage all matches
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>

            {/* View Dashboard */}
            <Card
              className="p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate("/dashboard")}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">View Dashboard</h3>
                  <p className="text-sm text-muted-foreground">
                    View analytics and insights
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              onClick={() => setIsLeagueDialogOpen(true)}
              className="w-full sm:w-48 flex flex-col items-center gap-1 h-auto py-3">
              <div className="flex items-center">
                <Trophy className="mr-2 h-4 w-4" />
                Change League
              </div>
              {selectedLeague && (
                <span className="text-xs opacity-80">
                  {getLeagueName(selectedLeague)}
                </span>
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/settings")}
              className="w-full sm:w-48 h-auto py-3 border-2">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">
              Select League
            </DialogTitle>
            <DialogDescription className="text-center">
              Choose a league to view matches
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button
              variant="outline"
              className="w-full h-auto p-6 flex flex-col items-start gap-3 hover:bg-accent transition-colors"
              onClick={() => handleLeagueSelect("saudi")}>
              <div className="flex items-center gap-3 w-full">
                <Trophy className="h-6 w-6 text-chart-1" />
                <div className="flex-1 text-left">
                  <div className="font-semibold text-lg">Saudi Pro League</div>
                  <div className="text-sm text-muted-foreground">
                    Saudi Arabia
                  </div>
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full h-auto p-6 flex flex-col items-start gap-3 hover:bg-accent transition-colors"
              onClick={() => handleLeagueSelect("italian")}>
              <div className="flex items-center gap-3 w-full">
                <Trophy className="h-6 w-6 text-chart-2" />
                <div className="flex-1 text-left">
                  <div className="font-semibold text-lg">Italian Serie A</div>
                  <div className="text-sm text-muted-foreground">Italy</div>
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full h-auto p-6 flex flex-col items-start gap-3 hover:bg-accent transition-colors"
              onClick={() => handleLeagueSelect("spanish")}>
              <div className="flex items-center gap-3 w-full">
                <Trophy className="h-6 w-6 text-chart-3" />
                <div className="flex-1 text-left">
                  <div className="font-semibold text-lg">Spanish La Liga</div>
                  <div className="text-sm text-muted-foreground">Spain</div>
                </div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
