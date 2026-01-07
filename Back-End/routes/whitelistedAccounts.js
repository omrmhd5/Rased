import express from "express";
import WhitelistedAccount from "../models/WhitelistedAccount.js";
import User from "../models/User.js";
import { optionalAuth, authenticateToken } from "../middleware/auth.js";

const router = express.Router();

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

// GET /api/whitelisted-accounts - Get all whitelisted accounts (viewing allowed for all)
router.get("/", optionalAuth, async (req, res) => {
  try {
    const accounts = await WhitelistedAccount.find()
      .sort({ accountChannel: 1 });
    
    // Convert to plain objects and handle Map conversion
    const accountsWithPlatformNames = accounts.map((account) => {
      const accountObj = account.toObject ? account.toObject() : account;
      
      // Handle platformNames - convert Map to object if needed
      let platformNamesObj = {};
      if (accountObj.platformNames) {
        if (accountObj.platformNames instanceof Map) {
          platformNamesObj = Object.fromEntries(accountObj.platformNames);
        } else if (typeof accountObj.platformNames === "object" && accountObj.platformNames !== null && !Array.isArray(accountObj.platformNames)) {
          platformNamesObj = accountObj.platformNames;
        }
      }
      
      return {
        ...accountObj,
        platformNames: platformNamesObj,
      };
    });
    res.json(accountsWithPlatformNames);
  } catch (error) {
    console.error("Error fetching whitelisted accounts:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/whitelisted-accounts/:id - Get single whitelisted account (viewing allowed for all)
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const account = await WhitelistedAccount.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ error: "Whitelisted account not found" });
    }
    
    // Convert to plain object and handle Map conversion
    const accountObj = account.toObject ? account.toObject() : account;
    
    // Handle platformNames - convert Map to object if needed
    let platformNamesObj = {};
    if (accountObj.platformNames) {
      if (accountObj.platformNames instanceof Map) {
        platformNamesObj = Object.fromEntries(accountObj.platformNames);
      } else if (typeof accountObj.platformNames === "object" && accountObj.platformNames !== null && !Array.isArray(accountObj.platformNames)) {
        platformNamesObj = accountObj.platformNames;
      }
    }
    
    const accountWithPlatformNames = {
      ...accountObj,
      platformNames: platformNamesObj,
    };
    res.json(accountWithPlatformNames);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid account ID" });
    }
    console.error("Error fetching whitelisted account:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/whitelisted-accounts - Create new whitelisted account (superAdmin only)
router.post("/", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { accountChannel, platforms, platformNames, notes } = req.body;

    if (!accountChannel || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({
        error: "Missing required fields: accountChannel and platforms (at least one platform required)",
      });
    }

    // Check if account with this channel already exists
    const existing = await WhitelistedAccount.findOne({
      accountChannel: accountChannel.trim(),
    });
    if (existing) {
      return res.status(400).json({
        error: "Account with this channel already exists",
      });
    }

    // Convert platformNames object to Map if provided
    const platformNamesMap = new Map();
    if (platformNames && typeof platformNames === "object") {
      Object.entries(platformNames).forEach(([platformId, name]) => {
        if (name && name.trim()) {
          platformNamesMap.set(platformId, name.trim());
        }
      });
    }

    const account = new WhitelistedAccount({
      accountChannel: accountChannel.trim(),
      platforms: platforms,
      platformNames: platformNamesMap,
      notes: notes ? notes.trim() : "",
    });

    const savedAccount = await account.save();
    // Convert Map to object for JSON response
    const accountObj = savedAccount.toObject();
    accountObj.platformNames = Object.fromEntries(accountObj.platformNames || new Map());
    res.status(201).json(accountObj);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        error: "Account with this channel already exists",
      });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/whitelisted-accounts/:id - Update whitelisted account (superAdmin only)
router.put("/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { accountChannel, platforms, platformNames, notes } = req.body;

    if (!accountChannel || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({
        error: "Missing required fields: accountChannel and platforms (at least one platform required)",
      });
    }

    // Check if another account with this channel exists (excluding current account)
    const existing = await WhitelistedAccount.findOne({
      accountChannel: accountChannel.trim(),
      _id: { $ne: req.params.id },
    });
    if (existing) {
      return res.status(400).json({
        error: "Account with this channel already exists",
      });
    }

    // Convert platformNames object to Map if provided
    const platformNamesMap = new Map();
    if (platformNames && typeof platformNames === "object") {
      Object.entries(platformNames).forEach(([platformId, name]) => {
        if (name && name.trim()) {
          platformNamesMap.set(platformId, name.trim());
        }
      });
    }

    const account = await WhitelistedAccount.findByIdAndUpdate(
      req.params.id,
      {
        accountChannel: accountChannel.trim(),
        platforms: platforms,
        platformNames: platformNamesMap,
        notes: notes ? notes.trim() : "",
      },
      { new: true, runValidators: true }
    );

    if (!account) {
      return res.status(404).json({ error: "Whitelisted account not found" });
    }

    // Convert Map to object for JSON response
    const accountObj = account.toObject();
    accountObj.platformNames = Object.fromEntries(accountObj.platformNames || new Map());
    res.json(accountObj);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid account ID" });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        error: "Account with this channel already exists",
      });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/whitelisted-accounts/:id - Delete whitelisted account (superAdmin only)
router.delete("/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const account = await WhitelistedAccount.findByIdAndDelete(req.params.id);
    if (!account) {
      return res.status(404).json({ error: "Whitelisted account not found" });
    }
    res.json({ message: "Whitelisted account deleted successfully" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid account ID" });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;

