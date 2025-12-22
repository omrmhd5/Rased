import mongoose from "mongoose";

const violationSchema = new mongoose.Schema({
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
  contentType: {
    type: String,
    enum: ["Live", "Highlights", "Other"],
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "blocked", "removed", "under review"],
    required: true,
    default: "active",
    index: true,
  },
  views: {
    type: String,
    trim: true,
  },
  timeAdded: {
    type: Date,
    required: true,
    default: Date.now,
  },
  active: {
    type: Boolean,
    required: true,
    default: true,
  },
  notes: {
    type: [String],
    default: [],
  },
});

// Indexes
violationSchema.index({ matchId: 1, platformId: 1 });
violationSchema.index({ status: 1, contentType: 1 });
violationSchema.index({ timeAdded: -1 });
violationSchema.index({ violationUrl: 1 });

const Violation = mongoose.model("Violation", violationSchema);

export default Violation;
