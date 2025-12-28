import mongoose from "mongoose";

const deletedViolationLogSchema = new mongoose.Schema(
  {
    externalMatchId: {
      type: String,
      required: true,
      index: true,
    },
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
    changes: Object, // Contains platformId and platformName
  },
  {
    timestamps: true,
  }
);

// Indexes
deletedViolationLogSchema.index({ externalMatchId: 1, timestamp: -1 });
deletedViolationLogSchema.index({ timestamp: -1 });

const DeletedViolationLog = mongoose.model(
  "DeletedViolationLog",
  deletedViolationLogSchema
);

export default DeletedViolationLog;
