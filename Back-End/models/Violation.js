import mongoose from "mongoose";

const violationSchema = new mongoose.Schema(
  {
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
    violationUrl: {
      type: String,
      required: true,
      trim: true,
    },
    accountChannel: {
      type: String,
      required: true,
      trim: true,
    },
    bulkId: {
      type: String,
      required: false,
      trim: true,
      index: true, // Index for efficient querying of bulk violations
    },
    contentType: {
      type: String,
      enum: ["Live", "Highlights", "Other"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Blocked", "Removed", "Under Review"],
      required: true,
      default: "Active",
    },
    views: {
      type: String,
      default: "0",
      trim: true,
    },
    timeAdded: {
      type: Date,
      required: true,
      default: Date.now,
    },
    blockedAt: {
      type: Date,
      required: false,
    },
    notes: {
      type: [String],
      default: [],
    },
    auditLog: [
      {
        action: {
          type: String,
          enum: [
            "created",
            "updated",
            "deleted",
            "status_changed",
            "note_added",
            "field_updated",
          ],
          required: true,
        },
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        userName: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        field: String, // Which field changed (for updates)
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        changes: Object, // Full diff object for complex updates
      },
    ],
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Indexes
violationSchema.index({ matchId: 1, platformId: 1 });
violationSchema.index({ status: 1, contentType: 1 }); // Compound index covers status-only queries too
violationSchema.index({ matchId: 1, status: 1 }); // For dashboard stats aggregation
violationSchema.index({ timeAdded: -1 });
violationSchema.index({ violationUrl: 1 });
violationSchema.index({ "auditLog.timestamp": -1 }); // Index for audit log queries

const Violation = mongoose.model("Violation", violationSchema);

export default Violation;
