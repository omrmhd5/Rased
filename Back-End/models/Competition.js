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
    competitionType: {
      type: String,
      enum: ["league", "cup"],
      default: "league",
      trim: true,
    },
    league: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    apiUrl: {
      type: String,
      required: true,
      trim: true,
    },
    referer: {
      type: String,
      required: true,
      trim: true,
    },
    arabicName: {
      type: String,
      trim: true,
      default: "",
    },
    isHidden: {
      type: Boolean,
      default: false,
      index: true,
    },
    iconUrl: {
      type: String,
      trim: true,
      default: "",
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







