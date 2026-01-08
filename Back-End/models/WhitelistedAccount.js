import mongoose from "mongoose";

const whitelistedAccountSchema = new mongoose.Schema(
  {
    accountChannel: {
      type: String,
      required: true,
      trim: true,
    },
    platforms: {
      type: [String],
      required: true,
      default: [],
      validate: {
        validator: function (platforms) {
          return Array.isArray(platforms) && platforms.length > 0;
        },
        message: "At least one platform must be selected",
      },
    },
    platformNames: {
      type: Map,
      of: String,
      default: {},
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Compound index to ensure unique accountChannel
whitelistedAccountSchema.index({ accountChannel: 1 }, { unique: true });

const WhitelistedAccount = mongoose.model(
  "WhitelistedAccount",
  whitelistedAccountSchema
);

export default WhitelistedAccount;

