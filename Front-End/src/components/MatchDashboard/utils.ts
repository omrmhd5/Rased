import { Violation, BackendViolation } from "./types";

export const formatViews = (views: number) => {
  return views.toLocaleString("en-US");
};

export const formatViewsString = (viewsStr: string): string => {
  if (!viewsStr) return "0";
  if (viewsStr === "0") return "0";

  let num = 0;
  if (viewsStr.toUpperCase().includes("K")) {
    const numStr = viewsStr.replace(/[^0-9.]/g, "");
    num = parseFloat(numStr) * 1000;
  } else {
    num = parseFloat(viewsStr.replace(/[^0-9.]/g, ""));
  }

  if (isNaN(num)) return viewsStr;

  return Math.round(num).toLocaleString("en-US");
};

export const getKSATime = (): string => {
  const now = new Date();
  const ksaTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return ksaTime.toISOString().slice(0, 16);
};

export const calculateBlockedCount = (violations: Violation[]): number => {
  return violations.filter(
    (v) => v.status === "Blocked" || v.status === "Removed"
  ).length;
};

export const calculateTotalViews = (violations: Violation[]): string => {
  const totalViews = violations.reduce((sum, v) => {
    if (!v.views) return sum;
    const viewsStr = v.views.replace(/[^0-9.]/g, "");
    const viewsNum = parseFloat(viewsStr) || 0;
    const multiplier = v.views.toUpperCase().includes("K") ? 1000 : 1;
    return sum + viewsNum * multiplier;
  }, 0);

  return formatViews(totalViews);
};

export const calculateAvgBlockTime = (violations: Violation[]): string => {
  const blockedViolations = violations.filter(
    (v) => v.status === "Blocked" || v.status === "Removed"
  );

  if (blockedViolations.length === 0) return "0 min";

  const totalMinutes = blockedViolations.reduce((sum, v) => {
    const addedTime = new Date(v.timeAdded).getTime();
    const now = new Date().getTime();
    const diffMinutes = Math.floor((now - addedTime) / (1000 * 60));
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

export const calculateBlockedSuccess = (violations: Violation[]): string => {
  const blockedViolations = violations.filter(
    (v) => v.status === "Blocked" || v.status === "Removed"
  );

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
  return violations.filter(
    (v) =>
      (v.status === "Blocked" || v.status === "Removed") &&
      (v.active || v.stillActive)
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

export const formatBlockedViolationText = (violation: Violation): string => {
  const contentType = violation.contentType || violation.type || "Other";
  const addedTime = new Date(violation.timeAdded).toLocaleTimeString(
    "en-US",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  );

  if (violation.status === "Blocked" || violation.status === "Removed") {
    return `${contentType} • added at ${addedTime} • ${violation.status}`;
  }

  return `${contentType} • added ${violation.addedAgo || "just now"}`;
};

