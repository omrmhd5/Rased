import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  MapPin,
  TrendingUp,
  Eye,
  Shield,
  AlertTriangle,
  Clock,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

type League = "saudi" | "italian" | "spanish" | null;

const leagueNames = {
  saudi: "Saudi Pro League",
  italian: "Italian Serie A",
  spanish: "Spanish La Liga",
};

interface Competition {
  _id?: string;
  externalId: string;
  name: string;
  knownName?: string;
  competitionCode?: string;
  competitionFormat?: string;
  league: "saudi" | "italian" | "spanish";
  country?: {
    id?: string;
    name?: string;
  };
}

interface Match {
  _id?: string; // MongoDB _id (still present but not primary identifier)
  externalMatchId: string; // Primary identifier
  description: string;
  team1: string;
  team2: string;
  date: string;
  time: string;
  week: string;
  competition?: Competition | string; // Can be populated object or string
  stadium?: string;
  status: "upcoming" | "live" | "finished" | "postponed";
  league: "saudi" | "italian" | "spanish";
  winner?: "home" | "away" | "draw" | null;
  scores?: {
    home: number;
    away: number;
  } | null;
  createdAt?: string;
  updatedAt?: string;
  originalData?: {
    matchId: string;
    competitionId: string;
    venueId: string;
  };
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const competitions = ["Saudi Pro League", "Italian Serie A", "Spanish La Liga"];

type MatchFilter = "all" | "live" | "upcoming" | "completed";

export default function Matches() {
  const navigate = useNavigate();
  const [selectedWeek, setSelectedWeek] = useState("12");
  const [selectedLeague, setSelectedLeague] = useState<League>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddMatchOpen, setIsAddMatchOpen] = useState(false);
  const [matchFilter, setMatchFilter] = useState<MatchFilter>("all");
  const [isEditMatchOpen, setIsEditMatchOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // Form state for adding match
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formWeek, setFormWeek] = useState("");
  const [formCompetition, setFormCompetition] = useState("");
  const [formTeam1, setFormTeam1] = useState("");
  const [formTeam2, setFormTeam2] = useState("");
  const [formVenue, setFormVenue] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<
    "upcoming" | "live" | "finished" | "postponed"
  >("upcoming");
  const [formWinner, setFormWinner] = useState<"home" | "away" | "draw" | "">(
    ""
  );
  const [formScoreHome, setFormScoreHome] = useState("");
  const [formScoreAway, setFormScoreAway] = useState("");

  // Load selected league and week from localStorage on mount
  useEffect(() => {
    const savedLeague = localStorage.getItem("selectedLeague") as League;
    if (savedLeague && ["saudi", "italian", "spanish"].includes(savedLeague)) {
      setSelectedLeague(savedLeague);
    } else {
      // If no league is selected, redirect to home
      navigate("/");
    }

    const savedWeek = localStorage.getItem("selectedWeek");
    if (savedWeek) {
      setSelectedWeek(savedWeek);
    }
  }, [navigate]);

  // Save selected week to localStorage whenever it changes
  useEffect(() => {
    if (selectedWeek) {
      localStorage.setItem("selectedWeek", selectedWeek);
    }
  }, [selectedWeek]);

