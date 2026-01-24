import Match from "../models/Match.js";
import Violation from "../models/Violation.js";
import BulkViolation from "../models/BulkViolation.js";
import PlatformByMatch from "../models/PlatformByMatch.js";

// Helper function to aggregate PlatformByMatch stats and update Match
async function updateMatchAggregatedStats(externalMatchId) {
  try {
    console.log(`[updateMatchAggregatedStats] Starting for externalMatchId: ${externalMatchId}`);
    
    const match = await Match.findOne({ externalMatchId });
    if (!match) {
      console.warn(`[updateMatchAggregatedStats] Match not found for externalMatchId: ${externalMatchId}`);
      return;
    }
    console.log(`[updateMatchAggregatedStats] Found match: ${match._id}`);

    // Aggregate all PlatformByMatch documents for this match
    const platformStats = await PlatformByMatch.find({
      matchId: match._id,
      externalMatchId,
    }).lean();

    console.log(`[updateMatchAggregatedStats] Found ${platformStats.length} platform stats documents`);
    console.log(`[updateMatchAggregatedStats] Platform stats:`, JSON.stringify(platformStats, null, 2));

    if (platformStats.length === 0) {
      console.log(`[updateMatchAggregatedStats] No platform stats found, resetting to 0`);
      // If no platform stats, reset all to 0
      const resetResult = await Match.findByIdAndUpdate(match._id, {
        liveCount: 0,
        highlightsCount: 0,
        othersCount: 0,
        totalViews: 0,
        totalViolations: 0,
        activeCount: 0,
        blockedCount: 0,
        removedCount: 0,
        underReviewCount: 0,
        avgBlockTime: 0,
        blockSuccessRate: 0,
      }, { new: true });
      console.log(`[updateMatchAggregatedStats] Match reset result:`, JSON.stringify(resetResult, null, 2));
      return;
    }

    // Sum all counts
    const aggregated = {
      liveCount: platformStats.reduce((sum, s) => sum + (s.liveCount || 0), 0),
      highlightsCount: platformStats.reduce(
        (sum, s) => sum + (s.highlightsCount || 0),
        0
      ),
      othersCount: platformStats.reduce(
        (sum, s) => sum + (s.othersCount || 0),
        0
      ),
      totalViews: platformStats.reduce(
        (sum, s) => sum + (s.totalViews || 0),
        0
      ),
      totalViolations: platformStats.reduce(
        (sum, s) => sum + (s.totalViolations || 0),
        0
      ),
      activeCount: platformStats.reduce(
        (sum, s) => sum + (s.activeCount || 0),
        0
      ),
      blockedCount: platformStats.reduce(
        (sum, s) => sum + (s.blockedCount || 0),
        0
      ),
      removedCount: platformStats.reduce(
        (sum, s) => sum + (s.removedCount || 0),
        0
      ),
      underReviewCount: platformStats.reduce(
        (sum, s) => sum + (s.underReviewCount || 0),
        0
      ),
    };

    console.log(`[updateMatchAggregatedStats] Aggregated stats:`, JSON.stringify(aggregated, null, 2));

    // Calculate weighted average for avgBlockTime
    const totalBlocked = aggregated.blockedCount;
    let avgBlockTime = 0;
    if (totalBlocked > 0) {
      const totalBlockTime = platformStats.reduce((sum, s) => {
        const platformBlocked = s.blockedCount || 0;
        if (platformBlocked > 0) {
          return sum + (s.avgBlockTime || 0) * platformBlocked;
        }
        return sum;
      }, 0);
      avgBlockTime = Math.round(totalBlockTime / totalBlocked);
      console.log(`[updateMatchAggregatedStats] Calculated avgBlockTime: ${avgBlockTime} (totalBlockTime: ${totalBlockTime}, totalBlocked: ${totalBlocked})`);
    }

    // Calculate overall block success rate
    const blockSuccessRate =
      aggregated.totalViolations > 0
        ? Math.round(
            (aggregated.blockedCount / aggregated.totalViolations) * 100
          )
        : 0;

    console.log(`[updateMatchAggregatedStats] Calculated blockSuccessRate: ${blockSuccessRate}`);

    // Find top platform (platform with most views)
    let topPlatformId = null;
    let mostViews = 0;
    if (platformStats.length > 0) {
      const topPlatform = platformStats.reduce((top, current) => {
        const currentViews = current.totalViews || 0;
        const topViews = top.totalViews || 0;
        return currentViews > topViews ? current : top;
      });
      if (topPlatform && topPlatform.totalViews > 0) {
        topPlatformId = topPlatform.platformId;
        mostViews = topPlatform.totalViews || 0;
        console.log(`[updateMatchAggregatedStats] Top platform: ${topPlatformId} with ${mostViews} views`);
      }
    }

    // Update Match document
    const updatePayload = {
      ...aggregated,
      avgBlockTime,
      blockSuccessRate,
      topPlatformId,
      mostViews,
    };
    console.log(`[updateMatchAggregatedStats] Updating Match with:`, JSON.stringify(updatePayload, null, 2));
    
    const updatedMatch = await Match.findByIdAndUpdate(match._id, {
      $set: updatePayload,
    }, { new: true });
    
    console.log(`[updateMatchAggregatedStats] Match update complete. New values:`, JSON.stringify({
      totalViolations: updatedMatch.totalViolations,
      activeCount: updatedMatch.activeCount,
      blockedCount: updatedMatch.blockedCount,
      removedCount: updatedMatch.removedCount,
      underReviewCount: updatedMatch.underReviewCount,
      avgBlockTime: updatedMatch.avgBlockTime,
      blockSuccessRate: updatedMatch.blockSuccessRate,
      liveCount: updatedMatch.liveCount,
      highlightsCount: updatedMatch.highlightsCount,
      othersCount: updatedMatch.othersCount,
    }, null, 2));
  } catch (error) {
    console.error("[updateMatchAggregatedStats] Error:", error);
  }
}

