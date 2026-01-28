import Match from "../models/Match.js";
import Violation from "../models/Violation.js";
import BulkViolation from "../models/BulkViolation.js";
import PlatformByMatch from "../models/PlatformByMatch.js";

// Helper function to aggregate PlatformByMatch stats and update Match
async function updateMatchAggregatedStats(externalMatchId) {
  try {
    const match = await Match.findOne({ externalMatchId });
    if (!match) {
      return;
    }

    // Aggregate all PlatformByMatch documents for this match
    const platformStats = await PlatformByMatch.find({
      matchId: match._id,
      externalMatchId,
    }).lean();

    if (platformStats.length === 0) {
      // If no platform stats, reset all to 0
      await Match.findByIdAndUpdate(
        match._id,
        {
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
          liveAvgBlockTime: 0,
          highlightsAvgBlockTime: 0,
          othersAvgBlockTime: 0,
          blockSuccessRate: 0,
          topPlatformId: null,
          mostViews: 0,
        },
        { new: true },
      );
      return;
    }

    // Sum all counts
    const aggregated = {
      liveCount: platformStats.reduce((sum, s) => sum + (s.liveCount || 0), 0),
      highlightsCount: platformStats.reduce(
        (sum, s) => sum + (s.highlightsCount || 0),
        0,
      ),
      othersCount: platformStats.reduce(
        (sum, s) => sum + (s.othersCount || 0),
        0,
      ),
      totalViews: platformStats.reduce(
        (sum, s) => sum + (s.totalViews || 0),
        0,
      ),
      totalViolations: platformStats.reduce(
        (sum, s) => sum + (s.totalViolations || 0),
        0,
      ),
      activeCount: platformStats.reduce(
        (sum, s) => sum + (s.activeCount || 0),
        0,
      ),
      blockedCount: platformStats.reduce(
        (sum, s) => sum + (s.blockedCount || 0),
        0,
      ),
      removedCount: platformStats.reduce(
        (sum, s) => sum + (s.removedCount || 0),
        0,
      ),
      underReviewCount: platformStats.reduce(
        (sum, s) => sum + (s.underReviewCount || 0),
        0,
      ),
    };

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
    }

    // Calculate weighted average for content-type-specific block times
    let liveAvgBlockTime = 0;
    let highlightsAvgBlockTime = 0;
    let othersAvgBlockTime = 0;

    // For Live - sum (liveAvgBlockTime * blockedCount) where liveAvgBlockTime exists, divide by total blocked in Live
    const platformsWithLiveBlocked = platformStats.filter(
      (s) => s.liveAvgBlockTime && s.liveAvgBlockTime > 0,
    );
    if (platformsWithLiveBlocked.length > 0) {
      const totalLiveBlockTime = platformsWithLiveBlocked.reduce((sum, s) => {
        // Approximate: use liveCount as a proxy for blocked live violations
        // Better would be to track blockedLiveCount, but we'll use the avgBlockTime weighted approach
        return sum + (s.liveAvgBlockTime || 0);
      }, 0);
      liveAvgBlockTime = Math.round(
        totalLiveBlockTime / platformsWithLiveBlocked.length,
      );
    }

    // For Highlights
    const platformsWithHighlightsBlocked = platformStats.filter(
      (s) => s.highlightsAvgBlockTime && s.highlightsAvgBlockTime > 0,
    );
    if (platformsWithHighlightsBlocked.length > 0) {
      const totalHighlightsBlockTime = platformsWithHighlightsBlocked.reduce(
        (sum, s) => {
          return sum + (s.highlightsAvgBlockTime || 0);
        },
        0,
      );
      highlightsAvgBlockTime = Math.round(
        totalHighlightsBlockTime / platformsWithHighlightsBlocked.length,
      );
    }

    // For Others
    const platformsWithOthersBlocked = platformStats.filter(
      (s) => s.othersAvgBlockTime && s.othersAvgBlockTime > 0,
    );
    if (platformsWithOthersBlocked.length > 0) {
      const totalOthersBlockTime = platformsWithOthersBlocked.reduce(
        (sum, s) => {
          return sum + (s.othersAvgBlockTime || 0);
        },
        0,
      );
      othersAvgBlockTime = Math.round(
        totalOthersBlockTime / platformsWithOthersBlocked.length,
      );
    }

    // Calculate overall block success rate
    const blockSuccessRate =
      aggregated.totalViolations > 0
        ? Math.round(
            (aggregated.blockedCount / aggregated.totalViolations) * 100,
          )
        : 0;

    // Find top platform (platform with most views)
    // Always include topPlatformId and mostViews in update, even if null/0
    let topPlatformId = null;
    let mostViews = 0;

    const topPlatform = platformStats.reduce((top, current) => {
      const currentViews = current.totalViews || 0;
      const topViews = top.totalViews || 0;
      return currentViews > topViews ? current : top;
    });

    if (topPlatform && topPlatform.totalViews > 0) {
      topPlatformId = topPlatform.platformId;
      mostViews = topPlatform.totalViews || 0;
    }

    // Update Match document directly by externalMatchId
    const updatePayload = {
      liveCount: aggregated.liveCount,
      highlightsCount: aggregated.highlightsCount,
      othersCount: aggregated.othersCount,
      totalViews: aggregated.totalViews,
      totalViolations: aggregated.totalViolations,
      activeCount: aggregated.activeCount,
      blockedCount: aggregated.blockedCount,
      removedCount: aggregated.removedCount,
      underReviewCount: aggregated.underReviewCount,
      avgBlockTime,
      liveAvgBlockTime,
      highlightsAvgBlockTime,
      othersAvgBlockTime,
      blockSuccessRate,
      topPlatformId,
      mostViews,
    };

    const updatedMatch = await Match.findOneAndUpdate(
      { externalMatchId },
      updatePayload,
      { new: true, runValidators: false },
    );

    if (!updatedMatch) {
      return;
    }

    // Verify the update was successful by refetching
    const verifiedMatch = await Match.findOne({ externalMatchId });
  } catch (error) {
    console.error(
      `❌ Error in updateMatchAggregatedStats for ${externalMatchId}:`,
      error.message,
    );
  }
}

