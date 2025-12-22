import mongoose from "mongoose";

const competitionSchema = new mongoose.Schema(
  {
    externalId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    knownName: {
      type: String,
      trim: true,
    },
    competitionCode: {
      type: String,
      trim: true,
    },
    competitionFormat: {
      type: String,
      trim: true,
    },
    league: {
      type: String,
      enum: ["saudi", "italian", "spanish"],
      required: true,
      index: true,
    },
    country: {
      id: {
        type: String,
        trim: true,
      },
      name: {
        type: String,
        trim: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
competitionSchema.index({ league: 1, name: 1 });

const Competition = mongoose.model("Competition", competitionSchema);

export default Competition;