// Helper to update PlatformByMatch stats for a specific platform
const updatePlatformStats = async (matchId, platformId) => {
  try {
    console.log(`[updatePlatformStats] Starting for matchId: ${matchId}, platformId: ${platformId}`);
    
    let match = await Match.findById(matchId);
    if (!match) {
      console.log(`[updatePlatformStats] Match not found by _id, trying externalMatchId`);
      match = await Match.findOne({ externalMatchId: matchId });
    }
    if (!match) {
      console.warn(`[updatePlatformStats] Match not found for matchId/externalMatchId: ${matchId}`);
      return;
    }
    console.log(`[updatePlatformStats] Found match: ${match._id}, externalMatchId: ${match.externalMatchId}`);

    // Get singles (no bulkId) and bulks for this platform
    const singles = await Violation.find({
      matchId: match._id,
      platformId,
      bulkId: { $exists: false },
    }).lean();

    console.log(`[updatePlatformStats] Found ${singles.length} single violations for platform ${platformId}`);

    const bulks = await BulkViolation.find({
      matchId: match._id,
      platformId,
    }).lean();

    console.log(`[updatePlatformStats] Found ${bulks.length} bulk violation records for platform ${platformId}`);
    if (bulks.length > 0) {
      console.log(`[updatePlatformStats] Bulk violations:`, JSON.stringify(bulks, null, 2));
    }

    // Aggregate from singles
    const sLive = singles.filter(
      (v) => (v.contentType || v.type) === "Live",
    ).length;
    const sHigh = singles.filter(
      (v) => (v.contentType || v.type) === "Highlights",
    ).length;
    const sOther = singles.filter(
      (v) => (v.contentType || v.type) === "Other",
    ).length;
    const sActive = singles.filter((v) => v.status === "Active").length;
    const sBlocked = singles.filter((v) => v.status === "Blocked").length;
    const sRemoved = singles.filter((v) => v.status === "Removed").length;
    const sReview = singles.filter((v) => v.status === "Under Review").length;

    // Aggregate from bulks
    const bLive = bulks.reduce((s, b) => s + b.liveCount, 0);
    const bHigh = bulks.reduce((s, b) => s + b.highlightsCount, 0);
    const bOther = bulks.reduce((s, b) => s + b.othersCount, 0);
    const bTotal = bulks.reduce((s, b) => s + b.totalCount, 0);
    const bActive = bulks.reduce((s, b) => s + b.activeCount, 0);
    const bBlocked = bulks.reduce((s, b) => s + b.blockedCount, 0);
    const bRemoved = bulks.reduce((s, b) => s + b.removedCount, 0);
    const bReview = bulks.reduce((s, b) => s + b.underReviewCount, 0);

    console.log(`[updatePlatformStats] Singles aggregation: live=${sLive}, high=${sHigh}, other=${sOther}, total=${singles.length}, active=${sActive}, blocked=${sBlocked}, removed=${sRemoved}, review=${sReview}`);
    console.log(`[updatePlatformStats] Bulks aggregation: live=${bLive}, high=${bHigh}, other=${bOther}, total=${bTotal}, active=${bActive}, blocked=${bBlocked}, removed=${bRemoved}, review=${bReview}`);

    // Totals
    const liveCount = sLive + bLive;
    const highlightsCount = sHigh + bHigh;
    const othersCount = sOther + bOther;
    const totalViolations = singles.length + bTotal;
    const activeCount = sActive + bActive;
    const blockedCount = sBlocked + bBlocked;
    const removedCount = sRemoved + bRemoved;
    const underReviewCount = sReview + bReview;
    const blockSuccessRate =
      totalViolations > 0
        ? Math.round(((blockedCount + removedCount) / totalViolations) * 100)
        : 0;

    console.log(`[updatePlatformStats] Total stats: live=${liveCount}, high=${highlightsCount}, other=${othersCount}, total=${totalViolations}, active=${activeCount}, blocked=${blockedCount}, removed=${removedCount}, review=${underReviewCount}, successRate=${blockSuccessRate}`);

    // Avg block time
    let avgBlockTime = 0;
    if (blockedCount > 0) {
      const sBlockedViols = singles.filter(
        (v) => v.status === "Blocked" && v.blockedAt && v.timeAdded,
      );
      const sTime = sBlockedViols.reduce((s, v) => {
        const diff = Math.floor(
          (new Date(v.blockedAt) - new Date(v.timeAdded)) / 60000,
        );
        return s + Math.max(0, diff);
      }, 0);
      const bTime = bulks.reduce(
        (s, b) =>
          b.blockedCount > 0 && b.avgBlockTime
            ? s + b.avgBlockTime * b.blockedCount
            : s,
        0,
      );
      avgBlockTime = Math.round((sTime + bTime) / blockedCount);
      console.log(`[updatePlatformStats] avgBlockTime calculated: singleTime=${sTime}, bulkTime=${bTime}, total=${avgBlockTime}`);
    }

    // Total views
    const totalViews = singles.reduce((s, v) => {
      if (!v.views || v.views === "0") return s;
      const views = v.views.replace(/[^0-9,]/g, "").replace(/,/g, "");
      return s + (parseFloat(views) || 0);
    }, 0);

    const updatePayload = {
      matchId: match._id,
      liveCount,
      highlightsCount,
      othersCount,
      totalViolations,
      activeCount,
      blockedCount,
      removedCount,
      underReviewCount,
      avgBlockTime,
      blockSuccessRate,
      totalViews,
    };

    console.log(`[updatePlatformStats] Updating PlatformByMatch for ${platformId} with:`, JSON.stringify(updatePayload, null, 2));

    const updatedPlatform = await PlatformByMatch.findOneAndUpdate(
      { platformId, externalMatchId: match.externalMatchId },
      { $set: updatePayload },
      { upsert: true, new: true },
    );

    console.log(`[updatePlatformStats] PlatformByMatch updated successfully. New _id: ${updatedPlatform._id}`);
    console.log(`[updatePlatformStats] PlatformByMatch values after update:`, JSON.stringify({
      liveCount: updatedPlatform.liveCount,
      highlightsCount: updatedPlatform.highlightsCount,
      othersCount: updatedPlatform.othersCount,
      totalViolations: updatedPlatform.totalViolations,
      activeCount: updatedPlatform.activeCount,
      blockedCount: updatedPlatform.blockedCount,
      removedCount: updatedPlatform.removedCount,
      underReviewCount: updatedPlatform.underReviewCount,
    }, null, 2));

    // After updating PlatformByMatch, recalculate Match aggregated stats
    console.log(`[updatePlatformStats] Calling updateMatchAggregatedStats for ${match.externalMatchId}`);
    await updateMatchAggregatedStats(match.externalMatchId);
  } catch (error) {
    console.error("Error updating platform stats:", error);
  }
};

export { updatePlatformStats };
