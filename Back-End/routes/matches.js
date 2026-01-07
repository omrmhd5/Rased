import express from "express";
import mongoose from "mongoose";
import Match from "../models/Match.js";
import Competition from "../models/Competition.js";
import Violation from "../models/Violation.js";
import PlatformByMatch from "../models/PlatformByMatch.js";
import DeletedViolationLog from "../models/DeletedViolationLog.js";
import User from "../models/User.js";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { authenticateToken } from "../middleware/auth.js";

// Load environment variables (in case routes are loaded before server.js)
dotenv.config();

const router = express.Router();

// External API configuration from environment variables
const EXTERNAL_API_URL = (process.env.EXTERNAL_API_URL || "").trim();
const EXTERNAL_API_JSONP_CALLBACK = (
  process.env.EXTERNAL_API_JSONP_CALLBACK || ""
).trim();
const EXTERNAL_API_REFERER = (process.env.EXTERNAL_API_REFERER || "").trim();
const EXTERNAL_API_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

// League-specific API configurations
const LEAGUE_API_CONFIG = {
  saudi: {
    tmcl: (process.env.SAUDI_LEAGUE_TMCL || "").trim(),
  },
  "saudi-super-cup": {
    tmcl: (process.env.SAUDI_SUPER_CUP_TMCL || "").trim(),
  },
  "spanish-super-cup": {
    tmcl: (process.env.SPANISH_SUPER_CUP_TMCL || "").trim(),
  },
};

