import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, TrendingUp, Eye, Shield, AlertTriangle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { mockMatches } from "@/data/mockData";

export default function Matches() {
  const navigate = useNavigate();
  const [selectedWeek, setSelectedWeek] = useState("12");

  const liveMatches = mockMatches.filter(m => m.status === "live");
  const upcomingMatches = mockMatches.filter(m => m.status === "upcoming");
  const previousMatches = mockMatches.filter(m => m.status === "completed");

  const getCountdownText = (dateStr: string, timeStr: string) => {
    const matchDate = new Date(`${dateStr}T${timeStr}`);
    const now = new Date();
    const diff = matchDate.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours < 48 && hours >= 0) {
      return `${hours}h ${minutes}m`;
    }
    return null;
  };

  const MatchCard = ({ match }: { match: typeof mockMatches[0] }) => {
    const countdown = match.status === 'upcoming' ? getCountdownText(match.date, match.time) : null;
    
    return (
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={
                match.status === "live" ? "default" :
                match.status === "upcoming" ? "secondary" : "outline"
              }>
                {match.status === "live" && "● LIVE"}
                {match.status === "upcoming" && "Upcoming"}
                {match.status === "completed" && "Completed"}
              </Badge>
              <Badge variant="outline">Week {match.week}</Badge>
              {countdown && (
                <Badge variant="outline" className="bg-chart-1/10 text-chart-1 animate-pulse">
                  <Clock className="h-3 w-3 mr-1" />
                  Starts in {countdown}
                </Badge>
              )}
            </div>
            <h3 className="text-xl font-bold mb-2">{match.description}</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{match.date} • {match.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{match.venue}</span>
              </div>
            </div>
          </div>
          {match.violations > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold text-destructive">{match.violations}</div>
              <div className="text-xs text-muted-foreground">violations</div>
            </div>
          )}
        </div>

        {/* Match Stats */}
        {match.violations > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <AlertTriangle className="h-3 w-3" />
              </div>
              <p className="text-lg font-bold">{match.violations}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Shield className="h-3 w-3" />
              </div>
              <p className={`text-lg font-bold ${match.blockedPercent >= 85 ? 'text-success' : match.blockedPercent >= 70 ? 'text-warning' : 'text-destructive'}`}>
                {match.blocked}
              </p>
              <p className="text-xs text-muted-foreground">Blocked</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Eye className="h-3 w-3" />
              </div>
              <p className="text-lg font-bold text-destructive">{match.active}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        )}

        {/* Operator Assignment */}
        {match.status === 'live' || match.status === 'upcoming' ? (
          <div className="mb-4">
            <Select defaultValue="unassigned">
              <SelectTrigger className="w-full text-xs">
                <SelectValue placeholder="Assign operator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="operator-a">Operator A</SelectItem>
                <SelectItem value="operator-b">Operator B</SelectItem>
                <SelectItem value="operator-c">Operator C</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate(`/match/${match.id}`)}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Match Dashboard
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Matches</h1>
          <p className="text-sm text-muted-foreground">Lab Landing • Week {selectedWeek}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="text-sm">Current Week: {selectedWeek}</Badge>
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">Week 12</SelectItem>
              <SelectItem value="11">Week 11</SelectItem>
              <SelectItem value="10">Week 10</SelectItem>
              <SelectItem value="9">Week 9</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {liveMatches.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
            Live Matches
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">Upcoming Matches</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcomingMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Previous Matches</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {previousMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </div>
    </div>
  );
}
