import {
  FaXTwitter,
  FaYoutube,
  FaFacebook,
  FaTiktok,
  FaInstagram,
} from "react-icons/fa6";

export type StatusHistoryEntry = {
  status: "Reported" | "Active" | "Blocked" | "Removed" | "Review" | "Pending";
  changedAt: string;
};

export type AuditLogEntry = {
  action:
    | "created"
    | "updated"
    | "deleted"
    | "status_changed"
    | "note_added"
    | "field_updated";
  userId?: string;
  userName: string;
  timestamp: string | Date;
  field?: string;
  oldValue?: string | number | boolean | string[] | null;
  newValue?: string | number | boolean | string[] | null;
  changes?: {
    [key: string]: unknown;
    added?: string[];
    removed?: string[];
  };
};

export type DeletedViolationLog = {
  _id?: string;
  matchId: string;
  action: "deleted";
  userId?: string;
  userName: string;
  timestamp: string | Date;
  changes?: {
    platformId?: string;
    platformName?: string;
    accountChannel?: string;
    violationUrl?: string;
    status?: string;
    views?: string;
    bulkId?: string; // Bulk ID for grouping bulk operations
  };
};

export type Violation = {
  id: number | string;
  _id?: string; // MongoDB _id
  status: "Active" | "Blocked" | "Removed" | "Under Review";
  contentType: "Live" | "Highlights" | "Other";
  views?: string;
  violationUrl: string;
  accountChannel: string;
  timeAdded: string;
  blockedAt?: string;
  active: boolean;
  notes?: string[];
  externalMatchId?: string; // Match external ID
  auditLog?: AuditLogEntry[]; // Audit log entries
  platformName?: string; // Platform name for display
  bulkId?: string; // Bulk ID for grouping violations created together
  // Computed/display fields (not from backend)
  time?: string;
  addedAgo?: string;
  // Legacy fields for backward compatibility in UI
  type?: "Live" | "Highlights" | "Other";
  url?: string;
  accountHandle?: string;
  statusBadge?:
    | "Reported"
    | "Active"
    | "Blocked"
    | "Removed"
    | "Review"
    | "Pending";
  stillActive?: boolean;
};

export type PlatformData = {
  id: string;
  name: string;
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  color: string;
  totalViolations: number;
  activeViolations: number;
  blockedRate: number;
  blockedCount: number;
  removedCount?: number; // From backend
  underReviewCount?: number; // From backend
  totalViews: string;
  avgBlockTime: string;
  blockedSuccess: string;
  blockSuccessRate?: number; // From backend (0-100)
  stillActive: number;
  violations: Violation[];
};

export interface Match {
  _id?: string;
  externalMatchId: string;
  description: string;
  team1: string;
  team2: string;
  date: string;
  time: string;
  week: string;
  stage?: string; // Stage for Super Cups
  competition?: string;
  stadium?: string;
  status: "upcoming" | "live" | "finished" | "cancelled" | "postponed";
  league:
    | "saudi"
    | "italian"
    | "spanish"
    | "saudi-super-cup"
    | "spanish-super-cup";
  winner?: "home" | "away" | "draw" | null;
  scores?: {
    home: number;
    away: number;
  } | null;
  liveCount?: number;
  highlightsCount?: number;
  othersCount?: number;
  totalViews?: number;
  totalViolations?: number;
  activeCount?: number;
  blockedCount?: number;
  removedCount?: number;
  underReviewCount?: number;
  avgBlockTime?: number;
  blockSuccessRate?: number;
  topPlatformId?: string; // Platform ID (not _id) with most views
  mostViews?: number; // Highest views count from any platform
}

export interface BackendViolation {
  _id?: string;
  id?: string | number;
  matchId: string;
  matchName?: string;
  externalMatchId?: string; // Match external ID
  platformId: string;
  platformName?: string;
  violationUrl: string;
  accountChannel: string;
  bulkId?: string; // Bulk ID for grouping violations created together
  contentType: "Live" | "Highlights" | "Other";
  status:
    | "Active"
    | "Blocked"
    | "Removed"
    | "Under Review"
    | "active"
    | "blocked"
    | "removed"
    | "under review";
  views?: string;
  timeAdded: string;
  active?: boolean;
  notes?: string[];
  blockedAt?: string | Date;
  auditLog?: AuditLogEntry[];
  __v?: number;
}

export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";
