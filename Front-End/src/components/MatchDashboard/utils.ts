import { Violation, BackendViolation, API_URL } from "./types";

export const formatViews = (views: number) => {
  return views.toLocaleString("en-US");
};

export const formatViewsString = (viewsStr: string): string => {
  if (!viewsStr) return "0";
  if (viewsStr === "0") return "0";

  // Remove all non-numeric characters except commas, then parse
  const numStr = viewsStr.replace(/[^0-9,]/g, "").replace(/,/g, "");
  const num = parseFloat(numStr) || 0;

  if (isNaN(num)) return viewsStr;

  return Math.round(num).toLocaleString("en-US");
};

/**
 * Get current time in KSA timezone (UTC+3) formatted for datetime-local input
 */
export const getKSATime = (): string => {
  const now = new Date();
  // Get current UTC time in milliseconds
  const utcTime = now.getTime();
  // Convert to KSA time (UTC+3) by adding 3 hours
  const ksaTime = new Date(utcTime + 3 * 60 * 60 * 1000);

  // Format as YYYY-MM-DDTHH:mm for datetime-local input
  // Use UTC methods since we've already converted to UTC+3
  const year = ksaTime.getUTCFullYear();
  const month = String(ksaTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(ksaTime.getUTCDate()).padStart(2, "0");
  const hours = String(ksaTime.getUTCHours()).padStart(2, "0");
  const minutes = String(ksaTime.getUTCMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Convert a datetime-local string (interpreted as KSA time) to ISO string in UTC
 * @param datetimeLocal - String in format "YYYY-MM-DDTHH:mm" (interpreted as KSA time)
 * @returns ISO string in UTC format
 */
export const convertKSATimeToUTC = (datetimeLocal: string): string => {
  if (!datetimeLocal) return "";

  // Parse the datetime-local string as KSA time (UTC+3)
  const [datePart, timePart] = datetimeLocal.split("T");
  if (!datePart || !timePart) return datetimeLocal;

  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);

  // Create a date object treating the input as KSA time (UTC+3)
  // We do this by creating a UTC date and then subtracting 3 hours
  const ksaDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  // Convert KSA time to UTC by subtracting 3 hours
  const utcDate = new Date(ksaDate.getTime() - 3 * 60 * 60 * 1000);

  return utcDate.toISOString();
};

/**
 * Convert a UTC ISO string to KSA time formatted for datetime-local input
 * @param utcISOString - ISO string in UTC format
 * @returns String in format "YYYY-MM-DDTHH:mm" (KSA time)
 */
export const convertUTCToKSATime = (utcISOString: string): string => {
  if (!utcISOString) return "";

  const utcDate = new Date(utcISOString);
  // Convert UTC to KSA by adding 3 hours
  const ksaDate = new Date(utcDate.getTime() + 3 * 60 * 60 * 1000);

  // Format as YYYY-MM-DDTHH:mm for datetime-local input
  const year = ksaDate.getUTCFullYear();
  const month = String(ksaDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(ksaDate.getUTCDate()).padStart(2, "0");
  const hours = String(ksaDate.getUTCHours()).padStart(2, "0");
  const minutes = String(ksaDate.getUTCMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const calculateBlockedCount = (violations: Violation[]): number => {
  // Only count "Blocked" status, NOT "Removed" (they are different statuses)
  return violations.filter((v) => v.status === "Blocked").length;
};

export const calculateTotalViews = (violations: Violation[]): string => {
  const totalViews = violations.reduce((sum, v) => {
    if (!v.views) return sum;
    const viewsStr = v.views || "0";
    // Remove all non-numeric characters except commas, then parse
    const numStr = viewsStr.replace(/[^0-9,]/g, "").replace(/,/g, "");
    return sum + (parseFloat(numStr) || 0);
  }, 0);

  return formatViews(totalViews);
};

export const calculateAvgBlockTime = (violations: Violation[]): string => {
  // Only calculate for "Blocked" status (Removed doesn't have blockedAt)
  const blockedViolations = violations.filter(
    (v) => v.status === "Blocked" && v.blockedAt
  );

  if (blockedViolations.length === 0) return "0 min";

  const totalMinutes = blockedViolations.reduce((sum, v) => {
    const addedTime = new Date(v.timeAdded).getTime();
    const blockedTime = new Date(v.blockedAt!).getTime();
    // Block time = blockedAt - timeAdded (time it took to block)
    const diffMinutes = Math.floor((blockedTime - addedTime) / (1000 * 60));
    return sum + diffMinutes;
  }, 0);

  const avgMinutes = Math.round(totalMinutes / blockedViolations.length);

  if (avgMinutes < 60) {
    return `${avgMinutes} min`;
  } else if (avgMinutes < 1440) {
    const hours = Math.round(avgMinutes / 60);
    return `${hours}h`;
  } else {
    const days = Math.round(avgMinutes / 1440);
    return `${days}d`;
  }
};

// Calculate avg block time as number (in minutes) for database storage
export const calculateAvgBlockTimeNumber = (
  violations: Violation[]
): number => {
  // Only calculate for "Blocked" status (Removed doesn't have blockedAt)
  const blockedViolations = violations.filter(
    (v) => v.status === "Blocked" && v.blockedAt
  );

  if (blockedViolations.length === 0) return 0;

  const totalMinutes = blockedViolations.reduce((sum, v) => {
    const addedTime = new Date(v.timeAdded).getTime();
    const blockedTime = new Date(v.blockedAt!).getTime();
    const diffMinutes = Math.floor((blockedTime - addedTime) / (1000 * 60));
    return sum + diffMinutes;
  }, 0);

  return Math.round(totalMinutes / blockedViolations.length);
};

export const calculateBlockedSuccess = (violations: Violation[]): string => {
  // Only calculate for "Blocked" status (Removed is separate)
  const blockedViolations = violations.filter((v) => v.status === "Blocked");

  if (blockedViolations.length === 0) return "0%";

  const successfullyBlocked = blockedViolations.filter(
    (v) => !v.active && !v.stillActive
  ).length;

  const successRate = Math.round(
    (successfullyBlocked / blockedViolations.length) * 100
  );

  return `${successRate}%`;
};

export const calculateStillActive = (violations: Violation[]): number => {
  // Only count "Blocked" status (Removed is separate)
  return violations.filter(
    (v) => v.status === "Blocked" && (v.active || v.stillActive)
  ).length;
};

export const convertBackendViolationToFrontend = (
  backendViolation: BackendViolation
): Violation => {
  const timeAdded = backendViolation.timeAdded;
  const now = new Date();
  const added = new Date(timeAdded);
  const diffMs = now.getTime() - added.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  let addedAgo = "just now";
  if (diffMins >= 1 && diffMins < 60) {
    addedAgo = `${diffMins}m ago`;
  } else if (diffMins >= 60) {
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      addedAgo = `${diffHours}h ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      addedAgo = `${diffDays}d ago`;
    }
  }

  let normalizedStatus: "Active" | "Blocked" | "Removed" | "Under Review" =
    "Active";
  const statusLower = backendViolation.status.toLowerCase();
  if (statusLower === "active") {
    normalizedStatus = "Active";
  } else if (statusLower === "blocked") {
    normalizedStatus = "Blocked";
  } else if (statusLower === "removed") {
    normalizedStatus = "Removed";
  } else if (statusLower === "under review") {
    normalizedStatus = "Under Review";
  } else {
    normalizedStatus = backendViolation.status as
      | "Active"
      | "Blocked"
      | "Removed"
      | "Under Review";
  }

  let statusBadge:
    | "Reported"
    | "Active"
    | "Blocked"
    | "Removed"
    | "Review"
    | "Pending" = "Active";
  if (normalizedStatus === "Removed") {
    statusBadge = "Removed";
  } else if (normalizedStatus === "Under Review") {
    statusBadge = "Review";
  } else if (normalizedStatus === "Active") {
    statusBadge = "Active";
  } else if (normalizedStatus === "Blocked") {
    statusBadge = "Blocked";
  }

  return {
    id: backendViolation._id || backendViolation.id,
    _id: backendViolation._id,
    status: normalizedStatus,
    contentType: backendViolation.contentType,
    views: backendViolation.views || "0",
    violationUrl: backendViolation.violationUrl,
    accountChannel: backendViolation.accountChannel,
    auditLog: backendViolation.auditLog || [],
    platformName: backendViolation.platformName,
    timeAdded: backendViolation.timeAdded,
    blockedAt: backendViolation.blockedAt
      ? typeof backendViolation.blockedAt === "string"
        ? backendViolation.blockedAt
        : new Date(backendViolation.blockedAt).toISOString()
      : undefined,
    active:
      backendViolation.active !== undefined ? backendViolation.active : true,
    notes: Array.isArray(backendViolation.notes) ? backendViolation.notes : [],
    time: new Date(timeAdded).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    addedAgo,
    type: backendViolation.contentType,
    url: backendViolation.violationUrl,
    accountHandle: backendViolation.accountChannel,
    statusBadge,
    stillActive:
      backendViolation.active !== undefined ? backendViolation.active : true,
  };
};

export const extractAccountHandleFromUrl = (url: string): string => {
  if (!url) return "";

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname;

    if (hostname.includes("x.com") || hostname.includes("twitter.com")) {
      const match = pathname.match(/^\/([^/]+)\//);
      if (match && match[1] && match[1] !== "i" && match[1] !== "intent") {
        return match[1];
      }
    }

    if (hostname.includes("tiktok.com")) {
      const match = pathname.match(/^\/@([^/]+)\//);
      if (match && match[1]) {
        return `@${match[1]}`;
      }
    }

    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
      const atMatch = pathname.match(/^\/@([^/?]+)/);
      if (atMatch && atMatch[1]) {
        return `@${atMatch[1]}`;
      }
      const channelMatch = pathname.match(/\/(?:channel|user|c)\/([^/?]+)/);
      if (channelMatch && channelMatch[1]) {
        return channelMatch[1];
      }
    }

    if (hostname.includes("facebook.com")) {
      const match = pathname.match(/^\/([^/?]+)/);
      if (
        match &&
        match[1] &&
        !["profile.php", "pages", "groups", "events"].includes(match[1])
      ) {
        return match[1];
      }
    }

    if (hostname.includes("instagram.com")) {
      const match = pathname.match(/^\/([^/?]+)/);
      if (
        match &&
        match[1] &&
        match[1] !== "p" &&
        match[1] !== "reel" &&
        match[1] !== "tv"
      ) {
        return `@${match[1]}`;
      }
    }

    return "";
  } catch {
    return "";
  }
};

export const calculateBlockDuration = (
  violation: Violation
): { duration: number; lastOpenTime: string } | null => {
  return null;
};

export const formatBlockedViolationText = (
  violation: Violation,
  t?: (key: string) => string,
  isRTL?: boolean
): string => {
  // Translate content type
  const contentTypeRaw = violation.contentType || violation.type || "Other";
  let contentType = contentTypeRaw;
  if (t) {
    const contentTypeLower = contentTypeRaw.toLowerCase();
    if (contentTypeLower === "live") {
      contentType = t("dashboard.live");
    } else if (contentTypeLower === "highlights") {
      contentType = t("dashboard.highlights");
    } else if (contentTypeLower === "other" || contentTypeLower === "others") {
      contentType = t("dashboard.other");
    }
  }

  // Format date and time
  const addedDate = new Date(violation.timeAdded);
  const dateStr = addedDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Format time in 12-hour format with Arabic/English period
  const hours = addedDate.getHours();
  const minutes = addedDate.getMinutes().toString().padStart(2, "0");
  const isAM = hours < 12;
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  let timeStr: string;
  if (isRTL) {
    const timePeriod = isAM ? "صباحا" : "مساءا";
    timeStr = `${timePeriod} ${hour12}:${minutes}`;
  } else {
    const timePeriod = isAM ? "AM" : "PM";
    timeStr = `${hour12}:${minutes} ${timePeriod}`;
  }

  const dateTimeStr = isRTL ? `${timeStr} ${dateStr}` : `${dateStr} ${timeStr}`;

  // Calculate "added X ago" dynamically based on current time
  const now = new Date();
  const addedTime = addedDate.getTime();
  const addedDiffMs = now.getTime() - addedTime;
  const addedDiffMins = Math.floor(addedDiffMs / 60000);

  const addedOnText = t
    ? t("matchDashboard.violationItem.addedOn")
    : "added on";
  const justNowText = t
    ? t("matchDashboard.violationItem.justNow")
    : "just now";
  const agoText = t ? t("matchDashboard.violationItem.timeUnits.ago") : "ago";
  const mText = t ? t("matchDashboard.violationItem.timeUnits.m") : "m";
  const hText = t ? t("matchDashboard.violationItem.timeUnits.h") : "h";
  const dText = t ? t("matchDashboard.violationItem.timeUnits.d") : "d";

  let addedAgo = justNowText;
  if (addedDiffMins >= 1 && addedDiffMins < 60) {
    if (isRTL) {
      addedAgo = `${agoText} ${addedDiffMins}${mText}`;
    } else {
      addedAgo = `${addedDiffMins}${mText} ${agoText}`;
    }
  } else if (addedDiffMins >= 60) {
    const addedDiffHours = Math.floor(addedDiffMins / 60);
    if (addedDiffHours < 24) {
      if (isRTL) {
        addedAgo = `${agoText} ${addedDiffHours}${hText}`;
      } else {
        addedAgo = `${addedDiffHours}${hText} ${agoText}`;
      }
    } else {
      const addedDiffDays = Math.floor(addedDiffHours / 24);
      if (isRTL) {
        addedAgo = `${agoText} ${addedDiffDays}${dText}`;
      } else {
        addedAgo = `${addedDiffDays}${dText} ${agoText}`;
      }
    }
  }

  // If blocked and has blockedAt, show block time (time from added to blocked)
  // Note: Only "Blocked" status has blockedAt, "Removed" does not
  const hasBlockedAt = violation.status === "Blocked" && violation.blockedAt;
  let blockedInText = "";
  let blockTimeText = "";

  if (hasBlockedAt) {
    const blockedTime = new Date(violation.blockedAt).getTime();
    // Block time = blockedAt - timeAdded (time it took to block)
    const diffMs = blockedTime - addedTime;
    const diffMins = Math.floor(diffMs / 60000);

    blockedInText = t
      ? t("matchDashboard.violationItem.blockedIn")
      : "blocked in";
    const minText = t ? t("matchDashboard.violationItem.timeUnits.min") : "min";

    if (diffMins < 0) {
      blockTimeText = `0 ${minText}`; // Invalid time (blocked before added)
    } else if (diffMins < 60) {
      blockTimeText = `${diffMins} ${minText}`;
    } else if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      blockTimeText = `${hours}${hText}`;
    } else {
      const days = Math.floor(diffMins / 1440);
      blockTimeText = `${days}${dText}`;
    }
  }

  // For RTL, order: time ago • added on + date and time • content type • (blocked info)
  // Note: flex-row-reverse will reverse the visual order, so we build it in reverse
  if (isRTL && t) {
    let text = `${contentType} • ${dateTimeStr} • ${addedAgo} •`;
    if (hasBlockedAt) {
      text = `${text}  • ${blockedInText} ${blockTimeText}`;
    }
    return text;
  }

  // LTR: return string for backward compatibility
  let text = `${contentType} • ${addedOnText} ${dateTimeStr}, • ${addedAgo}`;
  if (hasBlockedAt) {
    text += ` • ${blockedInText} ${blockTimeText}`;
  }
  return text;
};

/**
 * Calculate all platform stats from violations and save to PlatformByMatch collection
 */
export const calculateAndSavePlatformStats = async (
  platformId: string,
  externalMatchId: string,
  violations: Violation[]
): Promise<void> => {
  try {
    // Calculate content type counts
    const liveCount = violations.filter(
      (v) => (v.contentType || v.type) === "Live"
    ).length;
    const highlightsCount = violations.filter(
      (v) => (v.contentType || v.type) === "Highlights"
    ).length;
    const othersCount = violations.filter(
      (v) => (v.contentType || v.type) === "Other"
    ).length;

    // Calculate total views (as number)
    const totalViews = violations.reduce((sum, v) => {
      if (!v.views || v.views === "0") return sum;
      const viewsStr = v.views.replace(/[^0-9.]/g, "");
      // Remove all non-numeric characters except commas, then parse
      const numStr = viewsStr.replace(/[^0-9,]/g, "").replace(/,/g, "");
      return sum + (parseFloat(numStr) || 0);
    }, 0);

    // Calculate status counts
    const totalViolations = violations.length;
    const activeCount = violations.filter((v) => v.status === "Active").length;
    const blockedCount = violations.filter(
      (v) => v.status === "Blocked"
    ).length;
    const removedCount = violations.filter(
      (v) => v.status === "Removed"
    ).length;
    const underReviewCount = violations.filter(
      (v) => v.status === "Under Review"
    ).length;

    // Calculate avg block time (in minutes)
    const avgBlockTime = calculateAvgBlockTimeNumber(violations);

    // Calculate block success rate (percentage) - only blocked, NOT removed
    const blockSuccessRate =
      totalViolations > 0
        ? Math.round((blockedCount / totalViolations) * 100)
        : 0;

    // Save to database
    const response = await fetch(`${API_URL}/platform-by-match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        platformId,
        externalMatchId,
        liveCount,
        highlightsCount,
        othersCount,
        totalViews: Math.round(totalViews),
        totalViolations,
        activeCount,
        blockedCount,
        removedCount,
        underReviewCount,
        avgBlockTime,
        blockSuccessRate,
      }),
    });

    if (!response.ok) {
      console.error("Failed to save platform stats:", await response.text());
    }
  } catch (error) {
    console.error("Error calculating and saving platform stats:", error);
  }
};

/**
 * Calculate and save top platform (platform with most views) to Match
 */
export const calculateAndSaveTopPlatform = async (
  externalMatchId: string,
  platformOperations: Array<{ id: string; totalViews: string }>
): Promise<void> => {
  try {
    if (!externalMatchId || platformOperations.length === 0) return;

    // Find platform with most views
    const topPlatform = platformOperations.reduce((top, current) => {
      const currentViews =
        parseInt(current.totalViews.replace(/[^0-9]/g, "")) || 0;
      const topViews =
        parseInt((top?.totalViews || "0").replace(/[^0-9]/g, "")) || 0;
      return currentViews > topViews ? current : top;
    }, platformOperations[0]);

    const topPlatformId = topPlatform.id;
    const mostViews =
      parseInt(topPlatform.totalViews.replace(/[^0-9]/g, "")) || 0;

    // Update Match document
    const response = await fetch(`${API_URL}/matches/${externalMatchId}`, {
      credentials: "include",
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topPlatformId,
        mostViews,
      }),
    });

    if (!response.ok) {
      console.error("Failed to save top platform:", await response.text());
    }
  } catch (error) {
    console.error("Error calculating and saving top platform:", error);
  }
};
