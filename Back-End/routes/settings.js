import express from "express";
import Settings from "../models/Settings.js";
import { optionalAuth } from "../middleware/auth.js";

const router = express.Router();

// Apply optional auth to all routes
router.use(optionalAuth);

// GET /api/settings - Get settings (singleton)
router.get("/", async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/settings - Update settings (singleton)
router.put("/", async (req, res) => {
  try {
    const {
      targetMins,
      viewsThreshold,
      violationsThreshold,
      allowDuplicates,
      showDuplicates,
    } = req.body;

    // Validate targetMins if provided
    if (targetMins !== undefined) {
      const targetMinsNum = Number(targetMins);
      if (isNaN(targetMinsNum) || targetMinsNum < 1) {
        return res.status(400).json({
          error: "targetMins must be a number greater than or equal to 1",
        });
      }
    }

    // Validate viewsThreshold if provided
    if (viewsThreshold !== undefined) {
      const viewsThresholdNum = Number(viewsThreshold);
      if (isNaN(viewsThresholdNum) || viewsThresholdNum < 0) {
        return res.status(400).json({
          error: "viewsThreshold must be a number greater than or equal to 0",
        });
      }
    }

    // Validate violationsThreshold if provided
    if (violationsThreshold !== undefined) {
      const violationsThresholdNum = Number(violationsThreshold);
      if (isNaN(violationsThresholdNum) || violationsThresholdNum < 0) {
        return res.status(400).json({
          error:
            "violationsThreshold must be a number greater than or equal to 0",
        });
      }
    }

    // Build update object
    const updates = {};
    if (targetMins !== undefined) {
      updates.targetMins = Number(targetMins);
    }
    if (viewsThreshold !== undefined) {
      updates.viewsThreshold = Number(viewsThreshold);
    }
    if (violationsThreshold !== undefined) {
      updates.violationsThreshold = Number(violationsThreshold);
    }
    if (allowDuplicates !== undefined) {
      updates.allowDuplicates = Boolean(allowDuplicates);
    }
    if (showDuplicates !== undefined) {
      updates.showDuplicates = Boolean(showDuplicates);
    }

    // Update the singleton settings
    const settings = await Settings.updateSingleton(updates);

    res.json(settings);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/settings - Partially update settings (singleton)
router.patch("/", async (req, res) => {
  try {
    const {
      targetMins,
      viewsThreshold,
      violationsThreshold,
      allowDuplicates,
      showDuplicates,
    } = req.body;

    // Build update object (only include provided fields)
    const updates = {};
    if (targetMins !== undefined) {
      const targetMinsNum = Number(targetMins);
      if (isNaN(targetMinsNum) || targetMinsNum < 1) {
        return res.status(400).json({
          error: "targetMins must be a number greater than or equal to 1",
        });
      }
      updates.targetMins = targetMinsNum;
    }
    if (viewsThreshold !== undefined) {
      const viewsThresholdNum = Number(viewsThreshold);
      if (isNaN(viewsThresholdNum) || viewsThresholdNum < 0) {
        return res.status(400).json({
          error: "viewsThreshold must be a number greater than or equal to 0",
        });
      }
      updates.viewsThreshold = viewsThresholdNum;
    }
    if (violationsThreshold !== undefined) {
      const violationsThresholdNum = Number(violationsThreshold);
      if (isNaN(violationsThresholdNum) || violationsThresholdNum < 0) {
        return res.status(400).json({
          error:
            "violationsThreshold must be a number greater than or equal to 0",
        });
      }
      updates.violationsThreshold = violationsThresholdNum;
    }
    if (allowDuplicates !== undefined) {
      updates.allowDuplicates = Boolean(allowDuplicates);
    }
    if (showDuplicates !== undefined) {
      updates.showDuplicates = Boolean(showDuplicates);
    }

    // If no updates provided, return current settings
    if (Object.keys(updates).length === 0) {
      const settings = await Settings.getSingleton();
      return res.json(settings);
    }

    // Update the singleton settings
    const settings = await Settings.updateSingleton(updates);

    res.json(settings);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
