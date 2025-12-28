import Violation from "../models/Violation.js";

/**
 * Log a violation change to the audit log
 * @param {string} violationId - The violation _id
 * @param {string} action - Action type: 'created', 'updated', 'deleted', 'status_changed', 'note_added', 'field_updated'
 * @param {Object} options - Additional logging options
 * @param {Object} options.user - User object from req.user (optional)
 * @param {string} options.field - Field name that changed (for field_updated)
 * @param {*} options.oldValue - Old value (for field_updated)
 * @param {*} options.newValue - New value (for field_updated)
 * @param {Object} options.changes - Full changes object (for complex updates)
 * @param {Object} options.metadata - Metadata object with ip, userAgent, etc.
 */
export const logViolationChange = async (violationId, action, options = {}) => {
  try {
    const {
      user = null,
      field = null,
      oldValue = null,
      newValue = null,
      changes = {},
      metadata = {},
    } = options;

    const logEntry = {
      action,
      userId: user?.userId || null,
      userName: user?.username || "System",
      timestamp: new Date(),
      ...(field && { field }),
      ...(oldValue !== null && { oldValue }),
      ...(newValue !== null && { newValue }),
      ...(Object.keys(changes).length > 0 && { changes }),
      ...(Object.keys(metadata).length > 0 && { metadata }),
    };

    await Violation.findByIdAndUpdate(
      violationId,
      {
        $push: {
          auditLog: {
            $each: [logEntry],
            $slice: -100, // Keep only the last 100 log entries
          },
        },
      },
      { new: true }
    );
  } catch (error) {
    // Don't throw error - logging should not break the main operation
    console.error("Error logging violation change:", error);
  }
};