  // Fetch matches from database
  const fetchMatchesFromDB = useCallback(async () => {
    if (!selectedLeague) return;

    setLoading(true);
    try {
      // Fetch matches directly from database
      const response = await fetch(
        `${API_URL}/matches?league=${selectedLeague}&week=${selectedWeek}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to load matches: ${response.status}`
        );
      }

      const data = await response.json();

      // Data is already formatted from database, but ensure dates are strings and handle competition
      const formattedMatches = data.map((match: Match) => {
        // Handle competition - it might be a populated object or just an ID
        const competitionName =
          typeof match.competition === "object" && match.competition !== null
            ? (match.competition as Competition).name
            : typeof match.competition === "string"
            ? match.competition
            : "";

        return {
          ...match,
          date: match.date
            ? typeof match.date === "string"
              ? match.date
              : new Date(match.date).toISOString().split("T")[0]
            : "",
          competition: competitionName, // Keep as string for display
        };
      });

      // Set the matches to display (all from database)
      setMatches(formattedMatches);
    } catch (error) {
      console.error("Error fetching matches from DB:", error);
      toast({
        title: "Error",
        description: "Failed to load matches",
        variant: "destructive",
      });
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [selectedLeague, selectedWeek]);

  // Sync matches from external API in the background (don't wait for it)
  const syncMatchesFromAPI = useCallback(async () => {
    if (!selectedLeague) return;

    try {
      // Trigger API sync - don't wait for it, don't show loading
      const response = await fetch(
        `${API_URL}/matches/external?league=${selectedLeague}&week=${selectedWeek}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        // Sync completed successfully, refresh from DB
        const refreshResponse = await fetch(
          `${API_URL}/matches?league=${selectedLeague}&week=${selectedWeek}`,
          {
            credentials: "include",
          }
        );

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          const formattedMatches = data.map((match: Match) => {
            const competitionName =
              typeof match.competition === "object" &&
              match.competition !== null
                ? (match.competition as Competition).name
                : typeof match.competition === "string"
                ? match.competition
                : "";

            return {
              ...match,
              date: match.date
                ? typeof match.date === "string"
                  ? match.date
                  : new Date(match.date).toISOString().split("T")[0]
                : "",
              competition: competitionName,
            };
          });
          setMatches(formattedMatches);
        }
      }
    } catch (error) {
      // Silently fail - API sync errors shouldn't affect UI
      console.error("Error syncing matches from API:", error);
    }
  }, [selectedLeague, selectedWeek]);

  // Fetch matches from DB when league/week changes
  useEffect(() => {
    if (selectedLeague) {
      // First, fetch from DB immediately (shows loading)
      fetchMatchesFromDB().then(() => {
        // After DB fetch completes, trigger API sync in background (doesn't block UI)
        // This runs asynchronously and updates the UI when new data arrives
        syncMatchesFromAPI();
      });
    }
  }, [selectedLeague, selectedWeek, fetchMatchesFromDB, syncMatchesFromAPI]);

  const resetForm = () => {
    setFormDescription("");
    setFormDate("");
    setFormTime("");
    setFormWeek("");
    setFormCompetition("");
    setFormTeam1("");
    setFormTeam2("");
    setFormVenue("");
    setFormStatus("upcoming");
    setFormWinner("");
    setFormScoreHome("");
    setFormScoreAway("");
    setSelectedMatch(null);
  };

  const convertTimeTo24Hour = (timeStr: string): string => {
    if (!timeStr) return "";
    // Check if it's already in 24-hour format (HH:MM or HH:MM:SS)
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeStr) && !timeStr.includes("AM") && !timeStr.includes("PM")) {
      // Already 24-hour format, just return HH:MM
      return timeStr.split(":").slice(0, 2).join(":");
    }
    // Parse 12-hour format (e.g., "2:50 PM")
    const pmMatch = timeStr.match(/(\d+):(\d+)\s*(PM|AM)/i);
    if (pmMatch) {
      let hours = parseInt(pmMatch[1]);
      const minutes = pmMatch[2];
      const isPM = pmMatch[3].toUpperCase() === "PM";
      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
      return `${hours.toString().padStart(2, "0")}:${minutes}`;
    }
    return "";
  };

  const convertTimeTo12Hour = (timeStr: string): string => {
    if (!timeStr) return "";
    // Check if it's already in 12-hour format
    if (timeStr.includes("AM") || timeStr.includes("PM")) {
      return timeStr;
    }
    // Parse 24-hour format (HH:MM or HH:MM:SS)
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(:\d{2})?/);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2];
      const period = hours >= 12 ? "PM" : "AM";
      const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${hours12}:${minutes} ${period}`;
    }
    return "";
  };

  const handleEditMatch = (match: Match) => {
    setSelectedMatch(match);
    // Populate form with match data
    setFormDate(match.date || "");
    setFormTime(convertTimeTo24Hour(match.time || ""));
    setFormWeek(match.week || "");
    
    // Map database competition names to frontend dropdown values
    const competitionName =
      typeof match.competition === "string"
        ? match.competition
        : (match.competition as Competition)?.name || "";
    
    // Map database names to frontend dropdown values
    const competitionMap: Record<string, string> = {
      "Saudi League": "Saudi Pro League",
      "Italian Serie A": "Italian Serie A",
      "Spanish La Liga": "Spanish La Liga",
    };
    
    const mappedCompetition = competitionMap[competitionName] || competitionName;
    setFormCompetition(mappedCompetition);
    
    setFormTeam1(match.team1 || "");
    setFormTeam2(match.team2 || "");
    setFormVenue(match.stadium || "");
    setFormDescription(match.description || "");
    setFormStatus(match.status);
    setFormWinner(match.winner || "");
    setFormScoreHome(match.scores?.home?.toString() || "");
    setFormScoreAway(match.scores?.away?.toString() || "");
    setIsEditMatchOpen(true);
  };

  const handleUpdateMatch = async () => {
    if (!selectedMatch || !formDate || !formTime || !formTeam1 || !formTeam2 || !formWeek) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const updateData = {
            description: formDescription || undefined,
            team1: formTeam1,
            team2: formTeam2,
            date: formDate,
            time: convertTimeTo12Hour(formTime),
            week: formWeek,
            competition: formCompetition || undefined,
            stadium: formVenue || undefined,
            league: formCompetition
              ? formCompetition === "Saudi Pro League"
                ? "saudi"
                : formCompetition === "Italian Serie A"
                ? "italian"
                : formCompetition === "Spanish La Liga"
                ? "spanish"
                : selectedLeague
              : selectedLeague,
            status: formStatus,
            winner:
              formStatus === "finished" && formWinner ? formWinner : undefined,
            scores:
              formStatus === "finished" &&
              formScoreHome !== "" &&
              formScoreAway !== ""
                ? {
                    home: Number(formScoreHome),
                    away: Number(formScoreAway),
                  }
                : undefined,
      };

      const response = await fetch(
        `${API_URL}/matches/${selectedMatch.externalMatchId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update match");
      }

      const updatedMatch = await response.json();
      // Format date to string if it's a Date object
      const formattedMatch: Match = {
        ...updatedMatch,
        date:
          typeof updatedMatch.date === "string"
            ? updatedMatch.date
            : new Date(updatedMatch.date).toISOString().split("T")[0],
      };

      // Update the match in the list
      setMatches(
        matches.map((m) =>
          m.externalMatchId === selectedMatch.externalMatchId
            ? formattedMatch
            : m
        )
      );

      toast({
        title: "Success",
        description: "Match updated successfully",
      });

      // Reset form and close dialog
      resetForm();
      setIsEditMatchOpen(false);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update match";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDeleteMatch = (match: Match) => {
    setSelectedMatch(match);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteMatch = async () => {
    if (!selectedMatch) return;

    try {
      const response = await fetch(
        `${API_URL}/matches/${selectedMatch.externalMatchId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete match");
      }

      // Remove match from list
      setMatches(
        matches.filter((m) => m.externalMatchId !== selectedMatch.externalMatchId)
      );

      toast({
        title: "Success",
        description: "Match deleted successfully",
      });

      setSelectedMatch(null);
      setIsDeleteDialogOpen(false);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete match";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleAddMatch = async () => {
    if (!formDate || !formTime || !formTeam1 || !formTeam2 || !formWeek) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!selectedLeague) {
      toast({
        title: "Error",
        description: "Please select a league first",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/matches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          description: formDescription || undefined,
          team1: formTeam1,
          team2: formTeam2,
          date: formDate,
          time: convertTimeTo12Hour(formTime),
          week: formWeek,
          competition: formCompetition || undefined,
          stadium: formVenue || undefined,
          league: formCompetition
            ? formCompetition === "Saudi Pro League"
              ? "saudi"
              : formCompetition === "Italian Serie A"
              ? "italian"
              : formCompetition === "Spanish La Liga"
              ? "spanish"
              : selectedLeague
            : selectedLeague,
          status: formStatus,
          winner:
            formStatus === "finished" && formWinner ? formWinner : undefined,
          scores:
            formStatus === "finished" &&
            formScoreHome !== "" &&
            formScoreAway !== ""
              ? {
                  home: Number(formScoreHome),
                  away: Number(formScoreAway),
                }
              : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create match");
      }

      const newMatch = await response.json();
      // Format date to string if it's a Date object
      // Handle competition - ensure it's a string
      const competitionName =
        typeof newMatch.competition === "object" && newMatch.competition !== null
          ? (newMatch.competition as Competition).name
          : typeof newMatch.competition === "string"
          ? newMatch.competition
          : "";

      const formattedMatch: Match = {
        ...newMatch,
        date:
          typeof newMatch.date === "string"
            ? newMatch.date
            : new Date(newMatch.date).toISOString().split("T")[0],
        competition: competitionName,
      };
      setMatches([...matches, formattedMatch]);
      toast({
        title: "Success",
        description: "Match added successfully",
      });

      // Reset form
      resetForm();
      setIsAddMatchOpen(false);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to add match";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Filter matches based on selected filter
  const filteredMatches = matches.filter((m) => {
    if (matchFilter === "all") return true;
    if (matchFilter === "live") return m.status === "live";
    if (matchFilter === "upcoming")
      return m.status === "upcoming" || m.status === "postponed";
    if (matchFilter === "completed")
      return m.status === "finished" || m.status === "cancelled";
    return true;
  });

  // Group matches by day and sort days descending (most recent first)
  const matchesByDay = filteredMatches.reduce((acc, match) => {
    const matchDate = new Date(match.date);
    const dateKey = matchDate.toISOString().split("T")[0]; // YYYY-MM-DD format

    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(match);
    return acc;
  }, {} as Record<string, typeof filteredMatches>);

  // Sort matches within each day by time (reversed - latest time first)
  Object.keys(matchesByDay).forEach((dayKey) => {
    matchesByDay[dayKey].sort((a, b) => {
      // Parse time strings (format: "2:50 PM" or "14:50:00")
      const parseTime = (timeStr: string) => {
        if (!timeStr) return 0;
        // Handle 12-hour format (e.g., "2:50 PM")
        const pmMatch = timeStr.match(/(\d+):(\d+)\s*(PM|AM)/i);
        if (pmMatch) {
          let hours = parseInt(pmMatch[1]);
          const minutes = parseInt(pmMatch[2]);
          const isPM = pmMatch[3].toUpperCase() === "PM";
          if (isPM && hours !== 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;
          return hours * 60 + minutes;
        }
        // Handle 24-hour format (e.g., "14:50:00" or "14:50")
        const timeMatch = timeStr.match(/(\d+):(\d+)/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          return hours * 60 + minutes;
        }
        return 0;
      };

      const timeA = parseTime(a.time);
      const timeB = parseTime(b.time);
      // Earliest time first
      return timeA - timeB;
    });
  });

  // Sort days in ascending order (oldest first)
  const sortedDays = Object.keys(matchesByDay).sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });

  // Format date for display
  const formatDayHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };


  const getCountdownText = (dateStr: string | Date, timeStr: string) => {
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    const dateOnly = date.toISOString().split("T")[0];

    // Parse time string to handle 12-hour format
    let time24Hour = timeStr;
    if (timeStr.match(/(\d+):(\d+)\s*(PM|AM)/i)) {
      const pmMatch = timeStr.match(/(\d+):(\d+)\s*(PM|AM)/i);
      if (pmMatch) {
        let hours = parseInt(pmMatch[1]);
        const minutes = pmMatch[2];
        const isPM = pmMatch[3].toUpperCase() === "PM";
        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        time24Hour = `${hours.toString().padStart(2, "0")}:${minutes}`;
      }
    }

    const matchDate = new Date(`${dateOnly}T${time24Hour}`);
    const now = new Date();
    const diff = matchDate.getTime() - now.getTime();
    const totalMinutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    // Only show countdown if within 1 hour (60 minutes) and in the future
    if (totalMinutes > 0 && totalMinutes <= 60) {
      if (hours > 0) {
        return { type: "countdown", text: `${hours}h ${minutes}m` };
      }
      return { type: "countdown", text: `${minutes}m` };
    }

    return null;
  };

  const MatchCard = ({ match }: { match: Match }) => {
    const matchDate = new Date(match.date);
    const dateStr = matchDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const countdown =
      match.status === "upcoming"
        ? getCountdownText(match.date, match.time)
        : null;
    
    return (
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                className={
                  match.status === "live"
                    ? "bg-red-500 text-white"
                    : match.status === "upcoming"
                    ? "bg-blue-500 text-white"
                    : match.status === "finished"
                    ? "bg-green-500 text-white"
                    : match.status === "postponed"
                    ? "bg-yellow-500 text-white"
                    : ""
                }
                variant={
                  match.status === "live" ||
                  match.status === "upcoming" ||
                  match.status === "finished" ||
                  match.status === "postponed"
                    ? "default"
                    : "outline"
              }>
                {match.status === "live" && "● LIVE"}
                {match.status === "upcoming" && "Upcoming"}
                {match.status === "postponed" && "Postponed"}
                {(match.status === "finished" ||
                  match.status === "cancelled") &&
                  "Completed"}
              </Badge>
              <Badge variant="outline">Week {match.week}</Badge>
                  {countdown && countdown.type === "countdown" && (
                    <Badge
                      variant="outline"
                      className="bg-chart-1/10 text-chart-1 animate-pulse">
                  <Clock className="h-3 w-3 mr-1" />
                      Starts in {countdown.text}
                </Badge>
              )}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEditMatch(match)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDeleteMatch(match)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <h3 className="text-xl font-bold mb-2">
              {match.team1} vs {match.team2}
            </h3>
            {match.scores && (
              <div className="text-2xl font-bold mb-2">
                {match.scores.home} - {match.scores.away}
              </div>
            )}
            {match.winner && match.winner !== "draw" && (
              <div className="text-sm text-muted-foreground mb-2">
                Winner:{" "}
                <span className="font-semibold">
                  {match.winner === "home" ? match.team1 : match.team2}
                </span>
              </div>
            )}
            {match.winner === "draw" && (
              <div className="text-sm text-muted-foreground font-semibold mb-2">
                Draw
              </div>
            )}
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {dateStr} • {match.time}
                </span>
              </div>
              {match.stadium && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                  <span>{match.stadium}</span>
                </div>
              )}
              {match.competition && (
                <div className="text-xs text-muted-foreground/70">
                  {typeof match.competition === "string"
                    ? match.competition
                    : (match.competition as Competition).name}
              </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate(`/match/${match.externalMatchId}`)}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Match Dashboard
          </Button>
        </div>
      </Card>
    );
  };

  // If no league is selected, don't render the matches page
  if (!selectedLeague) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">Matches</h1>
            <Badge variant="secondary" className="text-sm">
              {leagueNames[selectedLeague!]}
            </Badge>
            <Badge className="bg-blue-500 text-white text-sm">
              Week {selectedWeek}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setIsAddMatchOpen(true);
            }}
            className="gap-2">
            <Plus className="h-4 w-4" />
            Add Match Manually
          </Button>
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 38 }, (_, i) => i + 1).map((week) => (
                <SelectItem key={week} value={week.toString()}>
                  Week {week}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading matches...</p>
        </Card>
      )}