// GET /api/matches/external - Fetch matches from external API
router.get("/external", async (req, res) => {
  try {
    const { league, week } = req.query;

    // Validate league parameter
    if (
      !league ||
      !["saudi", "saudi-super-cup", "spanish-super-cup"].includes(league)
    ) {
      return res.status(400).json({
        error:
          "Valid league parameter is required (saudi, saudi-super-cup, or spanish-super-cup)",
      });
    }

    // Get league-specific API configuration
    const leagueConfig = LEAGUE_API_CONFIG[league];
    if (!leagueConfig || !leagueConfig.tmcl) {
      throw new Error(
        `External API configuration for ${league} is missing. Please check your .env file.`
      );
    }

    // Validate base API URL
    if (!EXTERNAL_API_URL) {
      throw new Error(
        "External API URL is missing. Please check your .env file."
      );
    }

    // Build query parameters for external API
    const params = new URLSearchParams({
      tmcl: leagueConfig.tmcl,
      _fmt: "json", // Try JSON format first
      _pgSz: "400",
    });

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
        tmcl: leagueConfig.tmcl,
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
        const transformedMatches = transformApiMatches(jsonData, league);

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
    const transformedMatches = transformApiMatches(data, league);

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
function transformApiMatches(apiData, leagueFromQuery = null) {
  if (!apiData || !apiData.match || !Array.isArray(apiData.match)) {
    return [];
  }

  return apiData.match
    .map((matchItem) => {
      const matchInfo = matchItem.matchInfo;
      const liveData = matchItem.liveData;

      // Get contestants (teams)
      const contestants = matchInfo.contestant || [];
      const homeTeam = contestants.find((c) => c.position === "home");
      const awayTeam = contestants.find((c) => c.position === "away");

      // Skip matches where teams have probableTeams (not yet determined)
      if (homeTeam?.probableTeams || awayTeam?.probableTeams) {
        console.log(
          `Skipping match ${matchInfo.id} - has probableTeams (teams not yet determined)`
        );
        return null;
      }

      // Check if we have valid team names
      const homeTeamName =
        homeTeam?.officialName || homeTeam?.name || homeTeam?.shortName;
      const awayTeamName =
        awayTeam?.officialName || awayTeam?.name || awayTeam?.shortName;

      if (!homeTeamName || !awayTeamName) {
        console.log(
          `Skipping match ${matchInfo.id} - missing team names (home: ${homeTeamName}, away: ${awayTeamName})`
        );
        return null;
      }

      // Determine status based on liveData.matchDetails.matchStatus
      let status = "upcoming";
      let winner = null;
      let scores = null;

      // Check matchStatus from liveData if available
      if (liveData && liveData.matchDetails) {
        const matchStatus = liveData.matchDetails.matchStatus;

        // Normalize matchStatus (trim whitespace and handle case)
        const normalizedStatus = matchStatus
          ? String(matchStatus).trim()
          : null;

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

      // Use league from query parameter if provided, otherwise try to detect from competition
      let league = leagueFromQuery || "saudi"; // Default to saudi if not provided

      // Only try to detect league if not provided from query
      if (!leagueFromQuery) {
        const competitionName = matchInfo.competition?.name || "";
        const competitionKnownName = matchInfo.competition?.knownName || "";
        const countryName = matchInfo.competition?.country?.name || "";

        // Check if it's a Super Cup
        const isSuperCup =
          competitionName.toLowerCase().includes("super cup") ||
          competitionKnownName.toLowerCase().includes("super cup") ||
          competitionKnownName.toLowerCase().includes("supercopa") ||
          competitionName.toLowerCase().includes("سوبر");

        if (isSuperCup) {
          // Check for Saudi Super Cup
          if (
            competitionName.toLowerCase().includes("saudi") ||
            competitionKnownName.toLowerCase().includes("saudi") ||
            competitionKnownName.toLowerCase().includes("سعودي") ||
            countryName.toLowerCase().includes("saudi")
          ) {
            league = "saudi-super-cup";
          }
          // Check for Spanish Super Cup
          else if (
            competitionName.toLowerCase().includes("spanish") ||
            competitionKnownName.toLowerCase().includes("spanish") ||
            competitionKnownName.toLowerCase().includes("spanish") ||
            countryName.toLowerCase().includes("spain")
          ) {
            league = "spanish-super-cup";
          }
        }
      }

      return {
        externalMatchId: matchInfo.id, // Store external API match ID (primary identifier)
        description:
          matchInfo.description || `${homeTeamName} vs ${awayTeamName}`,
        team1: homeTeamName,
        team2: awayTeamName,
        date: formattedDate, // Keep as date string (YYYY-MM-DD format)
        time: timeStr, // Formatted as 12-hour (e.g., "2:50 PM")
        week: matchInfo.week || "",
        stage: matchInfo.stage?.name || "", // Extract stage name for Super Cups
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
    })
    .filter((match) => match !== null); // Remove null entries (skipped matches)
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
    "stage",
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
        stage: matchData.stage || "", // Store stage for Super Cups
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
          // Update existing match (only if not manually edited)
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
    const { status, league, week, stage, limit, sort } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (league) {
      query.league = league;
    }

    // For Super Cups, use stage filtering; for regular leagues, use week filtering
    const isSuperCup =
      league === "saudi-super-cup" || league === "spanish-super-cup";

    if (isSuperCup) {
      // For Super Cups, if stage is provided, filter by it
      // Also include matches without stage (manually created matches might not have stage initially)
      if (stage) {
        query.$or = [
          { stage: stage },
          { stage: { $exists: false } },
          { stage: "" },
          { stage: null },
        ];
      }
    } else if (!isSuperCup && week) {
      query.week = week;
    }

    const limitNum = limit ? parseInt(limit) : 1000; // Increased limit for external sync
    const sortOrder = sort === "asc" ? 1 : -1;

    // Fetch matches without populate to avoid errors with old string data
    // Exclude deleted matches
    query.isDeleted = { $ne: true };
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
      isDeleted: { $ne: true },
    }).populate("competition");

    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    res.json(match);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Middleware to check if user is superAdmin
const requireSuperAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.role !== "superAdmin") {
      return res.status(403).json({ error: "Access denied. SuperAdmin only." });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/matches - Create new match (superAdmin only)
router.post("/", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const {
      description,
      team1,
      team2,
      date,
      time,
      status,
      week,
      stage,
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
      if (
        competitionLower.includes("saudi super cup") ||
        competitionLower.includes("كاس السوبر السعودي")
      ) {
        finalLeague = "saudi-super-cup";
      } else if (
        competitionLower.includes("spanish super cup") ||
        competitionLower.includes("السوبر الاسباني")
      ) {
        finalLeague = "spanish-super-cup";
      } else if (competitionLower.includes("saudi")) {
        finalLeague = "saudi";
      }
    }

    if (
      !finalLeague ||
      !["saudi", "saudi-super-cup", "spanish-super-cup"].includes(finalLeague)
    ) {
      return res.status(400).json({
        error:
          "Invalid league. Must be one of: saudi, saudi-super-cup, spanish-super-cup. League can be determined from competition name or provided explicitly.",
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
      // Try to find existing competition by exact name match first
      let comp = await Competition.findOne({ name: competition });

      // If not found, try to find by league and known name variations
      if (!comp) {
        // Map frontend competition names to database competition names
        const competitionNameMap = {
          "Saudi Pro League": "Saudi League",
          "Italian Serie A": "Italian Serie A",
          "Spanish La Liga": "Spanish La Liga",
        };

        const mappedName = competitionNameMap[competition];
        if (mappedName) {
          comp = await Competition.findOne({ name: mappedName });
        }

        // If still not found, try to find by league only (for the specific league)
        if (!comp && finalLeague) {
          comp = await Competition.findOne({ league: finalLeague });
        }
      }

      // If still not found, create new competition
      if (!comp) {
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
      stage, // Add stage for Super Cups
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

    // Populate competition and format response
    const populatedMatch = await Match.findById(savedMatch._id)
      .populate("competition")
      .lean();

    // Format competition to string name for frontend
    let competitionName = "";
    if (populatedMatch.competition) {
      if (
        typeof populatedMatch.competition === "object" &&
        populatedMatch.competition.name
      ) {
        competitionName = populatedMatch.competition.name;
      } else if (typeof populatedMatch.competition === "string") {
        competitionName = populatedMatch.competition;
      }
    }

    // Format date to string
    const formattedMatch = {
      ...populatedMatch,
      date: populatedMatch.date
        ? new Date(populatedMatch.date).toISOString().split("T")[0]
        : "",
      competition: competitionName,
    };

    res.status(201).json(formattedMatch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/matches/:externalMatchId - Update match (superAdmin only)
router.put(
  "/:externalMatchId",
  authenticateToken,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const externalMatchIdParam = req.params.externalMatchId;

      const {
        description,
        team1,
        team2,
        date,
        time,
        status,
        week,
        stage,
        competition,
        stadium,
        league,
        topPlatformId,
        mostViews,
        winner,
        scores,
      } = req.body;

      // Try to find match by externalMatchId first (exclude deleted matches)
      let match = await Match.findOne({
        externalMatchId: externalMatchIdParam,
        isDeleted: { $ne: true },
      });

      // If not found, try by _id (for manually created matches where externalMatchId = _id)
      if (!match) {
        // Check if the parameter looks like a MongoDB ObjectId
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(externalMatchIdParam);

        if (isObjectId) {
          match = await Match.findById(externalMatchIdParam);
        }
      }

      if (!match) {
        return res.status(404).json({ error: "Match not found" });
      }

      // Determine league from competition name if league is not provided or invalid
      let finalLeague = league || match.league;

      if (competition && !finalLeague) {
        const competitionLower = competition.toLowerCase();
        if (
          competitionLower.includes("saudi super cup") ||
          competitionLower.includes("كاس السوبر السعودي")
        ) {
          finalLeague = "saudi-super-cup";
        } else if (
          competitionLower.includes("spanish super cup") ||
          competitionLower.includes("السوبر الاسباني")
        ) {
          finalLeague = "spanish-super-cup";
        } else if (competitionLower.includes("saudi")) {
          finalLeague = "saudi";
        }
      }

      // Track if any actual changes are being made
      let hasChanges = false;

      // Update fields
      if (description !== undefined && description !== match.description) {
        match.description = description;
        hasChanges = true;
      }
      if (team1 !== undefined && team1 !== match.team1) {
        match.team1 = team1;
        hasChanges = true;
      }
      if (team2 !== undefined && team2 !== match.team2) {
        match.team2 = team2;
        hasChanges = true;
      }
      if (date !== undefined) {
        const newDate = new Date(date);
        if (newDate.getTime() !== new Date(match.date).getTime()) {
          match.date = newDate;
          hasChanges = true;
        }
      }
      if (time !== undefined && time !== match.time) {
        match.time = time;
        hasChanges = true;
      }
      if (week !== undefined && week !== match.week) {
        match.week = week;
        hasChanges = true;
      }
      if (stage !== undefined && stage !== match.stage) {
        match.stage = stage;
        hasChanges = true;
      }
      if (competition !== undefined) {
        let competitionRef = null;
        let externalCompetitionId = null;

        if (competition) {
          let comp = null;

          // Only try ObjectId lookup if it's a valid ObjectId format
          const isObjectId = /^[0-9a-fA-F]{24}$/.test(competition);
          if (isObjectId) {
            comp = await Competition.findById(competition);
          }

          // If not found by ObjectId, try by externalId
          if (!comp) {
            comp = await Competition.findOne({ externalId: competition });
          }

          // If still not found, try by exact name match
          if (!comp) {
            comp = await Competition.findOne({ name: competition });
          }

          // If still not found, try to find by league and known name variations
          if (!comp) {
            // Map frontend competition names to database competition names
            const competitionNameMap = {
              "Saudi Pro League": "Saudi League",
              "Saudi Super Cup": "Saudi Super Cup",
              "بطولة كاس السوبر السعودي": "Saudi Super Cup",
              "Spanish Super Cup": "Spanish Super Cup",
              "السوبر الاسباني": "Spanish Super Cup",
            };

            const mappedName = competitionNameMap[competition];
            if (mappedName) {
              comp = await Competition.findOne({ name: mappedName });
            }

            // If still not found, try to find by league only (for the specific league)
            if (!comp && finalLeague) {
              comp = await Competition.findOne({ league: finalLeague });
            } else if (!comp && match.league) {
              comp = await Competition.findOne({ league: match.league });
            }
          }

          if (comp) {
            competitionRef = comp._id;
            externalCompetitionId = comp.externalId;
          }
        }

        const competitionChanged =
          String(match.competition) !== String(competitionRef) ||
          match.externalCompetitionId !== externalCompetitionId;
        if (competitionChanged) {
          match.competition = competitionRef;
          match.externalCompetitionId = externalCompetitionId;
          hasChanges = true;
        }
      }
      if (stadium !== undefined && stadium !== match.stadium) {
        match.stadium = stadium;
        hasChanges = true;
      }
      if (finalLeague && finalLeague !== match.league) {
        if (
          !["saudi", "saudi-super-cup", "spanish-super-cup"].includes(
            finalLeague
          )
        ) {
          return res.status(400).json({
            error:
              "Invalid league. Must be one of: saudi, saudi-super-cup, spanish-super-cup",
          });
        }
        match.league = finalLeague;
        hasChanges = true;
      }

      // Handle status change
      if (status !== undefined && status !== match.status) {
        match.status = status;
        hasChanges = true;
        if (!match.statusHistory) {
          match.statusHistory = [];
        }
        match.statusHistory.push({
          status,
          changedAt: new Date(),
        });
      }

      // Update top platform fields (these are usually auto-updated, but check for changes)
      if (
        topPlatformId !== undefined &&
        topPlatformId !== match.topPlatformId
      ) {
        match.topPlatformId = topPlatformId;
        hasChanges = true;
      }
      if (mostViews !== undefined && mostViews !== match.mostViews) {
        match.mostViews = mostViews;
        hasChanges = true;
      }

      // Update winner and scores
      // Clear winner and scores if status is anything other than "finished"
      const finalStatus = status !== undefined ? status : match.status;

      if (finalStatus !== "finished") {
        // Status is not "finished" - clear winner and scores
        if (match.winner !== null || match.scores !== null) {
          match.winner = null;
          match.scores = null;
          hasChanges = true;
        }
      } else if (status === "finished") {
        // Status is "finished", update winner and scores if provided
        if (winner !== undefined) {
          const winnerChanged = (winner || null) !== match.winner;
          if (winnerChanged) {
            match.winner = winner || null;
            hasChanges = true;
          }
        }
        if (scores !== undefined) {
          const scoresChanged =
            JSON.stringify(scores || null) !== JSON.stringify(match.scores);
          if (scoresChanged) {
            match.scores = scores || null;
            hasChanges = true;
          }
        }
      }

      const updatedMatch = await match.save();

      // Populate competition and format response
      const populatedMatch = await Match.findById(updatedMatch._id)
        .populate("competition")
        .lean();

      // Format competition to string name for frontend
      let competitionName = "";
      if (populatedMatch.competition) {
        if (
          typeof populatedMatch.competition === "object" &&
          populatedMatch.competition.name
        ) {
          competitionName = populatedMatch.competition.name;
        } else if (typeof populatedMatch.competition === "string") {
          competitionName = populatedMatch.competition;
        }
      }

      // Format date to string
      const formattedMatch = {
        ...populatedMatch,
        date: populatedMatch.date
          ? new Date(populatedMatch.date).toISOString().split("T")[0]
          : "",
        competition: competitionName,
      };

      res.json(formattedMatch);
    } catch (error) {
      if (error.name === "CastError") {
        return res.status(400).json({ error: "Invalid match ID" });
      }
      res.status(500).json({ error: error.message });
    }
  }
);

// DELETE /api/matches/:externalMatchId - Delete match (superAdmin only)
router.delete(
  "/:externalMatchId",
  authenticateToken,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const match = await Match.findOne({
        externalMatchId: req.params.externalMatchId,
        isDeleted: { $ne: true },
      });

      if (!match) {
        return res.status(404).json({ error: "Match not found" });
      }

      // Delete associated violations
      await Violation.deleteMany({ matchId: match._id });

      // Delete associated platformByMatch documents
      await PlatformByMatch.deleteMany({
        $or: [
          { matchId: match._id },
          { externalMatchId: req.params.externalMatchId },
        ],
      });

      // Delete associated deleted violation logs
      await DeletedViolationLog.deleteMany({
        externalMatchId: req.params.externalMatchId,
      });

      // Soft delete: Set isDeleted to true instead of actually deleting the match
      match.isDeleted = true;
      await match.save();

      res.json({
        message:
          "Match marked as deleted. Associated violations, platform stats, and deleted violation logs have been removed.",
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET /api/matches/dashboard/stats - Get dashboard statistics aggregated by week/league
router.get("/dashboard/stats", async (req, res) => {
  try {
    const {
      league,
      weekFilter,
      week,
      weekStart,
      weekEnd,
      stageFilter,
      stage,
      stageStart,
      stageEnd,
    } = req.query;

    // Validate league
    if (
      !league ||
      !["saudi", "saudi-super-cup", "spanish-super-cup"].includes(league)
    ) {
      return res.status(400).json({
        error:
          "Valid league parameter is required (saudi, saudi-super-cup, or spanish-super-cup)",
      });
    }

    // Build match query
    const matchQuery = {
      league: league,
      isDeleted: { $ne: true },
    };

    // For Super Cups, use stage filtering; for regular leagues, use week filtering
    const isSuperCup =
      league === "saudi-super-cup" || league === "spanish-super-cup";

    if (isSuperCup) {
      // Stage filtering for Super Cups
      if (stageFilter === "single" && stage) {
        matchQuery.stage = stage;
      } else if (stageFilter === "range" && stageStart && stageEnd) {
        const stages = [stageStart, stageEnd];
        matchQuery.stage = { $in: stages };
      }
    } else {
      // Week filtering for regular leagues
      if (weekFilter === "single" && week) {
        matchQuery.week = week.toString();
      } else if (weekFilter === "range" && weekStart && weekEnd) {
        const startWeek = parseInt(weekStart);
        const endWeek = parseInt(weekEnd);
        const weekArray = Array.from(
          { length: endWeek - startWeek + 1 },
          (_, i) => (startWeek + i).toString()
        );
        matchQuery.week = { $in: weekArray };
      }
    }
    // If filter is "all" or not provided, no filter is applied

    // Find all matches matching the criteria
    const matches = await Match.find(matchQuery)
      .select("_id externalMatchId description team1 team2 week status")
      .lean();
    const matchIds = matches.map((m) => m._id);

    if (matchIds.length === 0) {
      return res.json({
        totalViolations: 0,
        blocked: 0,
        stillActive: 0,
        removed: 0,
        underReview: 0,
        totalViews: 0,
        avgBlockTime: 0,
        topPlatform: null,
        topMatch: null,
        matchStats: {
          total: 0,
          completed: 0,
          live: 0,
          upcoming: 0,
          postponed: 0,
        },
        contentSplit: {
          live: { views: 0, violations: 0 },
          highlights: { views: 0, violations: 0 },
          others: { views: 0, violations: 0 },
        },
        platforms: [],
        matches: [],
      });
    }

    // Aggregate violations by status
    const stats = await Violation.aggregate([
      {
        $match: {
          matchId: { $in: matchIds },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get detailed violation data for additional calculations
    const violations = await Violation.find({
      matchId: { $in: matchIds },
    })
      .select(
        "status views blockedAt timeAdded platformId platformName matchId contentType"
      )
      .lean();

    // Initialize counts
    let totalViolations = 0;
    let blocked = 0;
    let stillActive = 0;
    let removed = 0;
    let underReview = 0;

    // Process aggregation results
    stats.forEach((stat) => {
      const status = stat._id;
      const count = stat.count;
      totalViolations += count;

      if (status === "Blocked") {
        blocked += count;
      } else if (status === "Active") {
        stillActive += count;
      } else if (status === "Removed") {
        removed += count;
      } else if (status === "Under Review") {
        underReview += count;
        // Under Review does NOT count as active
      }
    });

    // Calculate total views
    let totalViews = 0;
    violations.forEach((v) => {
      const viewsStr = v.views || "0";
      // Handle "K" suffix (e.g., "1.5K" = 1500) and comma separators (e.g., "1,000" = 1000)
      if (viewsStr.includes("K") || viewsStr.includes("k")) {
        const num = parseFloat(viewsStr.replace(/[Kk,]/g, "")) || 0;
        totalViews += num * 1000;
      } else {
        totalViews += parseFloat(viewsStr.replace(/,/g, "")) || 0;
      }
    });

    // Calculate average block time (only for blocked violations with blockedAt)
    let avgBlockTime = 0;
    const blockedViolations = violations.filter(
      (v) => v.status === "Blocked" && v.blockedAt && v.timeAdded
    );
    if (blockedViolations.length > 0) {
      const validBlockTimes = [];
      blockedViolations.forEach((v) => {
        const timeAdded = new Date(v.timeAdded);
        const blockedAt = new Date(v.blockedAt);

        // Validate dates are valid
        if (!isNaN(timeAdded.getTime()) && !isNaN(blockedAt.getTime())) {
          const diffMs = blockedAt.getTime() - timeAdded.getTime();
          const diffMinutes = diffMs / 60000;

          // Only include reasonable block times (between 0 and 7 days = 10080 minutes)
          // This prevents absurd values from bad data
          if (diffMinutes >= 0 && diffMinutes <= 10080) {
            validBlockTimes.push(diffMinutes);
          }
        }
      });

      if (validBlockTimes.length > 0) {
        const totalBlockTime = validBlockTimes.reduce(
          (sum, time) => sum + time,
          0
        );
        avgBlockTime = Math.round(totalBlockTime / validBlockTimes.length);
      }
    }

    // Helper function to process views (handle "K" suffix)
    const processViewsForPlatform = (viewsStr) => {
      if (!viewsStr || viewsStr === "0") return 0;
      const upperViews = viewsStr.toUpperCase();
      // Handle "K" suffix (e.g., "1.5K" = 1500) and comma separators (e.g., "1,000" = 1000)
      if (upperViews.includes("K")) {
        const num = parseFloat(upperViews.replace(/[K,]/g, "")) || 0;
        return num * 1000;
      }
      return parseFloat(viewsStr.replace(/,/g, "")) || 0;
    };

    // Find top platform (platform with most violations)
    const platformStats = {};
    violations.forEach((v) => {
      if (!platformStats[v.platformId]) {
        platformStats[v.platformId] = {
          id: v.platformId,
          name: v.platformName,
          count: 0,
        };
      }
      platformStats[v.platformId].count++;
    });
    const topPlatform =
      Object.values(platformStats).length > 0
        ? Object.values(platformStats).reduce((top, current) =>
            current.count > top.count ? current : top
          )
        : null;

    // Calculate detailed platform statistics for all platforms
    const platformDetails = {};
    const platformMatchSet = {}; // Track unique matches per platform

    violations.forEach((v) => {
      const platformId = v.platformId;
      const platformName = v.platformName || platformId;

      if (!platformDetails[platformId]) {
        platformDetails[platformId] = {
          id: platformId,
          name: platformName,
          violations: 0,
          views: 0,
          statusBreakdown: {
            active: 0,
            blocked: 0,
            removed: 0,
            underReview: 0,
          },
          contentSplit: {
            live: { violations: 0, views: 0 },
            highlights: { violations: 0, views: 0 },
            others: { violations: 0, views: 0 },
          },
          blockedViolations: [],
          totalBlockTime: 0,
          matchesAffected: new Set(),
        };
        platformMatchSet[platformId] = new Set();
      }

      const platform = platformDetails[platformId];
      platform.violations++;
      platform.views += processViewsForPlatform(v.views);

      // Track unique matches
      const matchIdStr = v.matchId.toString();
      platformMatchSet[platformId].add(matchIdStr);

      // Status breakdown
      const statusLower = (v.status || "").toLowerCase();
      if (statusLower === "active") {
        platform.statusBreakdown.active++;
      } else if (statusLower === "blocked") {
        platform.statusBreakdown.blocked++;
        if (v.blockedAt && v.timeAdded) {
          platform.blockedViolations.push({
            blockedAt: v.blockedAt,
            timeAdded: v.timeAdded,
          });
        }
      } else if (statusLower === "removed") {
        platform.statusBreakdown.removed++;
      } else if (statusLower === "under review") {
        platform.statusBreakdown.underReview++;
      }

      // Content type breakdown
      // Enum values are: "Live", "Highlights", "Other" (exact case)
      const contentType = (v.contentType || "").trim();

      if (contentType === "Live") {
        platform.contentSplit.live.violations++;
        platform.contentSplit.live.views += processViewsForPlatform(v.views);
      } else if (contentType === "Highlights") {
        platform.contentSplit.highlights.violations++;
        platform.contentSplit.highlights.views += processViewsForPlatform(
          v.views
        );
      } else {
        // "Other" or anything else goes to others
        platform.contentSplit.others.violations++;
        platform.contentSplit.others.views += processViewsForPlatform(v.views);
      }
    });

    // Calculate success rates, avg block times, and matches affected
    const platformsArray = Object.values(platformDetails).map((platform) => {
      const totalBlocked =
        platform.statusBreakdown.blocked + platform.statusBreakdown.removed;
      const successRate =
        platform.violations > 0
          ? Math.round((totalBlocked / platform.violations) * 100)
          : 0;

      // Calculate average block time
      let avgBlockTime = 0;
      if (platform.blockedViolations.length > 0) {
        const validBlockTimes = [];
        platform.blockedViolations.forEach((v) => {
          if (v.timeAdded && v.blockedAt) {
            const timeAdded = new Date(v.timeAdded);
            const blockedAt = new Date(v.blockedAt);

            // Validate dates are valid
            if (!isNaN(timeAdded.getTime()) && !isNaN(blockedAt.getTime())) {
              const diffMs = blockedAt.getTime() - timeAdded.getTime();
              const diffMinutes = diffMs / 60000;

              // Only include reasonable block times (between 0 and 7 days = 10080 minutes)
              // This prevents absurd values from bad data
              if (diffMinutes >= 0 && diffMinutes <= 10080) {
                validBlockTimes.push(diffMinutes);
              }
            }
          }
        });

        if (validBlockTimes.length > 0) {
          const totalBlockTime = validBlockTimes.reduce(
            (sum, time) => sum + time,
            0
          );
          avgBlockTime = Math.round(totalBlockTime / validBlockTimes.length);
        }
      }

      return {
        id: platform.id,
        name: platform.name,
        violations: platform.violations,
        views: platform.views,
        successRate: successRate,
        avgBlockTime: avgBlockTime,
        statusBreakdown: platform.statusBreakdown,
        contentSplit: platform.contentSplit,
        matchesAffected: platformMatchSet[platform.id].size,
      };
    });

    // Sort platforms by violations (descending)
    platformsArray.sort((a, b) => b.violations - a.violations);

    // Find top match (match with most violations)
    const matchViolationCounts = {};
    violations.forEach((v) => {
      const matchIdStr = v.matchId.toString();
      if (!matchViolationCounts[matchIdStr]) {
        matchViolationCounts[matchIdStr] = {
          matchId: v.matchId,
          count: 0,
        };
      }
      matchViolationCounts[matchIdStr].count++;
    });
    const topMatchData =
      Object.values(matchViolationCounts).length > 0
        ? Object.values(matchViolationCounts).reduce((top, current) =>
            current.count > top.count ? current : top
          )
        : null;

    // Get top match details with platform breakdown
    let topMatch = null;
    if (topMatchData) {
      const match = await Match.findById(topMatchData.matchId)
        .select("team1 team2 week date externalMatchId")
        .lean();
      if (match) {
        // Get violations for this match
        const matchViolations = await Violation.find({
          matchId: topMatchData.matchId,
        }).lean();

        // Calculate total views
        const processViews = (viewsStr) => {
          if (!viewsStr || viewsStr === "0") return 0;
          const upperViews = viewsStr.toUpperCase();
          // Handle "K" suffix (e.g., "1.5K" = 1500) and comma separators (e.g., "1,000" = 1000)
          if (upperViews.includes("K")) {
            const num = parseFloat(upperViews.replace(/[K,]/g, "")) || 0;
            return num * 1000;
          }
          return parseFloat(viewsStr.replace(/,/g, "")) || 0;
        };

        const totalViews = matchViolations.reduce(
          (sum, v) => sum + processViews(v.views),
          0
        );

        // Aggregate by platform
        const platformBreakdown = {};
        matchViolations.forEach((v) => {
          const platformId = v.platformId;
          const platformName = v.platformName || platformId;
          if (!platformBreakdown[platformId]) {
            platformBreakdown[platformId] = {
              name: platformName,
              violations: 0,
              views: 0,
              blocked: 0,
            };
          }
          platformBreakdown[platformId].violations++;
          platformBreakdown[platformId].views += processViews(v.views);
          if (
            v.status === "Blocked" ||
            v.status === "blocked" ||
            v.status === "Removed" ||
            v.status === "removed"
          ) {
            platformBreakdown[platformId].blocked++;
          }
        });

        // Convert to array and calculate success rates
        const platforms = Object.values(platformBreakdown).map((platform) => ({
          name: platform.name,
          violations: platform.violations,
          views: platform.views,
          successRate:
            platform.violations > 0
              ? Math.round((platform.blocked / platform.violations) * 100)
              : 0,
        }));

        topMatch = {
          teams: `${match.team1} vs ${match.team2}`,
          week: match.week,
          violations: topMatchData.count,
          totalViews: totalViews,
          externalMatchId: match.externalMatchId,
          platforms: platforms,
        };
      }
    }

    // Calculate match statistics
    const matchStats = await Match.aggregate([
      {
        $match: matchQuery,
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    let totalMatches = 0;
    let completedMatches = 0;
    let liveMatches = 0;
    let upcomingMatches = 0;
    let postponedMatches = 0;

    matchStats.forEach((stat) => {
      const status = stat._id;
      const count = stat.count;
      totalMatches += count;

      if (status === "finished") {
        completedMatches += count;
      } else if (status === "live") {
        liveMatches += count;
      } else if (status === "upcoming" || status === "scheduled") {
        upcomingMatches += count;
      } else if (status === "postponed") {
        postponedMatches += count;
      }
    });

    // Process views manually to handle "K" suffix and comma separators
    const processViews = (viewsStr) => {
      if (!viewsStr || viewsStr === "0") return 0;
      const upperViews = viewsStr.toUpperCase();
      // Handle "K" suffix (e.g., "1.5K" = 1500) and comma separators (e.g., "1,000" = 1000)
      if (upperViews.includes("K")) {
        const num = parseFloat(upperViews.replace(/[K,]/g, "")) || 0;
        return num * 1000;
      }
      return parseFloat(viewsStr.replace(/,/g, "")) || 0;
    };

    // Calculate content split statistics (Live, Highlights, Others)
    const contentSplitStats = await Violation.aggregate([
      {
        $match: {
          matchId: { $in: matchIds },
        },
      },
      {
        $group: {
          _id: "$contentType",
          violations: { $sum: 1 },
          viewsArray: { $push: "$views" },
        },
      },
    ]);

    // Format content split data
    const contentSplit = {
      live: { views: 0, violations: 0 },
      highlights: { views: 0, violations: 0 },
      others: { views: 0, violations: 0 },
    };

    contentSplitStats.forEach((stat) => {
      // Enum values are: "Live", "Highlights", "Other" (exact case from aggregation)
      const contentType = (stat._id || "").trim();
      const totalViews = stat.viewsArray.reduce(
        (sum, v) => sum + processViews(v),
        0
      );

      if (contentType === "Live") {
        contentSplit.live.views = totalViews;
        contentSplit.live.violations = stat.violations || 0;
      } else if (contentType === "Highlights") {
        contentSplit.highlights.views = totalViews;
        contentSplit.highlights.violations = stat.violations || 0;
      } else {
        // "Other" or anything else goes to others
        contentSplit.others.views = totalViews;
        contentSplit.others.violations = stat.violations || 0;
      }
    });

    // Calculate matches leaderboard - get matches with violation counts and views
    const matchesLeaderboard = await Violation.aggregate([
      {
        $match: {
          matchId: { $in: matchIds },
        },
      },
      {
        $group: {
          _id: "$matchId",
          violations: { $sum: 1 },
          views: {
            $push: "$views",
          },
        },
      },
    ]);

    // Create a map of matchId to violation stats
    const matchStatsMap = new Map();
    matchesLeaderboard.forEach((stat) => {
      const totalViews = stat.views.reduce(
        (sum, v) => sum + processViews(v),
        0
      );
      matchStatsMap.set(stat._id.toString(), {
        violations: stat.violations,
        totalViews: totalViews,
      });
    });

    // Build matches array with stats, sorted by violations descending
    const matchesWithStats = matches
      .map((match) => {
        const stats = matchStatsMap.get(match._id.toString()) || {
          violations: 0,
          totalViews: 0,
        };
        return {
          id: match.externalMatchId,
          description: match.description || `${match.team1} vs ${match.team2}`,
          week: match.week,
          status: match.status,
          violations: stats.violations,
          totalViews: stats.totalViews,
        };
      })
      .sort((a, b) => b.violations - a.violations);

    res.json({
      totalViolations,
      blocked,
      stillActive,
      removed,
      underReview,
      totalViews,
      avgBlockTime,
      topPlatform: topPlatform
        ? {
            id: topPlatform.id,
            name: topPlatform.name,
            violations: topPlatform.count,
          }
        : null,
      topMatch,
      matchStats: {
        total: totalMatches,
        completed: completedMatches,
        live: liveMatches,
        upcoming: upcomingMatches,
        postponed: postponedMatches,
      },
      contentSplit,
      platforms: platformsArray,
      matches: matchesWithStats,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/matches/:externalMatchId/stats - Get match statistics
router.get("/:externalMatchId/stats", async (req, res) => {
  try {
    const match = await Match.findOne({
      externalMatchId: req.params.externalMatchId,
      isDeleted: { $ne: true },
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
      const viewsStr = v.views || "0";
      // Handle "K" suffix (e.g., "1.5K" = 1500) and comma separators (e.g., "1,000" = 1000)
      if (viewsStr.includes("K") || viewsStr.includes("k")) {
        const num = parseFloat(viewsStr.replace(/[Kk,]/g, "")) || 0;
        return sum + num * 1000;
      }
      return sum + (parseFloat(viewsStr.replace(/,/g, "")) || 0);
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
