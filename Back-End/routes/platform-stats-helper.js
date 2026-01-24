// Helper function to update PlatformByMatch statistics
// Aggregates both single violations and bulk violations for each platform
const updatePlatformByMatchStats = async (matchId, platformId) => {
  try {
    // Find match by _id or externalMatchId
    let match = await Match.findById(matchId);
    if (!match) {
      match = await Match.findOne({ externalMatchId: matchId });
    }
    if (!match) {
      console.error("Match not found for updating platform stats");
      return;
    }

    // Get all single violations for this match and platform (no bulkId)
    const singleViolations = await Violation.find({
      matchId: match._id,
      platformId,
      bulkId: { $exists: false },
    }).lean();

    // Get all bulk violations for this match and platform
    const bulkViolations = await BulkViolation.find({
      matchId: match._id,
      platformId,
    }).lean();

    // Count content types from singles
    const singleLiveCount = singleViolations.filter(
      (v) => (v.contentType || v.type) === "Live",
    ).length;
    const singleHighlightsCount = singleViolations.filter(
      (v) => (v.contentType || v.type) === "Highlights",
    ).length;
    const singleOthersCount = singleViolations.filter(
      (v) => (v.contentType || v.type) === "Other",
    ).length;

    // Aggregate content types from bulks
    const bulkLiveCount = bulkViolations.reduce(
      (sum, bulk) => sum + bulk.liveCount,
      0,
    );
    const bulkHighlightsCount = bulkViolations.reduce(
      (sum, bulk) => sum + bulk.highlightsCount,
      0,
    );
    const bulkOthersCount = bulkViolations.reduce(
      (sum, bulk) => sum + bulk.othersCount,
      0,
    );
    const bulkTotalCount = bulkViolations.reduce(
      (sum, bulk) => sum + bulk.totalCount,
      0,
    );

    // Total counts
    const liveCount = singleLiveCount + bulkLiveCount;
    const highlightsCount = singleHighlightsCount + bulkHighlightsCount;
    const othersCount = singleOthersCount + bulkOthersCount;
    const totalViolations = singleViolations.length + bulkTotalCount;

    // Aggregate status counts from singles
    const singleActiveCount = singleViolations.filter(
      (v) => v.status === "Active",
    ).length;
    const singleBlockedCount = singleViolations.filter(
      (v) => v.status === "Blocked",
    ).length;
    const singleRemovedCount = singleViolations.filter(
      (v) => v.status === "Removed",
    ).length;
    const singleUnderReviewCount = singleViolations.filter(
      (v) => v.status === "Under Review",
    ).length;

    // Aggregate status counts from bulks
    const bulkActiveCount = bulkViolations.reduce(
      (sum, bulk) => sum + bulk.activeCount,
      0,
    );
    const bulkBlockedCount = bulkViolations.reduce(
      (sum, bulk) => sum + bulk.blockedCount,
      0,
    );
    const bulkRemovedCount = bulkViolations.reduce(
      (sum, bulk) => sum + bulk.removedCount,
      0,
    );
    const bulkUnderReviewCount = bulkViolations.reduce(
      (sum, bulk) => sum + bulk.underReviewCount,
      0,
    );

    // Total status counts
    const activeCount = singleActiveCount + bulkActiveCount;
    const blockedCount = singleBlockedCount + bulkBlockedCount;
    const removedCount = singleRemovedCount + bulkRemovedCount;
    const underReviewCount = singleUnderReviewCount + bulkUnderReviewCount;

    // Calculate block success rate
    const blockedOrRemovedCount = blockedCount + removedCount;
    const blockSuccessRate =
      totalViolations > 0
        ? Math.round((blockedOrRemovedCount / totalViolations) * 100)
        : 0;

    // Calculate average block time (only for blocked violations)
    let avgBlockTime = 0;
    if (blockedCount > 0) {
      // Get block times from singles
      const singleBlockedViolations = singleViolations.filter(
        (v) => v.status === "Blocked" && v.blockedAt && v.timeAdded,
      );
      const singleTotalBlockTime = singleBlockedViolations.reduce((sum, v) => {
        const diffMs =
          new Date(v.blockedAt).getTime() - new Date(v.timeAdded).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        return sum + Math.max(0, diffMins);
      }, 0);

      // Get weighted block times from bulks
      const bulkTotalBlockTime = bulkViolations.reduce((sum, bulk) => {
        if (bulk.blockedCount > 0 && bulk.avgBlockTime) {
          return sum + bulk.avgBlockTime * bulk.blockedCount;
        }
        return sum;
      }, 0);

      avgBlockTime = Math.round(
        (singleTotalBlockTime + bulkTotalBlockTime) / blockedCount,
      );
    }

    // Calculate total views (from singles only for now, can be added to BulkViolation model later)
    const totalViews = singleViolations.reduce((sum, v) => {
      if (!v.views || v.views === "0") return sum;
      const viewsStr = v.views.replace(/[^0-9,]/g, "").replace(/,/g, "");
      return sum + (parseFloat(viewsStr) || 0);
    }, 0);

    // Update or create PlatformByMatch document
    await PlatformByMatch.findOneAndUpdate(
      {
        platformId,
        externalMatchId: match.externalMatchId,
      },
      {
        $set: {
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
        },
      },
      {
        upsert: true,
      },
    );
  } catch (error) {
    console.error("Error updating platform by match stats:", error);
  }
};
