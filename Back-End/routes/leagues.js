import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import Competition from "../models/Competition.js";
import { authenticateToken } from "../middleware/auth.js";
import { fetchCompetitionFromAPI } from "../utils/fetchCompetitionFromAPI.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../uploads/icons");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `league-icon-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Accept only SVG and PNG files
  if (file.mimetype === "image/svg+xml" || file.mimetype === "image/png") {
    cb(null, true);
  } else {
    cb(new Error("Only SVG and PNG files are allowed"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Middleware to check if user is superAdmin
const requireSuperAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const User = (await import("../models/User.js")).default;
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

// GET /api/leagues - Get all leagues
router.get("/", async (req, res) => {
  try {
    const { includeHidden } = req.query;
    const query = includeHidden === "true" ? {} : { isHidden: false };

    const competitions = await Competition.find(query)
      .sort({ league: 1 })
      .lean();

    res.json(competitions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/leagues/:slug - Get single league by slug
router.get("/:slug", async (req, res) => {
  try {
    const competition = await Competition.findOne({ league: req.params.slug }).lean();

    if (!competition) {
      return res.status(404).json({ error: "League not found" });
    }

    res.json(competition);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/leagues - Create new league (superAdmin only)
router.post("/", authenticateToken, requireSuperAdmin, upload.single("icon"), async (req, res) => {
  try {
    const { slug, apiUrl, referer, arabicName } = req.body;

    // Validate required fields
    if (!slug || !apiUrl || !referer) {
      // Delete uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        error: "slug, apiUrl, and referer are required",
      });
    }

    // Check if league with this slug already exists
    const existingLeague = await Competition.findOne({ league: slug });
    if (existingLeague) {
      // Delete uploaded file if league exists
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        error: `League with slug "${slug}" already exists`,
      });
    }

    // Fetch competition data from API
    let competitionData;
    try {
      competitionData = await fetchCompetitionFromAPI(apiUrl, referer);
    } catch (error) {
      // Delete uploaded file if API fetch fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        error: `Failed to fetch competition data from API: ${error.message}`,
      });
    }

    // Check if competition with this externalId already exists
    const existingCompetition = await Competition.findOne({
      externalId: competitionData.externalId,
    });
    if (existingCompetition) {
      // Delete uploaded file if competition exists
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        error: `Competition with externalId "${competitionData.externalId}" already exists`,
      });
    }

    // Get icon URL if file was uploaded
    let iconUrl = "";
    if (req.file) {
      iconUrl = `/uploads/icons/${req.file.filename}`;
    }

    // Create new competition/league
    const competition = new Competition({
      ...competitionData,
      league: slug,
      apiUrl,
      referer,
      arabicName: arabicName || "",
      iconUrl,
      isHidden: false,
    });

    const savedCompetition = await competition.save();

    res.status(201).json(savedCompetition);
  } catch (error) {
    // Delete uploaded file if save fails
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Error creating league:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/leagues/:slug - Update league (superAdmin only)
router.put("/:slug", authenticateToken, requireSuperAdmin, upload.single("icon"), async (req, res) => {
  try {
    const competition = await Competition.findOne({ league: req.params.slug });

    if (!competition) {
      // Delete uploaded file if league not found
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: "League not found" });
    }

    const { slug, apiUrl, referer, arabicName } = req.body;

    // Validate required fields
    if (!slug || !apiUrl || !referer) {
      // Delete uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        error: "slug, apiUrl, and referer are required",
      });
    }

    // If slug is being changed, check if new slug already exists
    if (slug !== req.params.slug) {
      const existingLeague = await Competition.findOne({ league: slug });
      if (existingLeague) {
        // Delete uploaded file if slug exists
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          error: `League with slug "${slug}" already exists`,
        });
      }
    }

    // Update fields
    competition.league = slug;
    competition.apiUrl = apiUrl;
    competition.referer = referer;
    competition.arabicName = arabicName || "";

    // Update icon if new file was uploaded
    if (req.file) {
      // Delete old icon file if it exists
      if (competition.iconUrl && competition.iconUrl.startsWith("/uploads/icons/")) {
        const oldIconPath = path.join(__dirname, "..", competition.iconUrl);
        if (fs.existsSync(oldIconPath)) {
          try {
            fs.unlinkSync(oldIconPath);
          } catch (error) {
            console.error("Error deleting old icon:", error);
          }
        }
      }
      competition.iconUrl = `/uploads/icons/${req.file.filename}`;
    }

    await competition.save();

    res.json(competition);
  } catch (error) {
    // Delete uploaded file if save fails
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Error updating league:", error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/leagues/:slug/toggle - Toggle isHidden status (superAdmin only)
router.patch("/:slug/toggle", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const competition = await Competition.findOne({ league: req.params.slug });

    if (!competition) {
      return res.status(404).json({ error: "League not found" });
    }

    competition.isHidden = !competition.isHidden;
    await competition.save();

    res.json(competition);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

