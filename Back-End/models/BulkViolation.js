import mongoose from "mongoose";

const bulkViolationSchema = new mongoose.Schema(
  {
    bulkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      required: true,
      index: true,
    },
    matchName: {
      type: String,
      required: true,
      trim: true,
    },
    externalMatchId: {
      type: String,
      trim: true,
      index: true,
    },
    platformId: {
      type: String,
      required: true,
      index: true,
    },
    platformName: {
      type: String,
      required: true,
      trim: true,
    },
    accountChannel: {
      type: String,
      required: true,
      trim: true,
    },
    contentType: {
      type: String,
      enum: ["Live", "Highlights", "Other"],
      required: true,
    },
    // Total counts
    totalCount: {
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
    // Block statistics
    avgBlockTime: {
      type: Number, // Average time in minutes from timeAdded to blockedAt
      default: null,
    },
    blockSuccessRate: {
      type: Number, // Percentage of violations that got blocked
      default: 0,
    },
    totalViews: {
      type: Number, // Sum of views from all child violations
      default: 0,
    },
    // Array of violation IDs
    violationIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Violation",
      },
    ],
    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdByName: {
      type: String,
    },
    timeAdded: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    // Audit log for tracking changes
    auditLog: [
      {
        action: {
          type: String,
          enum: ["created", "status_changed"],
          required: true,
        },
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        userName: {
          type: String,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        oldValue: {
          type: mongoose.Schema.Types.Mixed,
        },
        newValue: {
          type: mongoose.Schema.Types.Mixed,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient querying
bulkViolationSchema.index({ matchId: 1, platformId: 1 });
bulkViolationSchema.index({ bulkId: 1 }, { unique: true });
bulkViolationSchema.index({ timeAdded: -1 });

const BulkViolation = mongoose.model("BulkViolation", bulkViolationSchema);

export default BulkViolation;
