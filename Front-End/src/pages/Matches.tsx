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
  Trophy,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

type League = "saudi" | "italian" | "spanish" | null;

const leagueNames = {
  saudi: "Saudi Pro League",
  italian: "Italian Serie A",
  spanish: "Spanish La Liga",
};

interface Match {
  _id: string;
  description: string;
  team1: string;
  team2: string;
  date: string;
  time: string;
  week: string;
  competition?: string;
  competitionId?: string;
  stadium?: string;
  status: "upcoming" | "live" | "finished" | "cancelled" | "postponed";
  league: "saudi" | "italian" | "spanish";
  winner?: string | null;
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

const competitions = [
  "Saudi Pro League",
  "Italian Serie A",
  "Spanish La Liga",
  "Champions League",
  "Europa League",
  "Copa del Rey",
  "Coppa Italia",
  "King's Cup",
];

type MatchFilter = "all" | "live" | "upcoming" | "completed";

export default function Matches() {
  const navigate = useNavigate();
  const [selectedWeek, setSelectedWeek] = useState("12");
  const [selectedLeague, setSelectedLeague] = useState<League>(null);
  const [isLeagueDialogOpen, setIsLeagueDialogOpen] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddMatchOpen, setIsAddMatchOpen] = useState(false);
  const [matchFilter, setMatchFilter] = useState<MatchFilter>("all");

