import BulkViolation from "../models/BulkViolation.js";
import Violation from "../models/Violation.js";

/**
 * Calculate statistics for a bulk violation based on its associated violations
 * @param {string} bulkId - The bulk violation ID
 * @returns {Object} Statistics object
 */
export async function calculateBulkStats(bulkId) {
  try {
    // Get all violations with this bulkId
    const violations = await Violation.find({ bulkId }).lean();

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
      totalViews: 0,
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

      // Add views count (parse views which may be strings like "1.5K" or "100")
      if (violation.views && violation.views !== "0") {
        let viewsValue = 0;
        if (typeof violation.views === "string") {
          // Handle "K" suffix (e.g., "1.5K" = 1500)
          if (violation.views.includes("K") || violation.views.includes("k")) {
            viewsValue =
              (parseFloat(violation.views.replace(/[Kk,]/g, "")) || 0) * 1000;
          } else {
            // Remove commas and parse as number
            viewsValue =
              parseFloat(violation.views.replace(/[^0-9.]/g, "")) || 0;
          }
        } else {
          viewsValue = violation.views;
        }
        stats.totalViews += viewsValue;
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
      return null;
    }

    return updatedBulk;
  } catch (error) {
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

    // Calculate initial stats
    const stats = await calculateBulkStats(bulkId);

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
    return saved;
  } catch (error) {
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
    throw error;
  }
}
