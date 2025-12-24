import { FaXTwitter, FaYoutube, FaFacebook, FaTiktok, FaInstagram } from "react-icons/fa6";
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