  // Form state for adding match
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formWeek, setFormWeek] = useState("");
  const [formCompetition, setFormCompetition] = useState("");
  const [formCompetitionId, setFormCompetitionId] = useState("");
  const [formTeam1, setFormTeam1] = useState("");
  const [formTeam2, setFormTeam2] = useState("");
  const [formVenue, setFormVenue] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<
    "upcoming" | "live" | "finished" | "cancelled" | "postponed"
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
      setIsLeagueDialogOpen(false);
    }

    const savedWeek = localStorage.getItem("selectedWeek");
    if (savedWeek) {
      setSelectedWeek(savedWeek);
    }
  }, []);

  // Save selected week to localStorage whenever it changes
  useEffect(() => {
    if (selectedWeek) {
      localStorage.setItem("selectedWeek", selectedWeek);
    }
  }, [selectedWeek]);

  // Fetch matches from external API and database
  const fetchExternalMatches = useCallback(async () => {
    if (!selectedLeague) return;

    setLoading(true);
    try {
      // Fetch external matches
      const externalResponse = await fetch(
        `${API_URL}/matches/external?league=${selectedLeague}&week=${selectedWeek}`
      );
      let externalMatches: Match[] = [];
      if (externalResponse.ok) {
        const externalData = await externalResponse.json();
        // Filter external matches by selected week if provided
        externalMatches = selectedWeek
          ? externalData.filter((match: Match) => match.week === selectedWeek)
          : externalData;
      }

      // Fetch manually added matches from database
      const dbResponse = await fetch(
        `${API_URL}/matches?league=${selectedLeague}&week=${selectedWeek}`
      );
      let dbMatches: Match[] = [];
      if (dbResponse.ok) {
        const dbData = await dbResponse.json();
        // Convert date to string format if needed
        dbMatches = dbData.map((match: Match) => ({
          ...match,
          date: match.date
            ? typeof match.date === "string"
              ? match.date
              : new Date(match.date).toISOString().split("T")[0]
            : "",
        }));
      }

      // Combine both sources and remove duplicates based on _id
      const allMatches = [...externalMatches, ...dbMatches];
      const uniqueMatches = allMatches.filter(
        (match, index, self) =>
          index === self.findIndex((m) => m._id === match._id)
      );

      // Set the matches to display
      setMatches(uniqueMatches);
    } catch (error) {
      console.error("Error fetching matches:", error);
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

  // Fetch matches when league is selected
  useEffect(() => {
    if (selectedLeague) {
      fetchExternalMatches();
    }
  }, [selectedLeague, selectedWeek, fetchExternalMatches]);

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
        body: JSON.stringify({
          team1: formTeam1,
          team2: formTeam2,
          date: formDate,
          time: formTime,
          week: formWeek,
          competition: formCompetition || undefined,
          stadium: formVenue || undefined,
          league: selectedLeague,
          status: "upcoming",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create match");
      }

      const newMatch = await response.json();
      // Format date to string if it's a Date object
      const formattedMatch: Match = {
        ...newMatch,
        date:
          typeof newMatch.date === "string"
            ? newMatch.date
            : new Date(newMatch.date).toISOString().split("T")[0],
      };
      setMatches([...matches, formattedMatch]);
      toast({
        title: "Success",
        description: "Match added successfully",
      });

      // Reset form
      setFormDate("");
      setFormTime("");
      setFormWeek("");
      setFormCompetition("");
      setFormTeam1("");
      setFormTeam2("");
      setFormVenue("");
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

  const handleLeagueSelect = (league: "saudi" | "italian" | "spanish") => {
    setSelectedLeague(league);
    localStorage.setItem("selectedLeague", league);
    setIsLeagueDialogOpen(false);
  };

  const handleChangeLeague = () => {
    setIsLeagueDialogOpen(true);
  };

  const getCountdownText = (dateStr: string | Date, timeStr: string) => {
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    const dateOnly = date.toISOString().split("T")[0];
    const matchDate = new Date(`${dateOnly}T${timeStr}`);
    const now = new Date();
    const diff = matchDate.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours < 48 && hours >= 0) {
      return `${hours}h ${minutes}m`;
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
              {countdown && (
                <Badge
                  variant="outline"
                  className="bg-chart-1/10 text-chart-1 animate-pulse">
                  <Clock className="h-3 w-3 mr-1" />
                  Starts in {countdown}
                </Badge>
              )}
            </div>
            <h3 className="text-xl font-bold mb-2">
              <span
                className={
                  match.status === "finished" && match.winner
                    ? match.winner === "home"
                      ? "text-green-600"
                      : match.winner === "draw"
                      ? "text-yellow-600"
                      : match.winner === "away"
                      ? "text-red-600"
                      : "text-black"
                    : match.status === "finished" && !match.winner
                    ? "text-black"
                    : "text-black"
                }>
                {match.team1}
              </span>{" "}
              vs{" "}
              <span
                className={
                  match.status === "finished" && match.winner
                    ? match.winner === "away"
                      ? "text-green-600"
                      : match.winner === "draw"
                      ? "text-yellow-600"
                      : match.winner === "home"
                      ? "text-red-600"
                      : "text-black"
                    : match.status === "finished" && !match.winner
                    ? "text-black"
                    : "text-black"
                }>
                {match.team2}
              </span>
            </h3>
            {match.scores && (
              <div className="text-2xl font-bold mb-2">
                <span
                  className={
                    match.winner === "home"
                      ? "text-green-600"
                      : match.winner === "draw"
                      ? "text-yellow-600"
                      : "text-red-600"
                  }>
                  {match.scores.home}
                </span>{" "}
                -{" "}
                <span
                  className={
                    match.winner === "away"
                      ? "text-green-600"
                      : match.winner === "draw"
                      ? "text-yellow-600"
                      : "text-red-600"
                  }>
                  {match.scores.away}
                </span>
              </div>
            )}
            {match.winner && match.winner !== "draw" && (
              <div className="text-sm text-muted-foreground mb-2">
                Winner:{" "}
                <span className="text-green-600 font-semibold">
                  {match.winner === "home" ? match.team1 : match.team2}
                </span>
              </div>
            )}
            {match.winner === "draw" && (
              <div className="text-sm text-yellow-600 font-semibold mb-2">
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
                  {match.competition}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate(`/match/${match._id}`)}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Match Dashboard
          </Button>
        </div>
      </Card>
    );
  };

  // League Selection Dialog
  if (isLeagueDialogOpen) {
    return (
      <Dialog
        open={isLeagueDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsLeagueDialogOpen(false);
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
    );
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
            variant="outline"
            size="sm"
            onClick={handleChangeLeague}
            className="gap-2">
            <Trophy className="h-4 w-4" />
            Change League
          </Button>
          <Button
            size="sm"
            onClick={() => setIsAddMatchOpen(true)}
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
          <Button onClick={() => setIsAddMatchOpen(true)}>
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

          {/* Filtered Matches */}
          {filteredMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMatches.map((match) => (
                <MatchCard key={match._id} match={match} />
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
      <Dialog open={isAddMatchOpen} onOpenChange={setIsAddMatchOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Match Manually</DialogTitle>
            <DialogDescription>
              Create a new match for {leagueNames[selectedLeague!]}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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

            <div className="grid grid-cols-2 gap-4">
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
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                type="text"
                placeholder="Auto-generated if left empty"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="competitionId">Competition ID (Optional)</Label>
              <Input
                id="competitionId"
                type="text"
                placeholder="e.g., ea0h6cf3bhl698hkxhpulh2zz"
                value={formCompetitionId}
                onChange={(e) => setFormCompetitionId(e.target.value)}
              />
            </div>

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
                      | "cancelled"
                      | "postponed"
                  )
                }>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="finished">Finished</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="postponed">Postponed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formStatus === "finished" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scoreHome">Home Score *</Label>
                    <Input
                      id="scoreHome"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formScoreHome}
                      onChange={(e) => setFormScoreHome(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scoreAway">Away Score *</Label>
                    <Input
                      id="scoreAway"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formScoreAway}
                      onChange={(e) => setFormScoreAway(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="winner">Winner (Optional)</Label>
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
                        {formTeam1 || "Home Team"}
                      </SelectItem>
                      <SelectItem value="away">
                        {formTeam2 || "Away Team"}
                      </SelectItem>
                      <SelectItem value="draw">Draw</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMatchOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMatch}>Add Match</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
