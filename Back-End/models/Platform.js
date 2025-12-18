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
    color: {
      type: String,
      required: true,
    },
    icon: {
      type: String, // Store icon name (e.g., 'Twitter', 'Youtube')
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Note: No need for explicit index on 'id' since 'unique: true' already creates an index

const Platform = mongoose.model("Platform", platformSchema);

export default Platform;
