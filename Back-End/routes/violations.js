import express from "express";
import Violation from "../models/Violation.js";
import Match from "../models/Match.js";

const router = express.Router();

// GET /api/violations - Get all violations with filters
router.get("/", async (req, res) => {
  try {
    const { matchId, platformId, status, type, search, limit, sort } =
      req.query;

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

    const limitNum = limit ? parseInt(limit) : 100;
    const sortOrder = sort === "asc" ? 1 : -1;

    const violations = await Violation.find(query)
      .populate("matchId", "team1 team2 date time week competition stadium externalMatchId")
      .sort({ timeAdded: sortOrder })
      .limit(limitNum)
      .lean();

    res.json(violations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/violations/:id - Get single violation
router.get("/:id", async (req, res) => {
  try {
    const violation = await Violation.findById(req.params.id).populate(
      "matchId",
      "team1 team2 date time week competition stadium externalMatchId"
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

// POST /api/violations - Create new violation
router.post("/", async (req, res) => {
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
    } else if (statusLower === "blocked" || statusLower === "removed") {
      // If status is blocked/removed and no blockedAt provided, set to now
      blockedAtValue = new Date();
    } else if (statusLower === "active") {
      // If status is active, don't set blockedAt
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
      .populate("matchId", "team1 team2 date time week competition stadium externalMatchId")
      .lean();

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
});

// PUT /api/violations/:id - Update violation
router.put("/:id", async (req, res) => {
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

    const violation = await Violation.findById(req.params.id).populate("matchId");

    if (!violation) {
      return res.status(404).json({ error: "Violation not found" });
    }

    // Update externalMatchId from the match if matchId is populated
    if (violation.matchId && typeof violation.matchId === 'object' && violation.matchId.externalMatchId) {
      violation.externalMatchId = violation.matchId.externalMatchId;
    } else if (violation.matchId) {
      // If matchId is not populated, fetch the match to get externalMatchId
      const match = await Match.findById(violation.matchId);
      if (match && match.externalMatchId) {
        violation.externalMatchId = match.externalMatchId;
      }
    }

    // Update fields
    if (matchName !== undefined) violation.matchName = matchName;
    if (platformName !== undefined) violation.platformName = platformName;
    if (violationUrl !== undefined) violation.violationUrl = violationUrl;
    if (accountChannel !== undefined) violation.accountChannel = accountChannel;
    if (contentType !== undefined) violation.contentType = contentType;
    if (status !== undefined) violation.status = status;
    if (views !== undefined) violation.views = views;
    if (timeAdded !== undefined) violation.timeAdded = new Date(timeAdded);
    
    // Handle blockedAt - set it if provided, or clear it if status is Active
    if (blockedAt !== undefined) {
      if (blockedAt) {
        violation.blockedAt = new Date(blockedAt);
      } else {
        violation.blockedAt = undefined;
      }
    } else if (status !== undefined) {
      // If status is being updated but blockedAt is not provided, handle it based on status
      const statusLower = status.toLowerCase();
      if (statusLower === "active") {
        violation.blockedAt = undefined;
      } else if ((statusLower === "blocked" || statusLower === "removed") && !violation.blockedAt) {
        // If setting to blocked/removed and no blockedAt exists, set to now
        violation.blockedAt = new Date();
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

    const updatedViolation = await violation.save();
    const populated = await Violation.findById(updatedViolation._id)
      .populate("matchId")
      .lean();

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
});

// PATCH /api/violations/:id/status - Update violation status only
router.patch("/:id/status", async (req, res) => {
  try {
    const { status, blockedAt } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const violation = await Violation.findById(req.params.id);

    if (!violation) {
      return res.status(404).json({ error: "Violation not found" });
    }

    // Normalize status to match schema enum (capitalized)
    const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    const validStatuses = ["Active", "Blocked", "Removed", "Under Review"];
    
    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    violation.status = normalizedStatus;

    // Set blockedAt when status is Blocked or Removed
    const statusLower = normalizedStatus.toLowerCase();
    if (statusLower === "blocked" || statusLower === "removed") {
      violation.blockedAt = blockedAt ? new Date(blockedAt) : new Date();
    } else if (statusLower === "active") {
      violation.blockedAt = undefined;
    }

    const updatedViolation = await violation.save();
    const populated = await Violation.findById(updatedViolation._id)
      .populate("matchId")
      .lean();

    res.json(populated);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid violation ID" });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/violations/:id - Delete violation
router.delete("/:id", async (req, res) => {
  try {
    const violation = await Violation.findById(req.params.id);

    if (!violation) {
      return res.status(404).json({ error: "Violation not found" });
    }

    await Violation.findByIdAndDelete(req.params.id);
    res.json({ message: "Violation deleted" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid violation ID" });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
