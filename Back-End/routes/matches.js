import express from "express";
import mongoose from "mongoose";
import Match from "../models/Match.js";
import Competition from "../models/Competition.js";
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

        // Save/update matches in database
        await saveMatchesToDatabase(transformedMatches);

        // Return matches from database (not from API)
        return await returnMatchesFromDatabase(req, res);
      } else {
        throw new Error("Failed to parse JSONP response");
      }
    }

    const data = await response.json();

    // Transform API response to match our Match model structure
    const transformedMatches = transformApiMatches(data);

    // Save/update matches in database
    await saveMatchesToDatabase(transformedMatches);

    // Return matches from database (not from API)
    await returnMatchesFromDatabase(req, res);
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
      } else if (
        normalizedStatus === "Live" ||
        normalizedStatus === "InProgress" ||
        normalizedStatus === "Playing"
      ) {
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

    // Determine league from competition name
    let league = "saudi"; // Default
    const competitionName = matchInfo.competition?.name || "";
    if (
      competitionName.toLowerCase().includes("italian") ||
      competitionName.toLowerCase().includes("serie a")
    ) {
      league = "italian";
    } else if (
      competitionName.toLowerCase().includes("spanish") ||
      competitionName.toLowerCase().includes("la liga")
    ) {
      league = "spanish";
    }

    return {
      externalMatchId: matchInfo.id, // Store external API match ID (primary identifier)
      description:
        matchInfo.description ||
        `${homeTeam?.officialName || ""} vs ${awayTeam?.officialName || ""}`,
      team1: homeTeam?.officialName || "",
      team2: awayTeam?.officialName || "",
      date: formattedDate, // Keep as date string (YYYY-MM-DD format)
      time: timeStr, // Formatted as 12-hour (e.g., "2:50 PM")
      week: matchInfo.week || "",
      competitionData: matchInfo.competition
        ? {
            externalId: matchInfo.competition.id,
            name: matchInfo.competition.name,
            knownName: matchInfo.competition.knownName,
            competitionCode: matchInfo.competition.competitionCode,
            competitionFormat: matchInfo.competition.competitionFormat,
            league: league,
            country: matchInfo.competition.country,
          }
        : null,
      stadium: matchInfo.venue?.longName || "",
      status: status,
      league: league,
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

// Helper function to save/update competitions in database
async function saveCompetitionsToDatabase(competitionsData) {
  try {
    const savePromises = competitionsData.map(async (compData) => {
      if (!compData || !compData.externalId) return;

      await Competition.findOneAndUpdate(
        { externalId: compData.externalId },
        {
          $set: compData,
        },
        {
          upsert: true,
          new: true,
        }
      );
    });

    await Promise.all(savePromises);
  } catch (error) {
    console.error("Error saving competitions to database:", error);
  }
}

// Helper function to normalize values for comparison
function normalizeValue(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null) {
    // Sort object keys for consistent comparison
    const sorted = {};
    Object.keys(value)
      .sort()
      .forEach((key) => {
        sorted[key] = normalizeValue(value[key]);
      });
    return JSON.stringify(sorted);
  }
  return String(value);
}

// Helper function to check if two match objects have different values
function hasChanges(existingMatch, newMatchData) {
  const fieldsToCompare = [
    "description",
    "team1",
    "team2",
    "time",
    "week",
    "stadium",
    "status",
    "league",
    "winner",
  ];

  // Compare simple fields
  for (const field of fieldsToCompare) {
    const existingValue = normalizeValue(existingMatch[field]);
    const newValue = normalizeValue(newMatchData[field]);
    if (existingValue !== newValue) {
      return true;
    }
  }

  // Compare date (handle Date objects)
  const existingDate = existingMatch.date
    ? new Date(existingMatch.date).toISOString().split("T")[0]
    : null;
  const newDate = newMatchData.date
    ? new Date(newMatchData.date).toISOString().split("T")[0]
    : null;
  if (existingDate !== newDate) {
    return true;
  }

  // Compare scores object
  const existingScores = normalizeValue(existingMatch.scores);
  const newScores = normalizeValue(newMatchData.scores);
  if (existingScores !== newScores) {
    return true;
  }

  return false;
}

// Helper function to save/update matches in database
async function saveMatchesToDatabase(transformedMatches) {
  try {
    let createdCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    // First, save all competitions
    const competitionsData = transformedMatches
      .map((m) => m.competitionData)
      .filter((c) => c !== null);
    await saveCompetitionsToDatabase(competitionsData);

    const savePromises = transformedMatches.map(async (matchData) => {
      // externalMatchId is required - skip if missing
      if (!matchData.externalMatchId) {
        console.warn("Skipping match without externalMatchId");
        return;
      }

      // Convert date string to Date object
      const matchDate = new Date(matchData.date);

      // Find or create competition reference
      let competitionRef = null;
      let externalCompetitionId = null;
      if (matchData.competitionData?.externalId) {
        const competition = await Competition.findOne({
          externalId: matchData.competitionData.externalId,
        });
        if (competition) {
          competitionRef = competition._id;
          externalCompetitionId = competition.externalId;
        }
      }

      // Prepare match data for database
      const dbMatchData = {
        description: matchData.description,
        team1: matchData.team1,
        team2: matchData.team2,
        date: matchDate,
        time: matchData.time || "", // Use empty string if time is missing
        week: matchData.week,
        competition: competitionRef,
        externalCompetitionId: externalCompetitionId,
        externalMatchId: matchData.externalMatchId,
        stadium: matchData.stadium,
        status: matchData.status,
        league: matchData.league,
        winner: matchData.winner,
        scores: matchData.scores,
      };

      // Find existing match by externalMatchId (primary identifier)
      const filter = { externalMatchId: matchData.externalMatchId };

      const existingMatch = await Match.findOne(filter).lean();

      if (!existingMatch) {
        // Create new match with statusHistory
        await Match.create({
          ...dbMatchData,
          statusHistory: [
            {
              status: matchData.status,
              changedAt: new Date(),
            },
          ],
        });
        createdCount++;
      } else {
        // Check if anything changed
        if (hasChanges(existingMatch, dbMatchData)) {
          // Update existing match
          await Match.findOneAndUpdate(
            filter,
            {
              $set: dbMatchData,
            },
            { new: true }
          );
          updatedCount++;
        } else {
          // No changes, skip update
          unchangedCount++;
        }
      }
    });

    await Promise.all(savePromises);
    console.log(
      `Matches sync: ${createdCount} created, ${updatedCount} updated, ${unchangedCount} unchanged (total: ${transformedMatches.length})`
    );
  } catch (error) {
    console.error("Error saving matches to database:", error);
    // Don't throw error - we still want to return the matches even if save fails
  }
}

// Helper function to return matches from database
async function returnMatchesFromDatabase(req, res) {
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

    const limitNum = limit ? parseInt(limit) : 1000; // Increased limit for external sync
    const sortOrder = sort === "asc" ? 1 : -1;

    // Fetch matches without populate to avoid errors with old string data
    const matches = await Match.find(query)
      .sort({ date: sortOrder })
      .limit(limitNum)
      .lean();

    // Populate competition only for matches that have ObjectId references
    // Handle both old data (string) and new data (ObjectId)
    const matchesWithCompetition = await Promise.all(
      matches.map(async (match) => {
        // Check if competition is an ObjectId (new format)
        // ObjectId in lean() returns as an object with _bsontype or as a string
        if (match.competition) {
          // Check if it's an ObjectId-like value (24 hex characters)
          const competitionValue = match.competition.toString();
          const isObjectId = /^[0-9a-fA-F]{24}$/.test(competitionValue);

          if (isObjectId) {
            // It's an ObjectId, try to fetch the competition
            try {
              const competition = await Competition.findById(competitionValue);
              if (competition) {
                match.competition = competition;
              } else {
                match.competition = null;
              }
            } catch (error) {
              // If lookup fails, set to null
              console.warn("Failed to find competition:", error.message);
              match.competition = null;
            }
          }
          // If it's not an ObjectId (it's a string like "Saudi League"), keep it as is
        }
        return match;
      })
    );

    // Format dates to strings for frontend
    const formattedMatches = matchesWithCompetition.map((match) => {
      // Handle competition - convert to string if it's an object
      let competitionName = "";
      if (match.competition) {
        if (typeof match.competition === "object" && match.competition.name) {
          competitionName = match.competition.name;
        } else if (typeof match.competition === "string") {
          competitionName = match.competition;
        }
      }

      return {
        ...match,
        date: match.date
          ? new Date(match.date).toISOString().split("T")[0]
          : "",
        competition: competitionName, // Always return as string for frontend
      };
    });

    res.json(formattedMatches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// GET /api/matches - Get all matches from database
router.get("/", async (req, res) => {
  return await returnMatchesFromDatabase(req, res);
});

// GET /api/matches/:externalMatchId - Get single match by externalMatchId
router.get("/:externalMatchId", async (req, res) => {
  try {
    const match = await Match.findOne({
      externalMatchId: req.params.externalMatchId,
    }).populate("competition");

    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    res.json(match);
  } catch (error) {
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

    // Determine league from competition name (prioritize competition over provided league)
    let finalLeague = league;
    if (competition) {
      const competitionLower = competition.toLowerCase();
      if (competitionLower.includes("saudi")) {
        finalLeague = "saudi";
      } else if (
        competitionLower.includes("italian") ||
        competitionLower.includes("serie a")
      ) {
        finalLeague = "italian";
      } else if (
        competitionLower.includes("spanish") ||
        competitionLower.includes("la liga")
      ) {
        finalLeague = "spanish";
      }
    }

    if (
      !finalLeague ||
      !["saudi", "italian", "spanish"].includes(finalLeague)
    ) {
      return res.status(400).json({
        error:
          "Invalid league. Must be one of: saudi, italian, spanish. League can be determined from competition name or provided explicitly.",
      });
    }

    // Generate externalMatchId for manually added matches if not provided
    // Use MongoDB _id as externalMatchId for manual matches
    let externalMatchId = req.body.externalMatchId;
    let matchId = null;
    if (!externalMatchId) {
      // Generate a new ObjectId and use its string representation as externalMatchId
      matchId = new mongoose.Types.ObjectId();
      externalMatchId = matchId.toString();
    }

    // Find or create competition reference if competition name is provided
    let competitionRef = null;
    let externalCompetitionId = null;
    if (competition) {
      // Try to find existing competition by name
      let comp = await Competition.findOne({ name: competition });

      if (!comp) {
        // Create new competition if it doesn't exist
        comp = await Competition.create({
          externalId: `manual_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 15)}`,
          name: competition,
          league: finalLeague,
        });
      }
      competitionRef = comp._id;
      externalCompetitionId = comp.externalId;
    } else if (competitionId) {
      // Fallback to competitionId if provided
      const comp = await Competition.findOne({ externalId: competitionId });
      if (comp) {
        competitionRef = comp._id;
        externalCompetitionId = comp.externalId;
      }
    }

    // If we generated an _id, use it for the document and ensure externalMatchId matches
    if (matchId) {
      externalMatchId = matchId.toString();
    }

    const matchData = {
      description: description || `${team1} vs ${team2}`,
      team1,
      team2,
      date: new Date(date),
      time,
      status: status || "upcoming",
      week,
      competition: competitionRef,
      externalCompetitionId: externalCompetitionId,
      stadium,
      league: finalLeague,
      externalMatchId, // Required field - will be same as _id for manual matches
    };

    // If we generated an _id, use it for the document
    if (matchId) {
      matchData._id = matchId;
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

    // Ensure externalMatchId matches _id for manual matches
    if (matchId && savedMatch.externalMatchId !== savedMatch._id.toString()) {
      savedMatch.externalMatchId = savedMatch._id.toString();
      await savedMatch.save();
    }

    res.status(201).json(savedMatch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/matches/:externalMatchId - Update match
router.put("/:externalMatchId", async (req, res) => {
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
      topPlatformId,
      mostViews,
    } = req.body;

    const match = await Match.findOne({
      externalMatchId: req.params.externalMatchId,
    });

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
    if (competition !== undefined) {
      let competitionRef = null;
      let externalCompetitionId = null;
      
      if (competition) {
        // Try to find competition by ObjectId first
        let comp = await Competition.findById(competition);
        
        // If not found by ObjectId, try by externalId
        if (!comp) {
          comp = await Competition.findOne({ externalId: competition });
        }
        
        // If still not found, try by name
        if (!comp) {
          comp = await Competition.findOne({ name: competition });
        }
        
        if (comp) {
          competitionRef = comp._id;
          externalCompetitionId = comp.externalId;
        }
      }
      
      match.competition = competitionRef;
      match.externalCompetitionId = externalCompetitionId;
    }
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
    
    // Update top platform fields
    if (topPlatformId !== undefined) match.topPlatformId = topPlatformId;
    if (mostViews !== undefined) match.mostViews = mostViews;

    const updatedMatch = await match.save();
    res.json(updatedMatch);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid match ID" });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/matches/:externalMatchId - Delete match
router.delete("/:externalMatchId", async (req, res) => {
  try {
    const match = await Match.findOne({
      externalMatchId: req.params.externalMatchId,
    });

    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    // Delete associated violations
    await Violation.deleteMany({ matchId: match._id });

    await Match.findOneAndDelete({
      externalMatchId: req.params.externalMatchId,
    });
    res.json({ message: "Match and associated violations deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/matches/:externalMatchId/stats - Get match statistics
router.get("/:externalMatchId/stats", async (req, res) => {
  try {
    const match = await Match.findOne({
      externalMatchId: req.params.externalMatchId,
    });

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
