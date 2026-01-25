import express from "express";
import Violation from "../models/Violation.js";
import Match from "../models/Match.js";
import Competition from "../models/Competition.js";
import DeletedViolationLog from "../models/DeletedViolationLog.js";
import User from "../models/User.js";
import BulkViolation from "../models/BulkViolation.js";
import PlatformByMatch from "../models/PlatformByMatch.js";
import { optionalAuth, authenticateToken } from "../middleware/auth.js";
import { logViolationChange } from "../utils/violationLogger.js";
import { emitViolationEvent, emitBulkEvent } from "../utils/socket.js";
import {
  createBulkViolation,
  updateBulkViolationStats,
  deleteBulkViolation,
} from "../utils/bulkViolationHelper.js";
import {
  updatePlatformStats,
  updateMatchAggregatedStats,
} from "../utils/platformStatsHelper.js";

// Middleware to check if user is superAdmin or employee (not viewer)
const requireSuperAdminOrEmployee = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.role === "viewer") {
      return res
        .status(403)
        .json({ error: "Access denied. Viewers cannot modify violations." });
    }
    // Allow superAdmin and employee
    if (user.role !== "superAdmin" && user.role !== "employee") {
      return res.status(403).json({ error: "Access denied." });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const router = express.Router();

// Apply optional auth to all routes (logs user if authenticated, otherwise uses "System")
router.use(optionalAuth);

// GET /api/violations/bulk - Get all bulk violations with filters
router.get("/bulk", async (req, res) => {
  try {
    const { matchId, platformId, bulkId, limit, sort } = req.query;

    const query = {};

    if (bulkId) {
      query.bulkId = bulkId;
    }

    if (matchId) {
      // Check if matchId is an externalMatchId or internal _id
      const match = await Match.findOne({ externalMatchId: matchId });
      if (match) {
        query.matchId = match._id;
      } else {
        query.matchId = matchId;
      }
    }

    if (platformId) {
      query.platformId = platformId;
    }

    const limitNum = limit ? parseInt(limit) : 100;
    const sortOrder = sort === "asc" ? 1 : -1;

    const bulkViolations = await BulkViolation.find(query)
      .populate(
        "matchId",
        "team1 team2 date time week competition stadium externalMatchId league description",
      )
      .populate("createdBy", "username email")
      .sort({ timeAdded: sortOrder })
      .limit(limitNum)
      .lean();

    res.json(bulkViolations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/violations/bulk/:bulkId - Get single bulk violation with detailed stats
router.get("/bulk/:bulkId", async (req, res) => {
  try {
    const { bulkId } = req.params;

    const bulkViolation = await BulkViolation.findOne({ bulkId })
      .populate(
        "matchId",
        "team1 team2 date time week competition stadium externalMatchId league description",
      )
      .populate("createdBy", "username email")
      .populate({
        path: "violationIds",
        select:
          "violationUrl status contentType views timeAdded blockedAt notes auditLog",
      })
      .lean();

    if (!bulkViolation) {
      return res.status(404).json({ error: "Bulk violation not found" });
    }

    res.json(bulkViolation);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid bulk ID" });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/violations/bulk/:bulkId/status - Update status for all violations in a bulk
router.patch(
  "/bulk/:bulkId/status",
  authenticateToken,
  requireSuperAdminOrEmployee,
  async (req, res) => {
    try {
      const { bulkId } = req.params;
      const { status, blockedAt } = req.body;

      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      // Find the bulk violation to get matchId
      const bulkViolation = await BulkViolation.findOne({ bulkId });
      if (!bulkViolation) {
        return res.status(404).json({ error: "Bulk violation not found" });
      }

      // Normalize status
      const normalizedStatus =
        status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      const finalNormalizedStatus =
        normalizedStatus === "Under review" ? "Under Review" : normalizedStatus;
      const validStatuses = ["Active", "Blocked", "Removed", "Under Review"];

      if (!validStatuses.includes(finalNormalizedStatus)) {
        return res.status(400).json({ error: "Invalid status value" });
      }

      // Find all violations with this bulkId
      const violations = await Violation.find({ bulkId });

      // Update each violation
      const updatePromises = violations.map(async (violation) => {
        const oldStatus = violation.status; // Store the old status BEFORE updating

        violation.status = finalNormalizedStatus;

        // Handle blockedAt based on status
        const statusLower = finalNormalizedStatus.toLowerCase();
        if (statusLower === "blocked") {
          violation.blockedAt = blockedAt ? new Date(blockedAt) : new Date();
        } else if (
          statusLower === "active" ||
          statusLower === "under review" ||
          statusLower === "removed"
        ) {
          violation.blockedAt = undefined;
        }

        // Save the violation
        const updatedViolation = await violation.save();

        // Log the change
        await logViolationChange(violation._id, "status_changed", {
          user: req.user,
          field: "status",
          oldValue: oldStatus,
          newValue: finalNormalizedStatus,
          changes: { bulkId },
        });

        return updatedViolation;
      });

      const updatedViolations = await Promise.all(updatePromises);

      // Get the old status from the bulk violation for audit log
      const oldBulkStatus = violations.length > 0 ? violations[0].status : null;

      // Update bulk violation stats
      await updateBulkViolationStats(bulkId);

      // Add audit log entry for bulk status change
      const updatedBulkViolation = await BulkViolation.findOne({ bulkId });
      if (updatedBulkViolation) {
        updatedBulkViolation.auditLog.push({
          action: "status_changed",
          userId: req.user?.userId,
          userName: req.user?.username || "System",
          timestamp: new Date(),
          oldValue: oldBulkStatus, // Old status before change
          newValue: finalNormalizedStatus, // New status after change
        });
        await updatedBulkViolation.save();
      }

      // Update platform and match stats (cascade handles both)
      await updatePlatformStats(
        bulkViolation.matchId,
        bulkViolation.platformId,
      );

      // Emit bulk status changed event
      try {
        const emitMatchId =
          bulkViolation.externalMatchId || bulkViolation.matchId;
        emitBulkEvent(emitMatchId, "bulk-status-changed", {
          bulkId,
          newStatus: finalNormalizedStatus,
          count: updatedViolations.length,
          platformId: bulkViolation.platformId,
        });
        // Also emit as violation-updated with bulk flag
        emitViolationEvent(emitMatchId, "violation-updated", {
          isBulk: true,
          bulkId,
          status: finalNormalizedStatus,
          count: updatedViolations.length,
          platformId: bulkViolation.platformId,
        });
      } catch (error) {
        // Silently fail on event emission
      }

      res.json({
        bulkId,
        count: updatedViolations.length,
        status: finalNormalizedStatus,
      });
    } catch (error) {
      if (error.name === "CastError") {
        return res.status(400).json({ error: "Invalid bulk ID" });
      }
      res.status(500).json({ error: error.message });
    }
  },
);

// GET /api/violations/bulk/:bulkId/violations - Get violations for a specific bulk with pagination
router.get("/bulk/:bulkId/violations", async (req, res) => {
  try {
    const { bulkId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Convert to numbers
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const totalCount = await Violation.countDocuments({ bulkId });

    // Get paginated violations
    const violations = await Violation.find({ bulkId })
      .sort({ timeAdded: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.json({
      violations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        hasMore: skip + violations.length < totalCount,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/violations/bulk/:bulkId - Delete all violations in a bulk
router.delete(
  "/bulk/:bulkId",
  authenticateToken,
  requireSuperAdminOrEmployee,
  async (req, res) => {
    try {
      const { bulkId } = req.params;

      // Find the bulk violation to get metadata
      const bulkViolation = await BulkViolation.findOne({ bulkId });
      if (!bulkViolation) {
        return res.status(404).json({ error: "Bulk violation not found" });
      }

      // Find all violations with this bulkId
      const violations = await Violation.find({ bulkId });

      // Delete each violation and log it
      for (const violation of violations) {
        // Save deleted violation log
        let externalMatchId = violation.externalMatchId;
        if (!externalMatchId && violation.matchId) {
          const match = await Match.findById(violation.matchId);
          if (match) {
            externalMatchId = match.externalMatchId;
          }
        }

        await DeletedViolationLog.create({
          externalMatchId: externalMatchId || null,
          action: "deleted",
          userId: req.user ? req.user.userId : null,
          userName: req.user ? req.user.username : "System",
          timestamp: new Date(),
          changes: {
            platformId: violation.platformId,
            platformName: violation.platformName,
            accountChannel: violation.accountChannel,
            status: violation.status,
            views: violation.views || "0",
            violationUrl: violation.violationUrl,
            bulkId: bulkId,
          },
        });

        // Log deletion
        await logViolationChange(violation._id, "deleted", {
          user: req.user,
          initialData: {
            violationUrl: violation.violationUrl,
            accountChannel: violation.accountChannel,
            status: violation.status,
          },
          changes: { bulkId },
        });

        // Delete the violation
        await Violation.findByIdAndDelete(violation._id);
      }

      // Delete the bulk violation entry
      await deleteBulkViolation(bulkId);

      // Update platform and match stats (cascade handles both)
      await updatePlatformStats(
        bulkViolation.matchId,
        bulkViolation.platformId,
      );

      // Emit bulk deleted event
      try {
        const emitMatchId =
          bulkViolation.externalMatchId || bulkViolation.matchId;
        emitBulkEvent(emitMatchId, "bulk-deleted", {
          bulkId,
          count: violations.length,
          platformId: bulkViolation.platformId,
        });
        // Also emit as violation-deleted with bulk flag
        emitViolationEvent(emitMatchId, "violation-deleted", {
          isBulk: true,
          bulkId,
          count: violations.length,
          platformId: bulkViolation.platformId,
        });
      } catch (error) {
        // Silently fail on event emission
      }

      res.json({
        message: "Bulk violations deleted successfully",
        bulkId,
        count: violations.length,
      });
    } catch (error) {
      if (error.name === "CastError") {
        return res.status(400).json({ error: "Invalid bulk ID" });
      }
      res.status(500).json({ error: error.message });
    }
  },
);

// GET /api/violations - Get all violations with filters
router.get("/", async (req, res) => {
  try {
    const {
      matchId,
      platformId,
      status,
      type,
      search,
      limit,
      sort,
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

    // Build match query for league/week/stage filtering
    const matchQuery = {};
    let leagueInfo = null;
    if (league) {
      // Check if league exists in database
      leagueInfo = await Competition.findOne({ league: league }).lean();
      if (leagueInfo) {
        matchQuery.league = league;
        matchQuery.isDeleted = { $ne: true };
      }
    }

    // For Cups, use stage filtering; for regular leagues, use week filtering
    // Check competitionType from database
    const isSuperCup = leagueInfo?.competitionType === "cup";

    if (isSuperCup) {
      // Stage filtering for Super Cups
      if (stageFilter === "single" && stage) {
        matchQuery.stage = stage;
      } else if (stageFilter === "range" && stageStart && stageEnd) {
        // For range, we need to get all stages between start and end
        // Since stages are strings, we'll need to fetch all matches and filter by stage names
        // For now, we'll use $in with the provided stages
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
          (_, i) => (startWeek + i).toString(),
        );
        matchQuery.week = { $in: weekArray };
      }
    }

    // Find matching matches first if league/week filters are provided
    let matchIds = null;
    if (Object.keys(matchQuery).length > 0) {
      const matches = await Match.find(matchQuery).select("_id").lean();
      matchIds = matches.map((m) => m._id);
      if (matchIds.length === 0) {
        return res.json([]);
      }
    }

    const query = {};

    if (matchId) {
      // Check if matchId is an externalMatchId or internal _id
      // Try to find match by externalMatchId first
      const match = await Match.findOne({ externalMatchId: matchId });
      if (match) {
        query.matchId = match._id;
      } else {
        // If not found by externalMatchId, assume it's an internal _id
        query.matchId = matchId;
      }
    } else if (matchIds !== null) {
      // Use matchIds from league/week filter
      query.matchId = { $in: matchIds };
    }

    if (platformId) {
      query.platformId = platformId;
    }

    if (status) {
      query.status = status;
    }

    if (type) {
      query.contentType = type;
    }

    if (search) {
      query.$or = [
        { violationUrl: { $regex: search, $options: "i" } },
        { accountChannel: { $regex: search, $options: "i" } },
      ];
    }

    // IMPORTANT: Only return violations WITHOUT bulkId (single violations)
    // Bulk violations should be fetched via /api/violations/bulk endpoint
    query.bulkId = { $exists: false };

    const sortOrder = sort === "asc" ? 1 : -1;

    // Apply limit only if explicitly provided, otherwise fetch all
    let violationsQuery = Violation.find(query)
      .populate(
        "matchId",
        "team1 team2 date time week competition stadium externalMatchId league description",
      )
      .sort({ timeAdded: sortOrder });

    if (limit) {
      const limitNum = parseInt(limit);
      violationsQuery = violationsQuery.limit(limitNum);
    }

    const violations = await violationsQuery.lean();

    res.json(violations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/violations/deleted-logs/:externalMatchId - Get deleted violation logs for a match
// IMPORTANT: This route must come BEFORE /:id to avoid route conflicts
router.get("/deleted-logs/:externalMatchId", async (req, res) => {
  try {
    const { externalMatchId } = req.params;

    // Query by externalMatchId directly (match might be deleted)
    const deletedLogs = await DeletedViolationLog.find({
      externalMatchId: externalMatchId,
    })
      .sort({ timestamp: -1 })
      .lean();

    res.json(deletedLogs);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid match ID" });
    }
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

// DELETE /api/violations/deleted-logs/:logId - Delete a deleted violation log entry (superAdmin only)
router.delete(
  "/deleted-logs/:logId",
  authenticateToken,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { logId } = req.params;

      const deletedLog = await DeletedViolationLog.findByIdAndDelete(logId);

      if (!deletedLog) {
        return res.status(404).json({ error: "Deleted log entry not found" });
      }

      res.json({ message: "Deleted log entry removed successfully" });
    } catch (error) {
      if (error.name === "CastError") {
        return res.status(400).json({ error: "Invalid log ID" });
      }
      res.status(500).json({ error: error.message });
    }
  },
);

// DELETE /api/violations/:violationId/audit-log/:logEntryId - Delete an audit log entry from a violation (superAdmin only)
router.delete(
  "/:violationId/audit-log/:logEntryId",
  authenticateToken,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { violationId, logEntryId } = req.params;

      const violation = await Violation.findById(violationId);

      if (!violation) {
        return res.status(404).json({ error: "Violation not found" });
      }

      // Remove the audit log entry
      violation.auditLog = violation.auditLog.filter(
        (entry) => entry._id.toString() !== logEntryId,
      );

      await violation.save();

      res.json({ message: "Audit log entry removed successfully" });
    } catch (error) {
      if (error.name === "CastError") {
        return res
          .status(400)
          .json({ error: "Invalid violation or log entry ID" });
      }
      res.status(500).json({ error: error.message });
    }
  },
);

// GET /api/violations/problematic-accounts - Get most problematic accounts/channels
// IMPORTANT: This route must be defined BEFORE /:id route to avoid route conflicts
router.get("/problematic-accounts", async (req, res) => {
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
      limit,
      platformId,
    } = req.query;

    // Validate limit
    const limitNum = limit ? parseInt(limit) : 50;
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      return res.status(400).json({
        error: "Invalid limit. Must be between 1 and 1000.",
        received: limit,
      });
    }

    // Build match filter based on league and week/stage
    const matchFilter = { isDeleted: { $ne: true } };
    let leagueInfo = null;
    if (league && league !== "all" && league !== "null") {
      // Check if league exists in database
      leagueInfo = await Competition.findOne({ league: league }).lean();
      if (!leagueInfo) {
        return res.status(400).json({
          error: `Invalid league. League '${league}' not found in database.`,
        });
      }
      matchFilter.league = league;
    }

    // For Cups, use stage filtering; for regular leagues, use week filtering
    // Check competitionType from database
    const isSuperCup = leagueInfo?.competitionType === "cup";

    if (isSuperCup) {
      // Stage filtering for Super Cups
      if (stageFilter === "single" && stage) {
        matchFilter.stage = stage;
      } else if (stageFilter === "range" && stageStart && stageEnd) {
        // For range, we'll use $in with the provided stages
        const stages = [stageStart, stageEnd];
        matchFilter.stage = { $in: stages };
      }
    } else {
      // Week filtering for regular leagues
      if (weekFilter === "single" && week) {
        matchFilter.week = week.toString();
      } else if (weekFilter === "range" && weekStart && weekEnd) {
        const startNum = parseInt(weekStart);
        const endNum = parseInt(weekEnd);
        if (
          isNaN(startNum) ||
          isNaN(endNum) ||
          startNum < 1 ||
          endNum < 1 ||
          startNum > endNum
        ) {
          return res.status(400).json({
            error:
              "Invalid week range. Start must be <= end and both must be >= 1.",
          });
        }
        const weekNumbers = [];
        for (let w = startNum; w <= endNum; w++) {
          weekNumbers.push(w.toString());
        }
        matchFilter.week = { $in: weekNumbers };
      }
    }

    // Get matches that match the filter
    const matches = await Match.find(matchFilter)
      .select("_id externalMatchId")
      .lean();
    const matchIds = matches.map((m) => m._id);

    // If no matches found, return empty array
    if (matchIds.length === 0) {
      return res.json([]);
    }

    // Helper function to process views (same as dashboard stats)
    const processViews = (viewsStr) => {
      if (!viewsStr || viewsStr === "0") return 0;
      // Handle "K" suffix (e.g., "1.5K" = 1500)
      if (viewsStr.includes("K") || viewsStr.includes("k")) {
        const num = parseFloat(viewsStr.replace(/[Kk,]/g, "")) || 0;
        return num * 1000;
      }
      return parseFloat(viewsStr.replace(/,/g, "")) || 0;
    };

    // Build violation match filter
    const violationMatchFilter = {
      matchId: { $in: matchIds },
    };

    // Add platform filter if provided
    if (platformId && platformId !== "all") {
      violationMatchFilter.platformId = platformId;
    }

    // Aggregate violations by accountChannel and platform
    const problematicAccountsRaw = await Violation.aggregate([
      {
        $match: violationMatchFilter,
      },
      {
        $group: {
          _id: {
            accountChannel: "$accountChannel",
            platformName: "$platformName",
            platformId: "$platformId",
          },
          totalViolations: { $sum: 1 },
          viewsArray: { $push: "$views" },
          activeCount: {
            $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] },
          },
          blockedCount: {
            $sum: { $cond: [{ $eq: ["$status", "Blocked"] }, 1, 0] },
          },
          removedCount: {
            $sum: { $cond: [{ $eq: ["$status", "Removed"] }, 1, 0] },
          },
          underReviewCount: {
            $sum: { $cond: [{ $eq: ["$status", "Under Review"] }, 1, 0] },
          },
          liveCount: {
            $sum: { $cond: [{ $eq: ["$contentType", "Live"] }, 1, 0] },
          },
          highlightsCount: {
            $sum: { $cond: [{ $eq: ["$contentType", "Highlights"] }, 1, 0] },
          },
          othersCount: {
            $sum: { $cond: [{ $eq: ["$contentType", "Other"] }, 1, 0] },
          },
          matchesAffected: { $addToSet: "$matchId" },
          latestViolation: { $max: "$timeAdded" },
        },
      },
      {
        $project: {
          accountChannel: "$_id.accountChannel",
          platformName: "$_id.platformName",
          platformId: "$_id.platformId",
          totalViolations: 1,
          viewsArray: 1,
          activeCount: 1,
          blockedCount: 1,
          removedCount: 1,
          underReviewCount: 1,
          liveCount: 1,
          highlightsCount: 1,
          othersCount: 1,
          matchesAffected: { $size: "$matchesAffected" },
          latestViolation: 1,
        },
      },
      {
        $sort: { totalViolations: -1 },
      },
      {
        $limit: limitNum,
      },
    ]);

    // Process views in JavaScript (simpler and more reliable)
    const problematicAccounts = problematicAccountsRaw.map((account) => {
      const totalViews = account.viewsArray.reduce(
        (sum, viewsStr) => sum + processViews(viewsStr),
        0,
      );
      return {
        ...account,
        totalViews,
        viewsArray: undefined, // Remove from response
      };
    });

    res.json(problematicAccounts);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// GET /api/violations/:id - Get single violation
router.get("/:id", async (req, res) => {
  try {
    const violation = await Violation.findById(req.params.id).populate(
      "matchId",
      "team1 team2 date time week competition stadium externalMatchId",
    );

    if (!violation) {
      return res.status(404).json({ error: "Violation not found" });
    }

    res.json(violation);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid violation ID" });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/violations - Create new violation (superAdmin and employee only)
router.post(
  "/",
  authenticateToken,
  requireSuperAdminOrEmployee,
  async (req, res) => {
    try {
      const {
        matchId,
        matchName,
        platformId,
        platformName,
        violationUrl,
        accountChannel,
        contentType,
        status,
        views,
        timeAdded,
        blockedAt,
        active,
        notes,
      } = req.body;

      // Required fields validation
      if (
        !matchId ||
        !matchName ||
        !platformId ||
        !platformName ||
        !violationUrl ||
        !accountChannel ||
        !contentType
      ) {
        return res.status(400).json({
          error:
            "Missing required fields: matchId, matchName, platformId, platformName, violationUrl, accountChannel, contentType",
        });
      }

      // Verify match exists - support both externalMatchId and internal _id
      let match = await Match.findById(matchId).catch(() => null);

      // If not found by _id, try externalMatchId
      if (!match) {
        match = await Match.findOne({ externalMatchId: matchId });
      }

      if (!match) {
        return res.status(404).json({ error: "Match not found" });
      }

      // Use the match's internal _id for the violation
      const internalMatchId = match._id;
      const externalMatchId = match.externalMatchId || null;

      // Convert notes to array if it's a string
      let notesArray = [];
      if (notes) {
        if (typeof notes === "string") {
          notesArray = notes.trim() ? [notes.trim()] : [];
        } else if (Array.isArray(notes)) {
          notesArray = notes.filter((n) => n && n.trim());
        }
      }

      // Handle blockedAt - set it if provided, or based on status
      let blockedAtValue = undefined;
      const finalStatus = status || "Active";
      const statusLower = finalStatus.toLowerCase();

      if (blockedAt !== undefined && blockedAt !== null && blockedAt !== "") {
        // If blockedAt is explicitly provided, use it
        blockedAtValue = new Date(blockedAt);
      } else if (statusLower === "blocked") {
        // If status is blocked and no blockedAt provided, set to now
        blockedAtValue = new Date();
      } else if (
        statusLower === "active" ||
        statusLower === "under review" ||
        statusLower === "removed"
      ) {
        // If status is active, under review, or removed, don't set blockedAt
        blockedAtValue = undefined;
      }

      const violation = new Violation({
        matchId: internalMatchId,
        matchName,
        externalMatchId: externalMatchId,
        platformId,
        platformName,
        violationUrl,
        accountChannel,
        contentType,
        status: finalStatus,
        views: views || undefined,
        timeAdded: timeAdded ? new Date(timeAdded) : new Date(),
        blockedAt: blockedAtValue,
        active: active !== undefined ? active : true,
        notes: notesArray,
      });

      const savedViolation = await violation.save();
      const populated = await Violation.findById(savedViolation._id)
        .populate(
          "matchId",
          "team1 team2 date time week competition stadium externalMatchId",
        )
        .lean();

      // Log creation
      await logViolationChange(savedViolation._id, "created", {
        user: req.user,
        changes: {
          violationUrl,
          accountChannel,
          contentType,
          status: finalStatus,
          platformId,
          platformName,
        },
      });

      // Update platform and match stats (cascade handles both)
      await updatePlatformStats(internalMatchId, platformId);

      // Emit violation created event
      try {
        const emitMatchId = externalMatchId || internalMatchId;
        emitViolationEvent(emitMatchId, "violation-created", {
          violation: populated,
        });
      } catch (error) {
        // Silently fail
      }

      res.status(201).json(populated);
    } catch (error) {
      if (error.name === "CastError") {
        return res.status(400).json({ error: "Invalid match ID" });
      }
      if (error.name === "ValidationError") {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },
);

// POST /api/violations/bulk - Create multiple violations at once (superAdmin and employee only)
router.post(
  "/bulk",
  authenticateToken,
  requireSuperAdminOrEmployee,
  async (req, res) => {
    try {
      const {
        matchId,
        matchName,
        platformId,
        platformName,
        violationUrls, // Array of URLs
        accountChannel,
        contentType,
        status,
        views,
        timeAdded,
        blockedAt,
        active,
        notes,
      } = req.body;

      // Required fields validation
      if (
        !matchId ||
        !matchName ||
        !platformId ||
        !platformName ||
        !violationUrls ||
        !Array.isArray(violationUrls) ||
        violationUrls.length === 0 ||
        !accountChannel ||
        !contentType
      ) {
        return res.status(400).json({
          error:
            "Missing required fields: matchId, matchName, platformId, platformName, violationUrls (array), accountChannel, contentType",
        });
      }

      // Verify match exists - support both externalMatchId and internal _id
      let match = await Match.findById(matchId).catch(() => null);

      // If not found by _id, try externalMatchId
      if (!match) {
        match = await Match.findOne({ externalMatchId: matchId });
      }

      if (!match) {
        return res.status(404).json({ error: "Match not found" });
      }

      // Use the match's internal _id for the violation
      const internalMatchId = match._id;
      const externalMatchId = match.externalMatchId || null;

      // Convert notes to array if it's a string
      let notesArray = [];
      if (notes) {
        if (typeof notes === "string") {
          notesArray = notes.trim() ? [notes.trim()] : [];
        } else if (Array.isArray(notes)) {
          notesArray = notes.filter((n) => n && n.trim());
        }
      }

      // Handle blockedAt - set it if provided, or based on status
      let blockedAtValue = undefined;
      const finalStatus = status || "Active";
      const statusLower = finalStatus.toLowerCase();

      if (blockedAt !== undefined && blockedAt !== null && blockedAt !== "") {
        // If blockedAt is explicitly provided, use it
        blockedAtValue = new Date(blockedAt);
      } else if (statusLower === "blocked") {
        // If status is blocked and no blockedAt provided, set to now
        blockedAtValue = new Date();
      } else if (
        statusLower === "active" ||
        statusLower === "under review" ||
        statusLower === "removed"
      ) {
        // If status is active, under review, or removed, don't set blockedAt
        blockedAtValue = undefined;
      }

      // Generate a unique bulkId for this batch
      const bulkId = `bulk_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      // Create all violations with the same bulkId
      const violationsToCreate = violationUrls.map((url) => ({
        matchId: internalMatchId,
        matchName,
        externalMatchId: externalMatchId,
        platformId,
        platformName,
        violationUrl: url.trim(),
        accountChannel,
        contentType,
        status: finalStatus,
        views: views || undefined,
        timeAdded: timeAdded ? new Date(timeAdded) : new Date(),
        blockedAt: blockedAtValue,
        active: active !== undefined ? active : true,
        notes: notesArray,
        bulkId: bulkId, // Add bulkId to group these violations
      }));

      // Insert all violations at once
      const savedViolations = await Violation.insertMany(violationsToCreate);

      // Populate match data for all violations
      const populatedViolations = await Violation.find({
        _id: { $in: savedViolations.map((v) => v._id) },
      })
        .populate(
          "matchId",
          "team1 team2 date time week competition stadium externalMatchId",
        )
        .lean();

      // Log creation for each violation
      for (const violation of savedViolations) {
        await logViolationChange(violation._id, "created", {
          user: req.user,
          changes: {
            violationUrl: violation.violationUrl,
            accountChannel,
            contentType,
            status: finalStatus,
            platformId,
            platformName,
            bulkId: bulkId, // Include bulkId in the log
          },
        });
      }

      // Create BulkViolation entry FIRST so stats updates can find it
      try {
        const bulkViolation = await createBulkViolation({
          bulkId,
          matchId: internalMatchId,
          matchName,
          externalMatchId,
          platformId,
          platformName,
          accountChannel,
          contentType,
          violationIds: savedViolations.map((v) => v._id),
          createdBy: req.user?.userId,
          createdByName: req.user?.username,
          timeAdded: timeAdded ? new Date(timeAdded) : new Date(),
        });

        // Add audit log entry for bulk creation
        bulkViolation.auditLog.push({
          action: "created",
          userId: req.user?.userId,
          userName: req.user?.username || "System",
          timestamp: new Date(),
          oldValue: finalStatus, // Initial status of violations
          newValue: savedViolations.length, // Count of violations created
        });
        await bulkViolation.save();
      } catch (bulkError) {
        // Don't fail the request if bulk tracking fails
        console.error("Error creating bulk violation:", bulkError);
      }
      // Update platform and match stats (cascade handles both)
      await updatePlatformStats(internalMatchId, platformId);

      // Emit bulk violation created event (same as violation-created but for bulk)
      try {
        const emitMatchId = externalMatchId || internalMatchId;
        emitViolationEvent(emitMatchId, "violation-created", {
          violations: populatedViolations,
          bulkId: bulkId,
          isBulk: true,
        });
      } catch (error) {
        // Silently fail
      }

      // Also emit the bulk event
      try {
        emitBulkEvent(
          externalMatchId || internalMatchId,
          "bulk-violations-added",
          {
            bulkId,
            count: populatedViolations.length,
            violations: populatedViolations,
            platformId,
            platformName,
          },
        );
      } catch (error) {
        // Silently fail
      }

      res.status(201).json({
        bulkId: bulkId,
        count: populatedViolations.length,
        violations: populatedViolations,
      });
    } catch (error) {
      if (error.name === "CastError") {
        return res.status(400).json({ error: "Invalid match ID" });
      }
      if (error.name === "ValidationError") {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },
);

// PUT /api/violations/:id - Update violation (superAdmin and employee only)
router.put(
  "/:id",
  authenticateToken,
  requireSuperAdminOrEmployee,
  async (req, res) => {
    try {
      const {
        matchName,
        platformName,
        violationUrl,
        accountChannel,
        contentType,
        status,
        views,
        timeAdded,
        blockedAt,
        active,
        notes,
      } = req.body;

      const violation = await Violation.findById(req.params.id).populate(
        "matchId",
      );

      if (!violation) {
        return res.status(404).json({ error: "Violation not found" });
      }

      // Store original values for logging (BEFORE any updates)
      const originalViolation = violation.toObject();
      const originalStatus = violation.status; // Store BEFORE updating
      const originalBlockedAt = originalViolation.blockedAt
        ? new Date(originalViolation.blockedAt).toISOString()
        : undefined;
      const originalNotes = [...(violation.notes || [])]; // Store BEFORE updating
      const changes = {};

      // Update externalMatchId from the match if matchId is populated
      if (
        violation.matchId &&
        typeof violation.matchId === "object" &&
        violation.matchId.externalMatchId
      ) {
        violation.externalMatchId = violation.matchId.externalMatchId;
      } else if (violation.matchId) {
        // If matchId is not populated, fetch the match to get externalMatchId
        const match = await Match.findById(violation.matchId);
        if (match && match.externalMatchId) {
          violation.externalMatchId = match.externalMatchId;
        }
      }

      // Update fields and track changes
      if (matchName !== undefined && matchName !== violation.matchName) {
        changes.matchName = { old: violation.matchName, new: matchName };
        violation.matchName = matchName;
      }
      if (
        platformName !== undefined &&
        platformName !== violation.platformName
      ) {
        changes.platformName = {
          old: violation.platformName,
          new: platformName,
        };
        violation.platformName = platformName;
      }
      if (
        violationUrl !== undefined &&
        violationUrl !== violation.violationUrl
      ) {
        changes.violationUrl = {
          old: violation.violationUrl,
          new: violationUrl,
        };
        violation.violationUrl = violationUrl;
      }
      if (
        accountChannel !== undefined &&
        accountChannel !== violation.accountChannel
      ) {
        changes.accountChannel = {
          old: violation.accountChannel,
          new: accountChannel,
        };
        violation.accountChannel = accountChannel;
      }
      if (contentType !== undefined && contentType !== violation.contentType) {
        changes.contentType = { old: violation.contentType, new: contentType };
        violation.contentType = contentType;
      }
      // Normalize status for comparison and storage
      let normalizedStatusForUpdate = status;
      if (status !== undefined) {
        // Normalize status to match schema enum (capitalized)
        const normalizedStatus =
          status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
        // Handle "Under Review" specially
        normalizedStatusForUpdate =
          normalizedStatus === "Under review"
            ? "Under Review"
            : normalizedStatus;

        if (normalizedStatusForUpdate !== violation.status) {
          changes.status = {
            old: violation.status,
            new: normalizedStatusForUpdate,
          };
          violation.status = normalizedStatusForUpdate;
        }
      }
      if (views !== undefined && views !== violation.views) {
        changes.views = { old: violation.views, new: views };
        violation.views = views;
      }
      if (timeAdded !== undefined) {
        const newTimeAdded = new Date(timeAdded);
        const oldTimeAdded = new Date(violation.timeAdded);
        // Compare timestamps to avoid timezone/precision issues
        if (Math.abs(newTimeAdded.getTime() - oldTimeAdded.getTime()) > 1000) {
          // Only log if difference is more than 1 second
          changes.timeAdded = {
            old: oldTimeAdded,
            new: newTimeAdded,
          };
          violation.timeAdded = newTimeAdded;
        }
      }

      // Track blockedAt changes separately (only when explicitly provided, not auto-set from status)
      let blockedAtChanged = false;
      let blockedAtAction = null; // 'added', 'removed', 'changed', or null
      let blockedAtExplicitlyChanged = false; // Track if blockedAt was explicitly provided and changed

      // Handle blockedAt - set it if provided, or handle it based on status
      if (blockedAt !== undefined) {
        // blockedAt was explicitly provided in the request
        const oldBlockedAt = violation.blockedAt
          ? new Date(violation.blockedAt).toISOString()
          : undefined;
        const newBlockedAt = blockedAt
          ? new Date(blockedAt).toISOString()
          : undefined;

        // Only track as change if it actually changed
        if (oldBlockedAt !== newBlockedAt) {
          if (!oldBlockedAt && newBlockedAt) {
            blockedAtAction = "added";
          } else if (oldBlockedAt && !newBlockedAt) {
            blockedAtAction = "removed";
          } else {
            blockedAtAction = "changed";
            blockedAtExplicitlyChanged = true; // Mark as explicitly changed (time changed, not added/removed)
          }
          blockedAtChanged = true;
          changes.blockedAt = { old: oldBlockedAt, new: newBlockedAt };
        }

        if (blockedAt) {
          violation.blockedAt = new Date(blockedAt);
        } else {
          // Explicitly unset the field to ensure it's removed from the document
          if (violation.blockedAt) {
            await Violation.findByIdAndUpdate(violation._id, {
              $unset: { blockedAt: "" },
            });
          }
          violation.blockedAt = undefined;
        }
      } else if (status !== undefined) {
        // If status is being updated but blockedAt is not provided, handle it based on status
        const statusLower = status.toLowerCase();
        const oldStatusLower = violation.status.toLowerCase();
        const hadBlockedAt = !!violation.blockedAt;

        if (
          statusLower === "active" ||
          statusLower === "under review" ||
          statusLower === "removed"
        ) {
          // If changing TO active, under review, or removed, clear blockedAt
          if (hadBlockedAt) {
            // Only log if it actually had blockedAt before
            blockedAtAction = "removed";
            blockedAtChanged = true;
          }
          // Explicitly unset the field to ensure it's removed from the document
          if (hadBlockedAt) {
            await Violation.findByIdAndUpdate(violation._id, {
              $unset: { blockedAt: "" },
            });
          }
          violation.blockedAt = undefined;
        } else if (statusLower === "blocked") {
          // If changing TO blocked from any other status, set blockedAt to now
          // Only set if it doesn't already exist (preserve existing blockedAt if already set)
          if (
            !violation.blockedAt ||
            oldStatusLower === "active" ||
            oldStatusLower === "under review" ||
            oldStatusLower === "removed"
          ) {
            if (!hadBlockedAt) {
              // Only log if it didn't have blockedAt before
              blockedAtAction = "added";
              blockedAtChanged = true;
            }
            violation.blockedAt = new Date();
          }
        }
      }

      if (active !== undefined) violation.active = active;

      // Handle notes - convert to array if string
      if (notes !== undefined) {
        if (typeof notes === "string") {
          violation.notes = notes.trim() ? [notes.trim()] : [];
        } else if (Array.isArray(notes)) {
          violation.notes = notes.filter((n) => n && n.trim());
        }
      }

      // Normalize status for logging comparison
      let normalizedStatusForLog = status;
      if (status !== undefined) {
        normalizedStatusForLog =
          status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
        // Handle "Under Review" specially
        if (normalizedStatusForLog === "Under review") {
          normalizedStatusForLog = "Under Review";
        }
      }

      // If blockedAt needs to be removed, use $unset to ensure it's deleted from DB
      if (blockedAtChanged && blockedAtAction === "removed") {
        await Violation.findByIdAndUpdate(violation._id, {
          $unset: { blockedAt: "" },
        });
      }

      const updatedViolation = await violation.save();
      const populated = await Violation.findById(updatedViolation._id)
        .populate("matchId")
        .lean();

      // Log changes
      // Log status change if status was updated
      if (
        status !== undefined &&
        normalizedStatusForUpdate &&
        normalizedStatusForUpdate !== originalStatus
      ) {
        const statusLower = normalizedStatusForUpdate.toLowerCase();
        const oldStatusLower = originalStatus.toLowerCase();
        const changesObj = {};

        // If changing TO blocked, include blockedAt info
        if (statusLower === "blocked" && oldStatusLower !== "blocked") {
          const finalBlockedAt = updatedViolation.blockedAt
            ? new Date(updatedViolation.blockedAt).toISOString()
            : undefined;
          changesObj.blockedAtAdded = finalBlockedAt;
          // Don't log separate blockedAt added (unless it was explicitly changed, which is handled separately)
          if (!blockedAtExplicitlyChanged) {
            blockedAtChanged = false;
          }
        }
        // If changing FROM blocked, include blockedAt removed info
        else if (oldStatusLower === "blocked" && statusLower !== "blocked") {
          changesObj.blockedAtRemoved = true;
          // Don't log separate blockedAt removed (unless it was explicitly changed, which is handled separately)
          if (!blockedAtExplicitlyChanged) {
            blockedAtChanged = false;
          }
        }

        await logViolationChange(updatedViolation._id, "status_changed", {
          user: req.user,
          field: "status",
          oldValue: originalStatus,
          newValue: normalizedStatusForUpdate,
          changes: Object.keys(changesObj).length > 0 ? changesObj : undefined,
        });
      }

      // Log note changes
      if (notes !== undefined) {
        let newNotes = [];
        if (typeof notes === "string") {
          newNotes = notes.trim() ? [notes.trim()] : [];
        } else if (Array.isArray(notes)) {
          newNotes = notes.filter((n) => n && n.trim());
        }

        const notesChanged =
          JSON.stringify(originalNotes.sort()) !==
          JSON.stringify(newNotes.sort());
        if (notesChanged) {
          const addedNotes = newNotes.filter((n) => !originalNotes.includes(n));
          const removedNotes = originalNotes.filter(
            (n) => !newNotes.includes(n),
          );

          // If notes were edited (same count, different content) - this means a note was changed, not added/removed
          if (
            originalNotes.length === newNotes.length &&
            addedNotes.length > 0 &&
            removedNotes.length > 0
          ) {
            // Notes were edited/changed - match old notes with new notes by position
            const edited = [];
            for (let i = 0; i < originalNotes.length; i++) {
              if (originalNotes[i] !== newNotes[i]) {
                edited.push({
                  old: originalNotes[i],
                  new: newNotes[i],
                });
              }
            }

            // Log as field_updated with action "changed"
            await logViolationChange(updatedViolation._id, "field_updated", {
              user: req.user,
              field: "notes",
              oldValue: originalNotes,
              newValue: newNotes,
              changes: {
                action: "changed",
                edited: edited,
              },
            });
          } else if (addedNotes.length > 0) {
            // New notes were added
            await logViolationChange(updatedViolation._id, "note_added", {
              user: req.user,
              field: "notes",
              oldValue: originalNotes,
              newValue: newNotes,
              changes: {
                added: addedNotes,
              },
            });
          } else if (removedNotes.length > 0) {
            // Notes were removed/deleted
            await logViolationChange(updatedViolation._id, "field_updated", {
              user: req.user,
              field: "notes",
              oldValue: originalNotes,
              newValue: newNotes,
              changes: {
                action: "deleted",
                removed: removedNotes,
              },
            });
          } else {
            // Other note changes
            await logViolationChange(updatedViolation._id, "field_updated", {
              user: req.user,
              field: "notes",
              oldValue: originalNotes,
              newValue: newNotes,
            });
          }
        }
      }

      // Log blockedAt time changes independently (when time is explicitly changed, not added/removed)
      // This should be logged separately from status changes, similar to "Time Added Changed"
      if (blockedAtExplicitlyChanged && blockedAtAction === "changed") {
        const finalBlockedAt = updatedViolation.blockedAt
          ? new Date(updatedViolation.blockedAt).toISOString()
          : undefined;
        const originalBlockedAtISO = originalBlockedAt
          ? new Date(originalBlockedAt).toISOString()
          : undefined;

        // Log as field_updated with action "changed" - this will be displayed as "Blocked At Changed"
        await logViolationChange(updatedViolation._id, "field_updated", {
          user: req.user,
          field: "blockedAt",
          oldValue: originalBlockedAtISO,
          newValue: finalBlockedAt,
          changes: { action: "changed" },
        });
      }

      // Log other field updates - only log fields that were explicitly provided and actually changed
      // Use the changes object we built earlier, which already has proper comparisons
      // Exclude blockedAt from this loop since it's handled separately above
      for (const key in changes) {
        if (key !== "status" && key !== "notes" && key !== "blockedAt") {
          // Status, notes, and blockedAt are handled separately above
          const change = changes[key];
          // Format Date objects for logging
          const oldValue =
            change.old instanceof Date ? change.old.toISOString() : change.old;
          const newValue =
            change.new instanceof Date ? change.new.toISOString() : change.new;

          await logViolationChange(updatedViolation._id, "field_updated", {
            user: req.user,
            field: key,
            oldValue: oldValue,
            newValue: newValue,
          });
        }
      }

      // Update bulk violation stats FIRST if this violation is part of a bulk
      // This ensures platform stats calculation uses fresh bulk data
      if (violation.bulkId) {
        try {
          await updateBulkViolationStats(violation.bulkId);
        } catch (bulkError) {
          // Don't fail the request if bulk update fails
        }
      }

      // Then update platform and match stats (cascade handles both)
      // This will now include the updated bulk stats
      await updatePlatformStats(violation.matchId, violation.platformId);

      // Emit violation updated event
      try {
        const emitMatchId = violation.externalMatchId || violation.matchId;
        emitViolationEvent(emitMatchId, "violation-updated", {
          violation: populated,
        });
      } catch (error) {
        // Silently fail
      }

      res.json(populated);
    } catch (error) {
      if (error.name === "CastError") {
        return res.status(400).json({ error: "Invalid violation ID" });
      }
      if (error.name === "ValidationError") {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },
);

// PATCH /api/violations/:id/status - Update violation status only (superAdmin and employee only)
router.patch(
  "/:id/status",
  authenticateToken,
  requireSuperAdminOrEmployee,
  async (req, res) => {
    try {
      const { status, blockedAt } = req.body;

      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      const violation = await Violation.findById(req.params.id);

      if (!violation) {
        return res.status(404).json({ error: "Violation not found" });
      }

      // Store original status for logging
      const originalStatus = violation.status;

      // Normalize status to match schema enum (capitalized)
      const normalizedStatus =
        status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      // Handle "Under Review" specially (same as PUT endpoint)
      const finalNormalizedStatus =
        normalizedStatus === "Under review" ? "Under Review" : normalizedStatus;
      const validStatuses = ["Active", "Blocked", "Removed", "Under Review"];

      if (!validStatuses.includes(finalNormalizedStatus)) {
        return res.status(400).json({ error: "Invalid status value" });
      }

      violation.status = finalNormalizedStatus;

      // Handle blockedAt based on status:
      // - Set blockedAt ONLY when status changes TO Blocked (from any other status)
      // - Clear blockedAt when status changes TO Active, Removed, or Under Review
      // - Removed is a different status and should NOT have blockedAt
      const statusLower = finalNormalizedStatus.toLowerCase();
      const hadBlockedAt = !!violation.blockedAt;

      if (statusLower === "blocked") {
        // If changing TO blocked, set blockedAt (use provided time or current time)
        violation.blockedAt = blockedAt ? new Date(blockedAt) : new Date();
      } else if (
        statusLower === "active" ||
        statusLower === "under review" ||
        statusLower === "removed"
      ) {
        // If changing TO active, under review, or removed, clear blockedAt
        // Use $unset to ensure it's removed from the document
        if (hadBlockedAt) {
          await Violation.findByIdAndUpdate(violation._id, {
            $unset: { blockedAt: "" },
          });
        }
        violation.blockedAt = undefined;
      }

      const updatedViolation = await violation.save();
      const populated = await Violation.findById(updatedViolation._id)
        .populate("matchId")
        .lean();

      // Log status change
      if (finalNormalizedStatus !== originalStatus) {
        const statusLower = finalNormalizedStatus.toLowerCase();
        const oldStatusLower = originalStatus.toLowerCase();
        const changesObj = {};

        // If changing TO blocked, include blockedAt info
        if (statusLower === "blocked" && oldStatusLower !== "blocked") {
          const finalBlockedAt = updatedViolation.blockedAt
            ? new Date(updatedViolation.blockedAt).toISOString()
            : undefined;
          changesObj.blockedAtAdded = finalBlockedAt;
        }
        // If changing FROM blocked, include blockedAt removed info
        else if (oldStatusLower === "blocked" && statusLower !== "blocked") {
          changesObj.blockedAtRemoved = true;
        }

        // Get bulkId from query params if provided (for bulk operations)
        const bulkId = req.query.bulkId;

        await logViolationChange(updatedViolation._id, "status_changed", {
          user: req.user,
          field: "status",
          oldValue: originalStatus,
          newValue: finalNormalizedStatus,
          changes:
            Object.keys(changesObj).length > 0
              ? { ...changesObj, bulkId: bulkId || undefined }
              : { bulkId: bulkId || undefined },
        });
      }

      // Update bulk violation stats FIRST if this violation is part of a bulk
      // This ensures platform stats calculation uses fresh bulk data
      if (violation.bulkId) {
        try {
          await updateBulkViolationStats(violation.bulkId);
        } catch (bulkError) {
          // Don't fail the request if bulk update fails
        }
      }

      // Then update platform and match stats (cascade handles both)
      // This will now include the updated bulk stats
      await updatePlatformStats(violation.matchId, violation.platformId);

      // Emit violation updated event
      try {
        const emitMatchId = violation.externalMatchId || violation.matchId;
        emitViolationEvent(emitMatchId, "violation-updated", {
          violation: populated,
        });
      } catch (error) {
        // Silently fail on event emission
      }

      res.json(populated);
    } catch (error) {
      if (error.name === "CastError") {
        return res.status(400).json({ error: "Invalid violation ID" });
      }
      res.status(500).json({ error: error.message });
    }
  },
);

// DELETE /api/violations/:id - Delete violation (superAdmin and employee only)
router.delete(
  "/:id",
  authenticateToken,
  requireSuperAdminOrEmployee,
  async (req, res) => {
    try {
      const violation = await Violation.findById(req.params.id);

      if (!violation) {
        return res.status(404).json({ error: "Violation not found" });
      }

      const matchId = violation.matchId;
      const violationId = violation._id;

      // Get externalMatchId from violation or match
      let externalMatchId = violation.externalMatchId;
      if (!externalMatchId && violation.matchId) {
        // If matchId is populated, get externalMatchId from it
        if (
          typeof violation.matchId === "object" &&
          violation.matchId.externalMatchId
        ) {
          externalMatchId = violation.matchId.externalMatchId;
        } else {
          // Fetch match to get externalMatchId
          const match = await Match.findById(violation.matchId);
          if (match && match.externalMatchId) {
            externalMatchId = match.externalMatchId;
          }
        }
      }

      // Save deleted violation log to separate collection before deleting
      // Get bulkId from query params if provided (for bulk operations)
      const bulkId = req.query.bulkId;

      await DeletedViolationLog.create({
        externalMatchId: externalMatchId || null, // Required for querying
        action: "deleted",
        userId: req.user ? req.user.userId : null,
        userName: req.user ? req.user.username : "System",
        timestamp: new Date(),
        changes: {
          platformId: violation.platformId,
          platformName: violation.platformName,
          accountChannel: violation.accountChannel,
          status: violation.status,
          views: violation.views || "0",
          violationUrl: violation.violationUrl,
          bulkId: bulkId || undefined, // Include bulkId if provided
        },
      });

      // Log deletion in violation's audit log before deleting (optional, for consistency)
      await logViolationChange(violationId, "deleted", {
        user: req.user,
        initialData: {
          violationUrl: violation.violationUrl,
          accountChannel: violation.accountChannel,
          status: violation.status,
        },
      });

      await Violation.findByIdAndDelete(req.params.id);

      // Update bulk violation stats FIRST if this violation was part of a bulk
      // This ensures platform stats calculation uses fresh bulk data
      if (violation.bulkId) {
        try {
          // Check if there are any remaining violations with this bulkId
          const remainingCount = await Violation.countDocuments({
            bulkId: violation.bulkId,
          });

          if (remainingCount === 0) {
            // If no violations remain, delete the bulk violation entry
            await deleteBulkViolation(violation.bulkId);
          } else {
            // Otherwise, update the stats
            await updateBulkViolationStats(violation.bulkId);
          }
        } catch (bulkError) {
          // Don't fail the request if bulk update fails
        }
      }

      // Then update platform and match stats (cascade handles both)
      // This will now include the updated bulk stats
      await updatePlatformStats(matchId, violation.platformId);

      // Emit violation deleted event
      try {
        emitViolationEvent(externalMatchId || matchId, "violation-deleted", {
          violationId: req.params.id,
          platformId: violation.platformId,
          bulkId: bulkId || undefined,
        });
      } catch (error) {
        // Silently fail on event emission
      }

      res.json({ message: "Violation deleted" });
    } catch (error) {
      if (error.name === "CastError") {
        return res.status(400).json({ error: "Invalid violation ID" });
      }
      res.status(500).json({ error: error.message });
    }
  },
);

export default router;
