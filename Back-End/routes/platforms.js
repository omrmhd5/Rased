import express from "express";
import Platform from "../models/Platform.js";
import Violation from "../models/Violation.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const saveBase64Icon = (base64String, platformName) => {
  if (!base64String) return null;

  try {
    // Check if it's a valid data URL
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }

    const type = matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, "base64");

    // Determine extension
    let ext = "png";
    if (type === "image/jpeg") ext = "jpg";
    if (type === "image/svg+xml") ext = "svg";

    // Create directory if not exists
    const uploadDir = path.join(__dirname, "../uploads/icons");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate filename
    const filename = `${platformName.toLowerCase().replace(/[^a-z0-9]/g, "")}_${Date.now()}.${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Write file
    fs.writeFileSync(filepath, buffer);

    return `/uploads/icons/${filename}`;
  } catch (error) {
    console.error("Error saving icon:", error);
    return null;
  }
};

const router = express.Router();

// GET /api/platforms - Get all platforms
router.get("/", async (req, res) => {
  try {
    const platforms = await Platform.find().sort({ name: 1 }).lean();
    res.json(platforms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/platforms/:id - Get single platform
router.get("/:id", async (req, res) => {
  try {
    const platform = await Platform.findOne({ id: req.params.id });

    if (!platform) {
      return res.status(404).json({ error: "Platform not found" });
    }

    res.json(platform);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/platforms - Create new platform
router.post("/", async (req, res) => {
  try {
    const { name, icon } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: "Platform name is required",
      });
    }

    // Auto-generate id from name (lowercase, remove spaces and special chars)
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, "");

    if (!id) {
      return res.status(400).json({
        error: "Invalid platform name",
      });
    }

    // Check if platform with this id already exists
    const existing = await Platform.findOne({ id });
    if (existing) {
      return res
        .status(400)
        .json({ error: "Platform with this name already exists" });
    }

    const platform = new Platform({
      id,
      name: name.trim(),
    });

    if (icon) {
      const iconUrl = saveBase64Icon(icon, name);
      if (iconUrl) {
        platform.iconUrl = iconUrl;
      }
    }

    const savedPlatform = await platform.save();
    res.status(201).json(savedPlatform);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "Platform already exists" });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/platforms/:id - Update platform
router.put("/:id", async (req, res) => {
  try {
    const { name, icon } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Platform name is required" });
    }

    const platform = await Platform.findOne({ id: req.params.id });

    if (!platform) {
      return res.status(404).json({ error: "Platform not found" });
    }

    // Generate new id from new name
    const newId = name.toLowerCase().replace(/[^a-z0-9]/g, "");

    if (!newId) {
      return res.status(400).json({ error: "Invalid platform name" });
    }

    // If id is changing, check if new id already exists
    if (newId !== platform.id) {
      const existing = await Platform.findOne({ id: newId });
      if (existing) {
        return res
          .status(400)
          .json({ error: "Platform with this name already exists" });
      }

      // Update violations to use new platformId
      await Violation.updateMany(
        { platformId: platform.id },
        { $set: { platformId: newId } },
      );

      platform.id = newId;
    }

    platform.name = name.trim();

    if (icon) {
      const iconUrl = saveBase64Icon(icon, name);
      if (iconUrl) {
        platform.iconUrl = iconUrl;
      }
    }

    const updatedPlatform = await platform.save();
    res.json(updatedPlatform);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "Platform already exists" });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/platforms/:id - Delete platform
router.delete("/:id", async (req, res) => {
  try {
    const platform = await Platform.findOne({ id: req.params.id });

    if (!platform) {
      return res.status(404).json({ error: "Platform not found" });
    }

    // Check if platform has violations
    const violationCount = await Violation.countDocuments({
      platformId: platform.id,
    });
    if (violationCount > 0) {
      return res.status(400).json({
        error: `Cannot delete platform with ${violationCount} associated violations`,
      });
    }

    await Platform.findByIdAndDelete(platform._id);
    res.json({ message: "Platform deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/platforms/:id/stats/:matchId - Get platform statistics for a match
router.get("/:id/stats/:matchId", async (req, res) => {
  try {
    const { id, matchId } = req.params;
    const { type } = req.query; // Optional: filter by content type

    const platform = await Platform.findOne({ id });

    if (!platform) {
      return res.status(404).json({ error: "Platform not found" });
    }

    const query = { matchId, platformId: id };
    if (type && type !== "all") {
      query.type = type.charAt(0).toUpperCase() + type.slice(1);
    }

    const violations = await Violation.find(query).lean();

    const totalViolations = violations.length;
    const activeViolations = violations.filter((v) =>
      ["reported", "active", "pending", "review"].includes(v.status),
    ).length;
    const blockedViolations = violations.filter(
      (v) => v.status === "blocked" || v.status === "removed",
    ).length;
    const stillActive = violations.filter((v) => v.stillActive).length;

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

    // Calculate average block time
    const blockedViolationsWithTime = violations.filter(
      (v) => (v.status === "blocked" || v.status === "removed") && v.blockedAt,
    );

    let avgBlockTime = 0;
    if (blockedViolationsWithTime.length > 0) {
      const totalBlockTime = blockedViolationsWithTime.reduce((sum, v) => {
        const timeAdded = new Date(v.timeAdded);
        const blockedAt = new Date(v.blockedAt);
        const diffMs = blockedAt - timeAdded;
        return sum + diffMs / 60000; // Convert to minutes
      }, 0);
      avgBlockTime = totalBlockTime / blockedViolationsWithTime.length;
    }

    res.json({
      platform: {
        id: platform.id,
        name: platform.name,
        color: platform.color,

        icon: platform.icon,
        iconUrl: platform.iconUrl,
      },
      totalViolations,
      activeViolations,
      blockedCount: blockedViolations,
      blockedRate,
      totalViews: `${(totalViews / 1000).toFixed(1)}K`,
      avgBlockTime: `${avgBlockTime.toFixed(1)} min`,
      blockedSuccess: `${blockedRate}%`,
      stillActive,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid match ID" });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
