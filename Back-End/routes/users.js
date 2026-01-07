import express from "express";
import User from "../models/User.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Middleware to check if user is superAdmin
const requireSuperAdmin = async (req, res, next) => {
  try {
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

// GET /api/users - Get all users (superAdmin only)
router.get("/", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users - Create new user (superAdmin only)
router.post("/", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { username, email, password, confirmPassword, role, leagues } = req.body;

    // Validation
    if (!username || !email || !password || !confirmPassword || !role) {
      return res.status(400).json({
        error:
          "All fields are required: username, email, password, confirmPassword, role",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters long",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        error: "Passwords do not match",
      });
    }

    if (!["viewer", "employee"].includes(role)) {
      return res.status(400).json({
        error: "Invalid role. Must be one of: viewer, employee. SuperAdmin role cannot be assigned to new users.",
      });
    }

    // Validate leagues for employees
    const validLeagues = ["saudi", "saudi-super-cup", "spanish-super-cup"];
    if (role === "employee") {
      if (!leagues || !Array.isArray(leagues) || leagues.length === 0) {
        return res.status(400).json({
          error: "Employees must have at least one league assigned",
        });
      }
      // Validate each league
      const invalidLeagues = leagues.filter(
        (league) => !validLeagues.includes(league)
      );
      if (invalidLeagues.length > 0) {
        return res.status(400).json({
          error: `Invalid leagues: ${invalidLeagues.join(", ")}. Valid leagues are: ${validLeagues.join(", ")}`,
        });
      }
    } else if (leagues && Array.isArray(leagues) && leagues.length > 0) {
      return res.status(400).json({
        error: "Leagues can only be assigned to employees",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: "Email already registered" });
      }
      if (existingUser.username === username) {
        return res.status(400).json({ error: "Username already taken" });
      }
    }

    // Create new user
    const user = new User({
      username,
      email,
      password, // Will be hashed by pre-save hook
      role,
      leagues: role === "employee" ? leagues : [],
    });

    await user.save();

    // Return user data (password excluded by toJSON method)
    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        leagues: user.leagues || [],
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        error: `${field} is already registered`,
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/users/:id - Update user (superAdmin only)
router.put("/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { username, email, password, confirmPassword, role, leagues } = req.body;
    const userId = req.params.id;

    // Validation
    if (!username || !email || !role) {
      return res.status(400).json({
        error: "Username, email, and role are required",
      });
    }

    if (!["superAdmin", "viewer", "employee"].includes(role)) {
      return res.status(400).json({
        error: "Invalid role. Must be one of: superAdmin, viewer, employee",
      });
    }

    // Validate leagues for employees
    const validLeagues = ["saudi", "saudi-super-cup", "spanish-super-cup"];
    if (role === "employee") {
      if (!leagues || !Array.isArray(leagues) || leagues.length === 0) {
        return res.status(400).json({
          error: "Employees must have at least one league assigned",
        });
      }
      // Validate each league
      const invalidLeagues = leagues.filter(
        (league) => !validLeagues.includes(league)
      );
      if (invalidLeagues.length > 0) {
        return res.status(400).json({
          error: `Invalid leagues: ${invalidLeagues.join(", ")}. Valid leagues are: ${validLeagues.join(", ")}`,
        });
      }
    } else if (leagues && Array.isArray(leagues) && leagues.length > 0) {
      return res.status(400).json({
        error: "Leagues can only be assigned to employees",
      });
    }

    // If password is provided, validate it
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          error: "Password must be at least 6 characters long",
        });
      }
      if (password !== confirmPassword) {
        return res.status(400).json({
          error: "Passwords do not match",
        });
      }
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prevent changing superAdmin role
    if (user.role === "superAdmin" && role !== "superAdmin") {
      return res.status(400).json({
        error: "Cannot change the role of a superAdmin user",
      });
    }

    // If password is provided, require old password
    if (password) {
      const { oldPassword } = req.body;
      if (!oldPassword) {
        return res.status(400).json({
          error: "Old password is required to change password",
        });
      }

      // Verify old password
      const isOldPasswordValid = await user.comparePassword(oldPassword);
      if (!isOldPasswordValid) {
        return res.status(401).json({
          error: "Old password is incorrect",
        });
      }
    }

    // Check if email or username is already taken by another user
    const existingUser = await User.findOne({
      _id: { $ne: userId },
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: "Email already registered" });
      }
      if (existingUser.username === username) {
        return res.status(400).json({ error: "Username already taken" });
      }
    }

    // Update user
    user.username = username;
    user.email = email;
    // Only update role if user is not superAdmin
    if (user.role !== "superAdmin") {
      user.role = role;
    }
    // Update leagues based on role
    if (role === "employee") {
      user.leagues = leagues;
    } else {
      user.leagues = [];
    }
    if (password) {
      user.password = password; // Will be hashed by pre-save hook
    }

    await user.save();

    // Return updated user data
    res.json({
      message: "User updated successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        leagues: user.leagues || [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        error: `${field} is already registered`,
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/users/:id - Delete user (superAdmin only)
router.delete(
  "/:id",
  authenticateToken,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const userId = req.params.id;

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Prevent deleting yourself
      if (user._id.toString() === req.user.userId) {
        return res
          .status(400)
          .json({ error: "Cannot delete your own account" });
      }

      await User.findByIdAndDelete(userId);

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
