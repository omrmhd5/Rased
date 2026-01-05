import express from "express";
import WhitelistedAccount from "../models/WhitelistedAccount.js";
import { optionalAuth } from "../middleware/auth.js";

const router = express.Router();

// Apply optional auth to all routes
router.use(optionalAuth);

// GET /api/whitelisted-accounts - Get all whitelisted accounts
router.get("/", async (req, res) => {
  try {
    const accounts = await WhitelistedAccount.find()
      .sort({ accountChannel: 1 })
      .lean();
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/whitelisted-accounts/:id - Get single whitelisted account
router.get("/:id", async (req, res) => {
  try {
    const account = await WhitelistedAccount.findById(req.params.id).lean();
    if (!account) {
      return res.status(404).json({ error: "Whitelisted account not found" });
    }
    res.json(account);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid account ID" });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/whitelisted-accounts - Create new whitelisted account
router.post("/", async (req, res) => {
  try {
    const { accountChannel, platforms, notes } = req.body;

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

    const account = new WhitelistedAccount({
      accountChannel: accountChannel.trim(),
      platforms: platforms,
      notes: notes ? notes.trim() : "",
    });

    const savedAccount = await account.save();
    res.status(201).json(savedAccount);
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

// PUT /api/whitelisted-accounts/:id - Update whitelisted account
router.put("/:id", async (req, res) => {
  try {
    const { accountChannel, platforms, notes } = req.body;

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

    const account = await WhitelistedAccount.findByIdAndUpdate(
      req.params.id,
      {
        accountChannel: accountChannel.trim(),
        platforms: platforms,
        notes: notes ? notes.trim() : "",
      },
      { new: true, runValidators: true }
    );

    if (!account) {
      return res.status(404).json({ error: "Whitelisted account not found" });
    }

    res.json(account);
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

// DELETE /api/whitelisted-accounts/:id - Delete whitelisted account
router.delete("/:id", async (req, res) => {
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

