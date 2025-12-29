import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    // Use a fixed identifier to ensure singleton pattern
    identifier: {
      type: String,
      default: "singleton",
      unique: true,
      required: true,
    },
    targetMins: {
      type: Number,
      default: 15,
      min: 1,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

// Static method to get or create the singleton settings
settingsSchema.statics.getSingleton = async function () {
  let settings = await this.findOne({ identifier: "singleton" });
  if (!settings) {
    settings = await this.create({ identifier: "singleton", targetMins: 15 });
  }
  return settings;
};

// Static method to update the singleton settings
settingsSchema.statics.updateSingleton = async function (updates) {
  const settings = await this.findOneAndUpdate(
    { identifier: "singleton" },
    { $set: updates },
    { new: true, upsert: true, runValidators: true }
  );
  return settings;
};

const Settings = mongoose.model("Settings", settingsSchema);

export default Settings;