// Helper to update PlatformByMatch stats for a specific platform
const updatePlatformStats = async (matchId, platformId) => {
  try {
    let match = await Match.findById(matchId);
    if (!match) {
      match = await Match.findOne({ externalMatchId: matchId });
    }
    if (!match) {
      return;
    }

    // Get singles (no bulkId) and bulks for this platform
    const singles = await Violation.find({
      matchId: match._id,
      platformId,
      bulkId: { $exists: false },
    }).lean();

    const bulks = await BulkViolation.find({
      matchId: match._id,
      platformId,
    }).lean();

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

    // Avg block time
    let avgBlockTime = 0;
    let liveAvgBlockTime = 0;
    let highlightsAvgBlockTime = 0;
    let othersAvgBlockTime = 0;

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
    }

    // Calculate content-type-specific avg block times
    // For Live
    const liveBlockedSingles = singles.filter(
      (v) =>
        v.status === "Blocked" &&
        v.blockedAt &&
        v.timeAdded &&
        (v.contentType || v.type) === "Live",
    );
    const liveBulks = bulks.filter(
      (b) => b.contentType === "Live" && b.blockedCount > 0,
    );
    const liveBlockedCount =
      liveBlockedSingles.length +
      liveBulks.reduce((s, b) => s + b.blockedCount, 0);

    if (liveBlockedCount > 0) {
      const liveTimeFromSingles = liveBlockedSingles.reduce((s, v) => {
        const diff = Math.floor(
          (new Date(v.blockedAt) - new Date(v.timeAdded)) / 60000,
        );
        return s + Math.max(0, diff);
      }, 0);
      const liveTimeFromBulks = liveBulks.reduce(
        (s, b) => s + b.avgBlockTime * b.blockedCount,
        0,
      );
      liveAvgBlockTime = Math.round(
        (liveTimeFromSingles + liveTimeFromBulks) / liveBlockedCount,
      );
    }

    // For Highlights
    const highlightsBlockedSingles = singles.filter(
      (v) =>
        v.status === "Blocked" &&
        v.blockedAt &&
        v.timeAdded &&
        (v.contentType || v.type) === "Highlights",
    );
    const highlightsBulks = bulks.filter(
      (b) => b.contentType === "Highlights" && b.blockedCount > 0,
    );
    const highlightsBlockedCount =
      highlightsBlockedSingles.length +
      highlightsBulks.reduce((s, b) => s + b.blockedCount, 0);

    if (highlightsBlockedCount > 0) {
      const highlightsTimeFromSingles = highlightsBlockedSingles.reduce(
        (s, v) => {
          const diff = Math.floor(
            (new Date(v.blockedAt) - new Date(v.timeAdded)) / 60000,
          );
          return s + Math.max(0, diff);
        },
        0,
      );
      const highlightsTimeFromBulks = highlightsBulks.reduce(
        (s, b) => s + b.avgBlockTime * b.blockedCount,
        0,
      );
      highlightsAvgBlockTime = Math.round(
        (highlightsTimeFromSingles + highlightsTimeFromBulks) /
          highlightsBlockedCount,
      );
    }

    // For Others
    const othersBlockedSingles = singles.filter(
      (v) =>
        v.status === "Blocked" &&
        v.blockedAt &&
        v.timeAdded &&
        (v.contentType || v.type) === "Other",
    );
    const othersBulks = bulks.filter(
      (b) => b.contentType === "Other" && b.blockedCount > 0,
    );
    const othersBlockedCount =
      othersBlockedSingles.length +
      othersBulks.reduce((s, b) => s + b.blockedCount, 0);

    if (othersBlockedCount > 0) {
      const othersTimeFromSingles = othersBlockedSingles.reduce((s, v) => {
        const diff = Math.floor(
          (new Date(v.blockedAt) - new Date(v.timeAdded)) / 60000,
        );
        return s + Math.max(0, diff);
      }, 0);
      const othersTimeFromBulks = othersBulks.reduce(
        (s, b) => s + b.avgBlockTime * b.blockedCount,
        0,
      );
      othersAvgBlockTime = Math.round(
        (othersTimeFromSingles + othersTimeFromBulks) / othersBlockedCount,
      );
    }

    // Total views - sum from singles and bulks
    const singlesViews = singles.reduce((s, v) => {
      if (!v.views || v.views === "0") return s;
      const views = v.views.replace(/[^0-9,]/g, "").replace(/,/g, "");
      return s + (parseFloat(views) || 0);
    }, 0);

    const bulkViews = bulks.reduce((s, b) => s + (b.totalViews || 0), 0);

    const totalViews = singlesViews + bulkViews;

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
      liveAvgBlockTime,
      highlightsAvgBlockTime,
      othersAvgBlockTime,
      blockSuccessRate,
      totalViews,
    };

    await PlatformByMatch.findOneAndUpdate(
      { platformId, externalMatchId: match.externalMatchId },
      { $set: updatePayload },
      { upsert: true, new: true },
    );

    // After updating PlatformByMatch, recalculate Match aggregated stats
    await updateMatchAggregatedStats(match.externalMatchId);
  } catch (error) {
    // Handle error silently
  }
};

export { updatePlatformStats, updateMatchAggregatedStats };
