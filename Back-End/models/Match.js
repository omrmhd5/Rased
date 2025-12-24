import mongoose from "mongoose";

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["upcoming", "live", "finished", "cancelled", "postponed"],
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

const matchSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },
    team1: {
      type: String,
      required: true,
      trim: true,
    },
    team2: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["upcoming", "live", "finished", "cancelled", "postponed"],
      default: "upcoming",
    },
    week: {
      type: String,
      trim: true,
    },
    competition: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Competition",
    },
    externalCompetitionId: {
      type: String,
      trim: true,
      index: true,
    },
    externalMatchId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    stadium: {
      type: String,
      trim: true,
    },
    // League is now derived from competition, but kept for backward compatibility and filtering
    league: {
      type: String,
      enum: ["saudi", "italian", "spanish"],
      index: true,
    },
    winner: {
      type: String,
      enum: ["home", "away", "draw"],
    },
    scores: {
      home: {
        type: Number,
      },
      away: {
        type: Number,
      },
    },
    statusHistory: [statusHistorySchema],
  },
  {
    timestamps: true,
  }
);

// Indexes
matchSchema.index({ date: -1 });
matchSchema.index({ status: 1 });
matchSchema.index({ team1: 1, team2: 1 });

// Virtual for match name
matchSchema.virtual("name").get(function () {
  return `${this.team1} vs ${this.team2}`;
});

// Ensure virtuals are included in JSON
matchSchema.set("toJSON", { virtuals: true });
matchSchema.set("toObject", { virtuals: true });

const Match = mongoose.model("Match", matchSchema);

export default Match;
