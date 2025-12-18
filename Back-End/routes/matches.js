import express from "express";
import Match from "../models/Match.js";
import Violation from "../models/Violation.js";
import fetch from "node-fetch";
import dotenv from "dotenv";

// Load environment variables (in case routes are loaded before server.js)
dotenv.config();

const router = express.Router();

// External API configuration from environment variables
const EXTERNAL_API_URL = (process.env.EXTERNAL_API_URL || "").trim();
const EXTERNAL_API_TMCL = (process.env.EXTERNAL_API_TMCL || "").trim();
const EXTERNAL_API_JSONP_CALLBACK = (
  process.env.EXTERNAL_API_JSONP_CALLBACK || ""
).trim();
const EXTERNAL_API_REFERER = (process.env.EXTERNAL_API_REFERER || "").trim();
const EXTERNAL_API_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

// GET /api/matches/external - Fetch matches from external API
router.get("/external", async (req, res) => {
  try {
    const { league, week } = req.query;

    // Validate environment variables
    if (!EXTERNAL_API_URL || !EXTERNAL_API_TMCL) {
      throw new Error(
        "External API configuration is missing. Please check your .env file."
      );
    }

    // Build query parameters for external API
    const params = new URLSearchParams({
      tmcl: EXTERNAL_API_TMCL,
      _fmt: "json", // Try JSON format first
      _pgSz: "400",
    });

    // Add league filter if provided (you may need to map league codes)
    // if (league) {
    //   params.append('league', league);
    // }

    const apiUrl = `${EXTERNAL_API_URL}?${params.toString()}`;

    const response = await fetch(apiUrl, {
      headers: {
        Referer: EXTERNAL_API_REFERER,
        "User-Agent": EXTERNAL_API_USER_AGENT,
      },
    });

    if (!response.ok) {
      // If JSON fails, try JSONP
      if (!EXTERNAL_API_JSONP_CALLBACK) {
        throw new Error(
          "JSONP callback is not configured in environment variables."
        );
      }

      const jsonpParams = new URLSearchParams({
        tmcl: EXTERNAL_API_TMCL,
        _fmt: "jsonp",
        _clbk: EXTERNAL_API_JSONP_CALLBACK,
        _pgSz: "400",
      });

      const jsonpUrl = `${EXTERNAL_API_URL}?${jsonpParams.toString()}`;
      const jsonpResponse = await fetch(jsonpUrl, {
        headers: {
          Referer: EXTERNAL_API_REFERER,
          "User-Agent": EXTERNAL_API_USER_AGENT,
        },
      });

      if (!jsonpResponse.ok) {
        throw new Error(`External API error: ${jsonpResponse.status}`);
      }

      const jsonpText = await jsonpResponse.text();
      // Extract JSON from JSONP callback using dynamic callback name
      const callbackRegex = new RegExp(
        `^${EXTERNAL_API_JSONP_CALLBACK}\\((.*)\\)$`
      );
      const jsonMatch = jsonpText.match(callbackRegex);

      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[1]);
        // Transform API response to match our Match model structure
        const transformedMatches = transformApiMatches(jsonData);
        return res.json(transformedMatches);
      } else {
        throw new Error("Failed to parse JSONP response");
      }
    }

    const data = await response.json();

    // Transform API response to match our Match model structure
    const transformedMatches = transformApiMatches(data);

    res.json(transformedMatches);
  } catch (error) {
    console.error("Error fetching external matches:", error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to transform API response to our Match format
function transformApiMatches(apiData) {
  if (!apiData || !apiData.match || !Array.isArray(apiData.match)) {
    return [];
  }

  return apiData.match.map((matchItem) => {
    const matchInfo = matchItem.matchInfo;
    const liveData = matchItem.liveData;

    // Get contestants (teams)
    const contestants = matchInfo.contestant || [];
    const homeTeam = contestants.find((c) => c.position === "home");
    const awayTeam = contestants.find((c) => c.position === "away");

    // Determine status based on liveData.matchDetails.matchStatus
    let status = "upcoming";
    let winner = null;
    let scores = null;

    // Check matchStatus from liveData if available
    if (liveData && liveData.matchDetails) {
      const matchStatus = liveData.matchDetails.matchStatus;
      
      // Normalize matchStatus (trim whitespace and handle case)
      const normalizedStatus = matchStatus ? String(matchStatus).trim() : null;
      
      if (normalizedStatus === "Fixture") {
        status = "upcoming";
      } else if (normalizedStatus === "Played") {
        status = "finished";
        winner = liveData.matchDetails.winner || null;
        scores = liveData.matchDetails.scores?.total || null;
      } else if (normalizedStatus === "Live" || normalizedStatus === "InProgress") {
        status = "live";
      } else if (normalizedStatus === "Postponed") {
        status = "postponed";
      } else if (normalizedStatus) {
        // Default to finished if matchStatus indicates completion
        status = "finished";
        winner = liveData.matchDetails.winner || null;
        scores = liveData.matchDetails.scores?.total || null;
      } else {
        // No matchStatus - default to upcoming
        status = "upcoming";
      }
    } else {
      // No liveData - default to upcoming
      status = "upcoming";
    }

    // Extract date and time (use localDate/localTime for KSA time, fallback to date/time)
    const dateStr = matchInfo.localDate || matchInfo.date || "";
    let timeStr = matchInfo.localTime || matchInfo.time || "";

    // Format date (remove Z if present)
    let formattedDate = dateStr;
    if (dateStr.endsWith("Z")) {
      formattedDate = dateStr.replace("Z", "");
    }

    // Format time to 12-hour format if present
    if (timeStr) {
      // Remove Z suffix if present
      if (timeStr.endsWith("Z")) {
        timeStr = timeStr.replace("Z", "");
      }

      // Parse 24-hour time and convert to 12-hour format
      try {
        const [hours, minutes] = timeStr.split(":").map(Number);
        if (!isNaN(hours) && !isNaN(minutes)) {
          const period = hours >= 12 ? "PM" : "AM";
          const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
          timeStr = `${hours12}:${minutes
            .toString()
            .padStart(2, "0")} ${period}`;
        }
      } catch (e) {
        // If parsing fails, keep original time string
        console.warn("Failed to parse time:", timeStr);
      }
    }

    return {
      _id: matchInfo.id,
      description:
        matchInfo.description ||
        `${homeTeam?.officialName || ""} vs ${awayTeam?.officialName || ""}`,
      team1: homeTeam?.officialName || "",
      team2: awayTeam?.officialName || "",
      date: formattedDate, // Keep as date string (YYYY-MM-DD format)
      time: timeStr, // Formatted as 12-hour (e.g., "2:50 PM")
      week: matchInfo.week || "",
      competition: matchInfo.competition?.name || "",
      competitionId: matchInfo.competition?.id || "",
      stadium: matchInfo.venue?.longName || "",
      status: status,
      league: "saudi", // Default to saudi for now, can be determined from competition
      // Match result data (if finished)
      winner: winner,
      scores: scores,
      // Store original API data for reference
      originalData: {
        matchId: matchInfo.id,
        competitionId: matchInfo.competition?.id,
        venueId: matchInfo.venue?.id,
      },
    };
  });
}

// GET /api/matches - Get all matches from database
router.get("/", async (req, res) => {
  try {
    const { status, league, week, limit, sort } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (league) {
      query.league = league;
    }

    if (week) {
      query.week = week;
    }

    const limitNum = limit ? parseInt(limit) : 50;
    const sortOrder = sort === "asc" ? 1 : -1;

    const matches = await Match.find(query)
      .sort({ date: sortOrder })
      .limit(limitNum)
      .lean();

    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/matches/:id - Get single match by ID
router.get("/:id", async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    res.json(match);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid match ID" });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/matches - Create new match
router.post("/", async (req, res) => {
  try {
    const {
      description,
      team1,
      team2,
      date,
      time,
      status,
      week,
      competition,
      competitionId,
      stadium,
      league,
      winner,
      scores,
    } = req.body;

    if (!team1 || !team2 || !date || !time || !league) {
      return res.status(400).json({
        error: "Missing required fields: team1, team2, date, time, league",
      });
    }

    if (!["saudi", "italian", "spanish"].includes(league)) {
      return res.status(400).json({
        error: "Invalid league. Must be one of: saudi, italian, spanish",
      });
    }

    const matchData = {
      description: description || `${team1} vs ${team2}`,
      team1,
      team2,
      date: new Date(date),
      time,
      status: status || "upcoming",
      week,
      competition,
      stadium,
      league,
    };

    // Add optional fields if provided
    if (competitionId) {
      matchData.competitionId = competitionId;
    }

    // Add winner and scores if match is finished
    if (status === "finished") {
      if (winner) {
        matchData.winner = winner;
      }
      if (scores) {
        matchData.scores = scores;
      }
    }

    const match = new Match(matchData);
    const savedMatch = await match.save();
    res.status(201).json(savedMatch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/matches/:id - Update match
router.put("/:id", async (req, res) => {
  try {
    const {
      description,
      team1,
      team2,
      date,
      time,
      status,
      week,
      competition,
      stadium,
      league,
    } = req.body;

    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    // Update fields
    if (description !== undefined) match.description = description;
    if (team1 !== undefined) match.team1 = team1;
    if (team2 !== undefined) match.team2 = team2;
    if (date !== undefined) match.date = new Date(date);
    if (time !== undefined) match.time = time;
    if (week !== undefined) match.week = week;
    if (competition !== undefined) match.competition = competition;
    if (stadium !== undefined) match.stadium = stadium;
    if (league !== undefined) {
      if (!["saudi", "italian", "spanish"].includes(league)) {
        return res.status(400).json({
          error: "Invalid league. Must be one of: saudi, italian, spanish",
        });
      }
      match.league = league;
    }

    // Handle status change
    if (status !== undefined && status !== match.status) {
      match.status = status;
      if (!match.statusHistory) {
        match.statusHistory = [];
      }
      match.statusHistory.push({
        status,
        changedAt: new Date(),
      });
    }

    const updatedMatch = await match.save();
    res.json(updatedMatch);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid match ID" });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/matches/:id - Delete match
router.delete("/:id", async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    // Delete associated violations
    await Violation.deleteMany({ matchId: match._id });

    await Match.findByIdAndDelete(req.params.id);
    res.json({ message: "Match and associated violations deleted" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid match ID" });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/matches/:id/stats - Get match statistics
router.get("/:id/stats", async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    const violations = await Violation.find({ matchId: match._id }).lean();

    const totalViolations = violations.length;
    const blockedViolations = violations.filter(
      (v) => v.status === "blocked" || v.status === "removed"
    ).length;
    const activeViolations = violations.filter((v) =>
      ["reported", "active", "pending", "review"].includes(v.status)
    ).length;

    const totalViews = violations.reduce((sum, v) => {
      const views = parseFloat(v.views.replace("K", "")) * 1000;
      return sum + views;
    }, 0);

    const blockedRate =
      totalViolations > 0
        ? Math.round((blockedViolations / totalViolations) * 100)
        : 0;

    res.json({
      totalViolations,
      blockedViolations,
      activeViolations,
      totalViews,
      blockedRate,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid match ID" });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
