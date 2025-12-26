import mongoose from "mongoose";

const platformByMatchSchema = new mongoose.Schema(
  {
    platformId: {
      type: String,
      required: true,
      index: true,
    },
    platformObjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Platform",
      index: true,
    },
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      required: true,
      index: true,
    },
    externalMatchId: {
      type: String,
      required: true,
      index: true,
    },
    // Content type counts
    liveCount: {
      type: Number,
      default: 0,
    },
    highlightsCount: {
      type: Number,
      default: 0,
    },
    othersCount: {
      type: Number,
      default: 0,
    },
    // View and violation counts
    totalViews: {
      type: Number,
      default: 0,
    },
    totalViolations: {
      type: Number,
      default: 0,
    },
    // Status counts
    activeCount: {
      type: Number,
      default: 0,
    },
    blockedCount: {
      type: Number,
      default: 0,
    },
    removedCount: {
      type: Number,
      default: 0,
    },
    underReviewCount: {
      type: Number,
      default: 0,
    },
    // Calculated metrics
    avgBlockTime: {
      type: Number,
      default: 0, // in minutes
    },
    blockSuccessRate: {
      type: Number,
      default: 0, // percentage (0-100)
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique platform-match combination
platformByMatchSchema.index(
  { platformId: 1, externalMatchId: 1 },
  { unique: true }
);
platformByMatchSchema.index({ matchId: 1, platformId: 1 });

const PlatformByMatch = mongoose.model(
  "PlatformByMatch",
  platformByMatchSchema
);

export default PlatformByMatch;
