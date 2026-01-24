import Match from "../models/Match.js";
import Violation from "../models/Violation.js";
import BulkViolation from "../models/BulkViolation.js";
import PlatformByMatch from "../models/PlatformByMatch.js";

// Helper function to aggregate PlatformByMatch stats and update Match
async function updateMatchAggregatedStats(externalMatchId) {
  try {
    console.log(`\n🚀 updateMatchAggregatedStats called with: "${externalMatchId}"`);
    
    const match = await Match.findOne({ externalMatchId });
    console.log(`🔎 Match found:`, { 
      exists: !!match,
      _id: match?._id,
      externalMatchId: match?.externalMatchId,
      currentTopPlatformId: match?.topPlatformId,
    });
    
    if (!match) {
      console.warn(`⚠️ Match not found for externalMatchId: "${externalMatchId}"`);
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

    console.log(`🔝 TopPlatform for match ${externalMatchId}:`, {
      topPlatformId,
      mostViews,
      platformCount: platformStats.length,
      allPlatforms: platformStats.map(p => ({ 
        id: p.platformId, 
        views: p.totalViews 
      }))
    });

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
      blockSuccessRate,
      topPlatformId,
      mostViews,
    };

    console.log(`🔧 About to update Match ${externalMatchId} (_id: ${match._id}) with payload:`, {
      topPlatformId,
      mostViews,
    });

    const updatedMatch = await Match.findOneAndUpdate(
      { externalMatchId },
      updatePayload,
      { new: true, runValidators: false },
    );

    if (!updatedMatch) {
      console.error(`❌ findOneAndUpdate returned null/undefined for externalMatchId: "${externalMatchId}"`);
      return;
    }

    console.log(`✅ findOneAndUpdate returned a document:`, {
      _id: updatedMatch._id,
      externalMatchId: updatedMatch.externalMatchId,
      topPlatformId_in_response: updatedMatch.topPlatformId,
      mostViews_in_response: updatedMatch.mostViews,
    });

    // Verify the update was successful by refetching
    const verifiedMatch = await Match.findOne({ externalMatchId });
    
    console.log(`📍 Verification refetch for ${externalMatchId}:`, {
      topPlatformId: verifiedMatch?.topPlatformId,
      mostViews: verifiedMatch?.mostViews,
      matchesCalculated: verifiedMatch?.topPlatformId === topPlatformId,
    });

    if (verifiedMatch?.topPlatformId !== topPlatformId) {
      console.error(`⚠️ MISMATCH DETECTED: Calculated ${topPlatformId} but verified fetch shows ${verifiedMatch?.topPlatformId}`);
    }
  } catch (error) {
    console.error(`❌ Error in updateMatchAggregatedStats for ${externalMatchId}:`, error.message);
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
      blockSuccessRate,
      totalViews,
    };

    await PlatformByMatch.findOneAndUpdate(
      { platformId, externalMatchId: match.externalMatchId },
      { $set: updatePayload },
      { upsert: true, new: true },
    );

    console.log(`🔄 Updated PlatformByMatch for ${platformId}, now calling updateMatchAggregatedStats...`);

    // After updating PlatformByMatch, recalculate Match aggregated stats
    await updateMatchAggregatedStats(match.externalMatchId);
    
    console.log(`✨ Completed updateMatchAggregatedStats cascade for ${platformId}`);
  } catch (error) {
    // Handle error silently
  }
};

export { updatePlatformStats, updateMatchAggregatedStats };