      {!loading && matches.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            No matches found for this league and week
          </p>
          <Button
            onClick={() => {
              resetForm();
              setIsAddMatchOpen(true);
            }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Match Manually
          </Button>
        </Card>
      )}

      {!loading && matches.length > 0 && (
        <div>
          {/* Filter Buttons */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <Button
              variant={matchFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setMatchFilter("all")}>
              All
            </Button>
            <Button
              variant={matchFilter === "live" ? "default" : "outline"}
              size="sm"
              onClick={() => setMatchFilter("live")}
              className={
                matchFilter === "live"
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : ""
              }>
              Live
            </Button>
            <Button
              variant={matchFilter === "upcoming" ? "default" : "outline"}
              size="sm"
              onClick={() => setMatchFilter("upcoming")}
              className={
                matchFilter === "upcoming"
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : ""
              }>
              Upcoming
            </Button>
            <Button
              variant={matchFilter === "completed" ? "default" : "outline"}
              size="sm"
              onClick={() => setMatchFilter("completed")}
              className={
                matchFilter === "completed"
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : ""
              }>
              Completed
            </Button>
          </div>

          {/* Filtered Matches Grouped by Day */}
          {filteredMatches.length > 0 ? (
            <div className="space-y-8">
              {sortedDays.map((dayKey) => (
                <div key={dayKey} className="space-y-4">
                  <h2 className="text-xl font-semibold text-foreground border-b pb-2">
                    {formatDayHeader(dayKey)}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {matchesByDay[dayKey].map((match) => (
                      <MatchCard key={match.externalMatchId} match={match} />
                    ))}
                  </div>
                </div>
            ))}
          </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                No matches found for the selected filter
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Add Match Dialog */}
      <Dialog
        open={isAddMatchOpen}
        onOpenChange={(open) => {
          setIsAddMatchOpen(open);
          if (!open) {
            resetForm();
          }
        }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Match Manually</DialogTitle>
            <DialogDescription>
              Create a new match for {leagueNames[selectedLeague!]}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Competition */}
            <div className="space-y-2">
              <Label htmlFor="competition">Competition</Label>
              <Select
                value={formCompetition}
                onValueChange={setFormCompetition}>
                <SelectTrigger id="competition">
                  <SelectValue placeholder="Select competition" />
                </SelectTrigger>
                <SelectContent>
                  {competitions.map((comp) => (
                    <SelectItem key={comp} value={comp}>
                      {comp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team 1 Name */}
            <div className="space-y-2">
              <Label htmlFor="team1">Team 1 Name *</Label>
              <Input
                id="team1"
                type="text"
                placeholder="e.g., Al Hilal"
                value={formTeam1}
                onChange={(e) => setFormTeam1(e.target.value)}
                required
              />
            </div>

            {/* Team 2 Name */}
            <div className="space-y-2">
              <Label htmlFor="team2">Team 2 Name *</Label>
              <Input
                id="team2"
                type="text"
                placeholder="e.g., Al Nassr"
                value={formTeam2}
                onChange={(e) => setFormTeam2(e.target.value)}
                required
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formStatus}
                onValueChange={(value) =>
                  setFormStatus(
                    value as
                      | "upcoming"
                      | "live"
                      | "finished"
                      | "postponed"
                  )
                }>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="finished">Completed</SelectItem>
                  <SelectItem value="postponed">Postponed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status-dependent fields (Winner and Scores) */}
            {formStatus === "finished" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="winner">Winner *</Label>
                  <Select
                    value={formWinner}
                    onValueChange={(value) =>
                      setFormWinner(value as "home" | "away" | "draw" | "")
                    }>
                    <SelectTrigger id="winner">
                      <SelectValue placeholder="Select winner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">
                        {formTeam1 || "Team 1"}
                      </SelectItem>
                      <SelectItem value="away">
                        {formTeam2 || "Team 2"}
                      </SelectItem>
                      <SelectItem value="draw">Draw</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scoreHome">Team 1 Score *</Label>
                    <Input
                      id="scoreHome"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formScoreHome}
                      onChange={(e) => setFormScoreHome(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scoreAway">Team 2 Score *</Label>
                    <Input
                      id="scoreAway"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formScoreAway}
                      onChange={(e) => setFormScoreAway(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Week */}
            <div className="space-y-2">
              <Label htmlFor="week">Week *</Label>
              <Input
                id="week"
                type="text"
                placeholder="e.g., 12"
                value={formWeek}
                onChange={(e) => setFormWeek(e.target.value)}
                required
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  required
                />
        </div>
      </div>

            {/* Optional fields */}
            <div className="space-y-2">
              <Label htmlFor="venue">Venue (Optional)</Label>
              <Input
                id="venue"
                type="text"
                placeholder="e.g., King Fahd International Stadium"
                value={formVenue}
                onChange={(e) => setFormVenue(e.target.value)}
              />
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMatchOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMatch}>Add Match</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Match Dialog */}
      <Dialog
        open={isEditMatchOpen}
        onOpenChange={(open) => {
          setIsEditMatchOpen(open);
          if (!open) {
            resetForm();
          }
        }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Match</DialogTitle>
            <DialogDescription>
              Update match details for {leagueNames[selectedLeague!]}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Competition */}
            <div className="space-y-2">
              <Label htmlFor="edit-competition">Competition</Label>
              <Select
                value={formCompetition}
                onValueChange={setFormCompetition}>
                <SelectTrigger id="edit-competition">
                  <SelectValue placeholder="Select competition" />
                </SelectTrigger>
                <SelectContent>
                  {competitions.map((comp) => (
                    <SelectItem key={comp} value={comp}>
                      {comp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team 1 Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-team1">Team 1 Name *</Label>
              <Input
                id="edit-team1"
                type="text"
                placeholder="e.g., Al Hilal"
                value={formTeam1}
                onChange={(e) => setFormTeam1(e.target.value)}
                required
              />
            </div>

            {/* Team 2 Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-team2">Team 2 Name *</Label>
              <Input
                id="edit-team2"
                type="text"
                placeholder="e.g., Al Nassr"
                value={formTeam2}
                onChange={(e) => setFormTeam2(e.target.value)}
                required
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status *</Label>
              <Select
                value={formStatus}
                onValueChange={(value) =>
                  setFormStatus(
                    value as
                      | "upcoming"
                      | "live"
                      | "finished"
                      | "postponed"
                  )
                }>
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="finished">Completed</SelectItem>
                  <SelectItem value="postponed">Postponed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status-dependent fields (Winner and Scores) */}
            {formStatus === "finished" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-winner">Winner *</Label>
                  <Select
                    value={formWinner}
                    onValueChange={(value) =>
                      setFormWinner(value as "home" | "away" | "draw" | "")
                    }>
                    <SelectTrigger id="edit-winner">
                      <SelectValue placeholder="Select winner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">
                        {formTeam1 || "Team 1"}
                      </SelectItem>
                      <SelectItem value="away">
                        {formTeam2 || "Team 2"}
                      </SelectItem>
                      <SelectItem value="draw">Draw</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-scoreHome">Team 1 Score *</Label>
                    <Input
                      id="edit-scoreHome"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formScoreHome}
                      onChange={(e) => setFormScoreHome(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-scoreAway">Team 2 Score *</Label>
                    <Input
                      id="edit-scoreAway"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formScoreAway}
                      onChange={(e) => setFormScoreAway(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Week */}
            <div className="space-y-2">
              <Label htmlFor="edit-week">Week *</Label>
              <Input
                id="edit-week"
                type="text"
                placeholder="e.g., 12"
                value={formWeek}
                onChange={(e) => setFormWeek(e.target.value)}
                required
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Date *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-time">Time *</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Optional fields */}
            <div className="space-y-2">
              <Label htmlFor="edit-venue">Venue (Optional)</Label>
              <Input
                id="edit-venue"
                type="text"
                placeholder="e.g., King Fahd International Stadium"
                value={formVenue}
                onChange={(e) => setFormVenue(e.target.value)}
              />
            </div>

          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setIsEditMatchOpen(false);
              }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMatch}>Update Match</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the match{" "}
              {selectedMatch && (
                <span className="font-semibold">
                  {selectedMatch.team1} vs {selectedMatch.team2}
                </span>
              )}{" "}
              and all associated violations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedMatch(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteMatch}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
