import {
  FaXTwitter,
  FaYoutube,
  FaFacebook,
  FaTiktok,
  FaInstagram,
} from "react-icons/fa6";
import { PlatformData } from "./types";

export const getInitialContentSplitData = () => [
  {
    name: "Total Violations",
    value: 0,
    violations: 0,
    color: "hsl(var(--chart-4))",
  },
  {
    name: "Live",
    value: 0,
    violations: 0,
    color: "hsl(var(--chart-1))",
  },
  {
    name: "Highlights",
    value: 0,
    violations: 0,
    color: "hsl(var(--chart-2))",
  },
  {
    name: "Others",
    value: 0,
    violations: 0,
    color: "hsl(var(--chart-3))",
  },
];

export const getInitialActivityLog = () => [];

// Icon mapping for known platforms
const PLATFORM_ICONS: Record<
  string,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  twitter: FaXTwitter,
  youtube: FaYoutube,
  facebook: FaFacebook,
  tiktok: FaTiktok,
  instagram: FaInstagram,
};

// Color mapping for known platforms
const PLATFORM_COLORS: Record<string, string> = {
  twitter: "hsl(203 89% 53%)",
  youtube: "hsl(0 100% 50%)",
  facebook: "hsl(221 44% 41%)",
  tiktok: "hsl(0 0% 0%)",
  instagram: "hsl(329 100% 50%)",
};

// Default icon and color for unknown platforms
const DEFAULT_ICON = FaXTwitter;
const DEFAULT_COLOR = "hsl(var(--primary))";

// Fetch platforms from backend and convert to PlatformData format
export const fetchPlatformsFromBackend = async (): Promise<PlatformData[]> => {
  try {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const response = await fetch(`${API_URL}/platforms`, {
      credentials: "include",
    });

    if (!response.ok) {
      console.error("Failed to fetch platforms, using defaults");
      return getInitialPlatformOperations();
    }

    const platforms = await response.json();

    return platforms.map((platform: { id: string; name: string }) => ({
      id: platform.id,
      name: platform.name,
      icon: PLATFORM_ICONS[platform.id] || DEFAULT_ICON,
      color: PLATFORM_COLORS[platform.id] || DEFAULT_COLOR,
      totalViolations: 0,
      activeViolations: 0,
      blockedRate: 0,
      blockedCount: 0,
      totalViews: "0",
      avgBlockTime: "0 min",
      blockedSuccess: "0%",
      stillActive: 0,
      violations: [],
    }));
  } catch (error) {
    console.error("Error fetching platforms:", error);
    return getInitialPlatformOperations();
  }
};

// Fallback: Get initial platform operations (hardcoded for offline/error scenarios)
export const getInitialPlatformOperations = (): PlatformData[] => [
  {
    id: "twitter",
    name: "X/Twitter",
    icon: FaXTwitter,
    color: "hsl(203 89% 53%)",
    totalViolations: 0,
    activeViolations: 0,
    blockedRate: 0,
    blockedCount: 0,
    totalViews: "0",
    avgBlockTime: "0 min",
    blockedSuccess: "0%",
    stillActive: 0,
    violations: [],
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: FaYoutube,
    color: "hsl(0 100% 50%)",
    totalViolations: 0,
    activeViolations: 0,
    blockedRate: 0,
    blockedCount: 0,
    totalViews: "0",
    avgBlockTime: "0 min",
    blockedSuccess: "0%",
    stillActive: 0,
    violations: [],
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: FaFacebook,
    color: "hsl(221 44% 41%)",
    totalViolations: 0,
    activeViolations: 0,
    blockedRate: 0,
    blockedCount: 0,
    totalViews: "0",
    avgBlockTime: "0 min",
    blockedSuccess: "0%",
    stillActive: 0,
    violations: [],
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: FaTiktok,
    color: "hsl(0 0% 0%)",
    totalViolations: 0,
    activeViolations: 0,
    blockedRate: 0,
    blockedCount: 0,
    totalViews: "0",
    avgBlockTime: "0 min",
    blockedSuccess: "0%",
    stillActive: 0,
    violations: [],
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: FaInstagram,
    color: "hsl(329 100% 50%)",
    totalViolations: 0,
    activeViolations: 0,
    blockedRate: 0,
    blockedCount: 0,
    totalViews: "0",
    avgBlockTime: "0 min",
    blockedSuccess: "0%",
    stillActive: 0,
    violations: [],
  },
];
