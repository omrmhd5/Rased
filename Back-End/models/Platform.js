import mongoose from "mongoose";

const platformSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    iconUrl: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

// Note: No need for explicit index on 'id' since 'unique: true' already creates an index

const Platform = mongoose.model("Platform", platformSchema);

export default Platform;
