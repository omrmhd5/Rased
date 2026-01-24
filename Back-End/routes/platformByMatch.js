import express from "express";
import PlatformByMatch from "../models/PlatformByMatch.js";
import Match from "../models/Match.js";
import Platform from "../models/Platform.js";
import { updateMatchAggregatedStats } from "../utils/platformStatsHelper.js";

const router = express.Router();

// GET /api/platform-by-match - Get platform stats for a match
// Query params: matchId (externalMatchId) and optionally platformId
router.get("/", async (req, res) => {
  try {
    const { matchId, platformId } = req.query;

    if (!matchId) {
      return res
        .status(400)
        .json({ error: "matchId (externalMatchId) is required" });
    }

    // Find match by externalMatchId
    const match = await Match.findOne({ externalMatchId: matchId });
    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    const query = {
      matchId: match._id,
      externalMatchId: matchId,
    };

    if (platformId) {
      query.platformId = platformId;
    }

    const stats = await PlatformByMatch.find(query).lean();

    res.json(platformId ? stats[0] || null : stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/platform-by-match/match/:externalMatchId - Get all platform stats for a match
router.get("/match/:externalMatchId", async (req, res) => {
  try {
    const { externalMatchId } = req.params;

    const match = await Match.findOne({ externalMatchId });
    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    const stats = await PlatformByMatch.find({
      matchId: match._id,
      externalMatchId,
    }).lean();

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST/PUT /api/platform-by-match - Create or update platform stats
router.post("/", async (req, res) => {
  try {
    const {
      platformId,
      externalMatchId,
      liveCount,
      highlightsCount,
      othersCount,
      totalViews,
      totalViolations,
      activeCount,
      blockedCount,
      removedCount,
      underReviewCount,
      avgBlockTime,
      blockSuccessRate,
    } = req.body;

    if (!platformId || !externalMatchId) {
      return res.status(400).json({
        error: "platformId and externalMatchId are required",
      });
    }

    // Find match by externalMatchId
    const match = await Match.findOne({ externalMatchId });
    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    // Find platform by id
    const platform = await Platform.findOne({ id: platformId });
    const platformObjectId = platform ? platform._id : null;

    // Find or create platform stats
    const stats = await PlatformByMatch.findOneAndUpdate(
      {
        platformId,
        externalMatchId,
      },
      {
        platformId,
        platformObjectId,
        matchId: match._id,
        externalMatchId,
        liveCount: liveCount ?? 0,
        highlightsCount: highlightsCount ?? 0,
        othersCount: othersCount ?? 0,
        totalViews: totalViews ?? 0,
        totalViolations: totalViolations ?? 0,
        activeCount: activeCount ?? 0,
        blockedCount: blockedCount ?? 0,
        removedCount: removedCount ?? 0,
        underReviewCount: underReviewCount ?? 0,
        avgBlockTime: avgBlockTime ?? 0,
        blockSuccessRate: blockSuccessRate ?? 0,
      },
      {
        new: true,
        upsert: true,
      },
    );

    // Update aggregated stats on Match
    await updateMatchAggregatedStats(externalMatchId);

    res.json(stats);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/platform-by-match/:id - Update specific platform stats
router.put("/:id", async (req, res) => {
  try {
    const {
      liveCount,
      highlightsCount,
      othersCount,
      totalViews,
      totalViolations,
      activeCount,
      blockedCount,
      removedCount,
      underReviewCount,
      avgBlockTime,
      blockSuccessRate,
    } = req.body;

    const stats = await PlatformByMatch.findById(req.params.id);

    if (!stats) {
      return res.status(404).json({ error: "Platform stats not found" });
    }

    // Update only provided fields
    if (liveCount !== undefined) stats.liveCount = liveCount;
    if (highlightsCount !== undefined) stats.highlightsCount = highlightsCount;
    if (othersCount !== undefined) stats.othersCount = othersCount;
    if (totalViews !== undefined) stats.totalViews = totalViews;
    if (totalViolations !== undefined) stats.totalViolations = totalViolations;
    if (activeCount !== undefined) stats.activeCount = activeCount;
    if (blockedCount !== undefined) stats.blockedCount = blockedCount;
    if (removedCount !== undefined) stats.removedCount = removedCount;
    if (underReviewCount !== undefined)
      stats.underReviewCount = underReviewCount;
    if (avgBlockTime !== undefined) stats.avgBlockTime = avgBlockTime;
    if (blockSuccessRate !== undefined)
      stats.blockSuccessRate = blockSuccessRate;

    const updatedStats = await stats.save();

    // Update aggregated stats on Match
    await updateMatchAggregatedStats(updatedStats.externalMatchId);

    res.json(updatedStats);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid stats ID" });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/platform-by-match/:id - Delete platform stats
router.delete("/:id", async (req, res) => {
  try {
    const stats = await PlatformByMatch.findById(req.params.id);

    if (!stats) {
      return res.status(404).json({ error: "Platform stats not found" });
    }

    const externalMatchId = stats.externalMatchId;

    await PlatformByMatch.findByIdAndDelete(req.params.id);

    // Update aggregated stats on Match
    await updateMatchAggregatedStats(externalMatchId);

    res.json({ message: "Platform stats deleted successfully" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid stats ID" });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
