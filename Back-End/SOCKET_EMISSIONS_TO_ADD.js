// ADD THIS IMPORT AT THE TOP OF violations.js (after line 8)
import { emitViolationEvent, emitBulkEvent } from "../utils/socket.js";

// ============================================
// BULK VIOLATIONS CREATE - Add after line 820
// ============================================
// After: res.status(201).json({ bulkId, count, violations });
// Add this code:

// Emit bulk violation created event
try {
  emitBulkEvent(externalMatchId || internalMatchId, "bulk-violations-added", {
    bulkId,
    count: populatedViolations.length,
    violations: populatedViolations,
    platformId,
    platformName,
  });
} catch (error) {
  console.error("Error emitting bulk-violations-added event:", error);
}

// ============================================
// VIOLATION UPDATE - Add after line 1358 (before res.json(populated))
// ============================================
// After: await updateMatchContentTypeCounts(violation.matchId);
// Add this code:

// Emit violation updated event
try {
  const emitMatchId = violation.externalMatchId || violation.matchId;
  emitViolationEvent(emitMatchId, "violation-updated", {
    violation: populated,
  });
} catch (error) {
  console.error("Error emitting violation-updated event:", error);
}

// ============================================
// VIOLATION DELETE - Add after line 1438 (before res.json({ message }))
// ============================================
// After: await updateMatchContentTypeCounts(matchId);
// Add this code:

// Emit violation deleted event
try {
  emitViolationEvent(externalMatchId || matchId, "violation-deleted", {
    violationId: req.params.id,
    platformId: violation.platformId,
    bulkId: bulkId || undefined,
  });
} catch (error) {
  console.error("Error emitting violation-deleted event:", error);
}

// ============================================
// BULK STATUS CHANGE - Find the bulk status change endpoint
// ============================================
// After successful bulk status update, add:

try {
  emitBulkEvent(matchId, "bulk-status-changed", {
    bulkId,
    newStatus,
    count: updatedCount,
  });
} catch (error) {
  console.error("Error emitting bulk-status-changed event:", error);
}

// ============================================
// BULK DELETE - Find the bulk delete endpoint
// ============================================
// After successful bulk delete, add:

try {
  emitBulkEvent(matchId, "bulk-violations-deleted", {
    bulkId,
    count: deletedCount,
  });
} catch (error) {
  console.error("Error emitting bulk-violations-deleted event:", error);
}
