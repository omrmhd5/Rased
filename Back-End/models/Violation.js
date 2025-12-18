import mongoose from "mongoose";

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["reported", "active", "blocked", "removed", "review", "pending"],
      required: true,
    },
    changedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false }
);

const violationSchema = new mongoose.Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      required: true,
      index: true,
    },
    platformId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["reported", "active", "blocked", "removed", "review", "pending"],
      required: true,
      default: "reported",
      index: true,
    },
    statusBadge: {
      type: String,
      enum: ["reported", "active", "blocked", "review", "pending"],
      required: true,
      default: "reported",
    },
    type: {
      type: String,
      enum: ["Live", "Highlights", "Other"],
      required: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    accountHandle: {
      type: String,
      trim: true,
    },
    views: {
      type: String,
      default: "0",
    },
    timeAdded: {
      type: Date,
      required: true,
      default: Date.now,
    },
    blockedAt: {
      type: Date,
    },
    stillActive: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      trim: true,
    },
    statusHistory: [statusHistorySchema],
  },
  {
    timestamps: true,
  }
);

// Indexes
violationSchema.index({ matchId: 1, platformId: 1 });
violationSchema.index({ status: 1, type: 1 });
violationSchema.index({ timeAdded: -1 });
violationSchema.index({ url: 1 });

// Virtual for time (formatted)
violationSchema.virtual("time").get(function () {
  return new Date(this.timeAdded).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
});

// Virtual for addedAgo
violationSchema.virtual("addedAgo").get(function () {
  const now = new Date();
  const added = new Date(this.timeAdded);
  const diffMs = now - added;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
});

// Virtual for blockedIn
violationSchema.virtual("blockedIn").get(function () {
  if (!this.blockedAt || !this.timeAdded) return null;

  const blocked = new Date(this.blockedAt);
  const added = new Date(this.timeAdded);
  const diffMs = blocked - added;
  const diffMins = (diffMs / 60000).toFixed(1);

  return `${diffMins} min`;
});

// Ensure virtuals are included in JSON
violationSchema.set("toJSON", { virtuals: true });
violationSchema.set("toObject", { virtuals: true });

// Pre-save middleware to update statusBadge
violationSchema.pre("save", function (next) {
  if (this.status === "removed") {
    this.statusBadge = "blocked";
  } else if (
    ["reported", "active", "blocked", "review", "pending"].includes(this.status)
  ) {
    this.statusBadge = this.status;
  }
  next();
});

// Pre-save middleware to add status history entry
violationSchema.pre("save", function (next) {
  if (this.isNew || this.isModified("status")) {
    if (!this.statusHistory) {
      this.statusHistory = [];
    }
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
    });
  }
  next();
});

const Violation = mongoose.model("Violation", violationSchema);

export default Violation;

