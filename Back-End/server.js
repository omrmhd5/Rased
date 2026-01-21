import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createServer } from "http";
import { initializeSocket } from "./utils/socket.js";
import matchRoutes from "./routes/matches.js";
import violationRoutes from "./routes/violations.js";
import platformRoutes from "./routes/platforms.js";
import platformByMatchRoutes from "./routes/platformByMatch.js";
import authRoutes from "./routes/auth.js";
import settingsRoutes from "./routes/settings.js";
import whitelistedAccountsRoutes from "./routes/whitelistedAccounts.js";
import usersRoutes from "./routes/users.js";
import leagueRoutes from "./routes/leagues.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/rased";

// In production, the frontend is served by this same backend,
// so FRONTEND_URL becomes optional. Keep it for dev CORS.
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Allowed origins (dev only; in prod you’ll likely hit same origin)
const allowedOrigins = [
  "https://rased.itsyaa.dev",
  "http://rased.itsyaa.dev",
  FRONTEND_URL,

  // dev
  "http://localhost:5173",
  "http://localhost:5137",
  "http://localhost:3000",
  "http://localhost:5174",
];

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

// Serve uploaded files statically
app.use("/uploads", express.static(join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/violations", violationRoutes);
app.use("/api/platforms", platformRoutes);
app.use("/api/platform-by-match", platformByMatchRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/whitelisted-accounts", whitelistedAccountsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/leagues", leagueRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Rased API is running" });
});

if (process.env.NODE_ENV === "production") {
  /**
   * Serve Front-End build (Vite dist)
   * Folder: C:\Users\Administrator\Desktop\Rased\Front-End\dist
   * Relative from Back-End: ..\Front-End\dist
   */
  const frontendDistPath = join(__dirname, "..", "Front-End", "dist");

  app.use(express.static(frontendDistPath));

  // SPA fallback (must be AFTER /api routes)
  app.get("*", (req, res) => {
    res.sendFile(join(frontendDistPath, "index.html"));
  });
}

// Error handling middleware (keep after routes)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
initializeSocket(httpServer, allowedOrigins);

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
      console.log(`🔌 WebSocket available at ws://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  });

export default app;
