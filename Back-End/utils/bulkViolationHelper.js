import BulkViolation from "../models/BulkViolation.js";
import Violation from "../models/Violation.js";

/**
 * Calculate statistics for a bulk violation based on its associated violations
 * @param {string} bulkId - The bulk violation ID
 * @returns {Object} Statistics object
 */
export async function calculateBulkStats(bulkId) {
  try {
    console.log(`[calculateBulkStats] Starting for bulkId: ${bulkId}`);
    
    // Get all violations with this bulkId
    const violations = await Violation.find({ bulkId }).lean();

    console.log(`[calculateBulkStats] Found ${violations.length} violations with bulkId: ${bulkId}`);
    if (violations.length > 0) {
      console.log(`[calculateBulkStats] Violations:`, JSON.stringify(violations.slice(0, 2), null, 2)); // Log first 2
    }

    // Initialize counts
    const stats = {
      totalCount: violations.length,
      activeCount: 0,
      blockedCount: 0,
      removedCount: 0,
      underReviewCount: 0,
      liveCount: 0,
      highlightsCount: 0,
      othersCount: 0,
      avgBlockTime: null,
      blockSuccessRate: 0,
      violationIds: violations.map((v) => v._id),
    };

    // Arrays to calculate block time
    const blockTimes = [];

    // Count statuses and content types
    violations.forEach((violation) => {
      // Status counts
      switch (violation.status) {
        case "Active":
          stats.activeCount++;
          break;
        case "Blocked":
          stats.blockedCount++;
          // Calculate block time if both timeAdded and blockedAt exist
          if (violation.timeAdded && violation.blockedAt) {
            const blockTime =
              new Date(violation.blockedAt) - new Date(violation.timeAdded);
            if (blockTime >= 0) {
              blockTimes.push(blockTime);
            }
          }
          break;
        case "Removed":
          stats.removedCount++;
          break;
        case "Under Review":
          stats.underReviewCount++;
          break;
      }

      // Content type counts
      switch (violation.contentType) {
        case "Live":
          stats.liveCount++;
          break;
        case "Highlights":
          stats.highlightsCount++;
          break;
        case "Other":
          stats.othersCount++;
          break;
      }
    });

    // Calculate average block time
    if (blockTimes.length > 0) {
      const totalBlockTime = blockTimes.reduce((sum, time) => sum + time, 0);
      // Convert from milliseconds to minutes
      stats.avgBlockTime = Math.round(
        totalBlockTime / blockTimes.length / 60000,
      );
    }

    // Calculate block success rate (percentage of blocked + removed out of total)
    const successfulBlocks = stats.blockedCount + stats.removedCount;
    stats.blockSuccessRate =
      stats.totalCount > 0
        ? Math.round((successfulBlocks / stats.totalCount) * 100 * 100) / 100
        : 0;

    return stats;
  } catch (error) {
    console.error("Error calculating bulk stats:", error);
    throw error;
  }
}

/**
 * Update a bulk violation's statistics
 * @param {string} bulkId - The bulk violation ID
 * @returns {Object} Updated bulk violation document
 */
export async function updateBulkViolationStats(bulkId) {
  try {
    if (!bulkId) {
      return null;
    }

    const stats = await calculateBulkStats(bulkId);

    if (!stats) {
      console.warn(`No violations found for bulkId: ${bulkId}`);
      return null;
    }

    // Update the bulk violation document
    const updatedBulk = await BulkViolation.findOneAndUpdate(
      { bulkId },
      {
        $set: {
          ...stats,
          lastUpdated: new Date(),
        },
      },
      { new: true, runValidators: true },
    );

    if (!updatedBulk) {
      console.warn(`BulkViolation not found for bulkId: ${bulkId}`);
      return null;
    }

    return updatedBulk;
  } catch (error) {
    console.error("Error updating bulk violation stats:", error);
    throw error;
  }
}

/**
 * Create a new bulk violation entry
 * @param {Object} data - Bulk violation data
 * @returns {Object} Created bulk violation document
 */
export async function createBulkViolation(data) {
  try {
    const {
      bulkId,
      matchId,
      matchName,
      externalMatchId,
      platformId,
      platformName,
      accountChannel,
      contentType,
      violationIds,
      createdBy,
      createdByName,
      timeAdded,
    } = data;

    console.log(`[createBulkViolation] Starting for bulkId: ${bulkId}, matchId: ${matchId}, platformId: ${platformId}`);

    // Calculate initial stats
    const stats = await calculateBulkStats(bulkId);

    console.log(`[createBulkViolation] Calculated stats:`, JSON.stringify(stats, null, 2));

    if (!stats) {
      throw new Error("No violations found for bulk creation");
    }

    const bulkViolation = new BulkViolation({
      bulkId,
      matchId,
      matchName,
      externalMatchId,
      platformId,
      platformName,
      accountChannel,
      contentType,
      ...stats,
      createdBy,
      createdByName,
      timeAdded: timeAdded || new Date(),
      lastUpdated: new Date(),
    });

    const saved = await bulkViolation.save();
    console.log(`[createBulkViolation] BulkViolation saved with _id: ${saved._id}`);
    return saved;
  } catch (error) {
    console.error("Error creating bulk violation:", error);
    throw error;
  }
}

/**
 * Delete a bulk violation entry (when all its violations are deleted)
 * @param {string} bulkId - The bulk violation ID
 * @returns {Object} Deleted bulk violation document
 */
export async function deleteBulkViolation(bulkId) {
  try {
    const deleted = await BulkViolation.findOneAndDelete({ bulkId });
    return deleted;
  } catch (error) {
    console.error("Error deleting bulk violation:", error);
    throw error;
  }
}
