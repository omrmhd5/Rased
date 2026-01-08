import { Card } from "@/components/ui/card";
import {
  Eye,
  Clock,
  ExternalLink,
  Activity,
  Link,
  BarChart3,
  Trophy,
  Loader2,
  FileQuestion,
  Download,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as htmlToImage from "html-to-image";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { RoundReport } from "@/components/RoundReport";
import { ViolationsOverview } from "@/components/Dashboard/ViolationsOverview";
import { MatchStatsOverview } from "@/components/Dashboard/MatchStatsOverview";
import { TopMatchByViolations } from "@/components/Dashboard/TopMatchByViolations";
import { ContentSplitChart } from "@/components/MatchDashboard/ContentSplitChart";
import { PlatformsOverview } from "@/components/Dashboard/PlatformsOverview";
import { PlatformsOverviewMobile } from "@/components/Dashboard/PlatformsOverviewMobile";
import { PlatformComparison } from "@/components/MatchDashboard/PlatformComparison";
import { PlatformComparisonMobile } from "@/components/MatchDashboard/PlatformComparisonMobile";
import { PlatformData } from "@/components/MatchDashboard/types";
import { formatViews as formatViewsUtil } from "@/components/MatchDashboard/utils";
import { getInitialPlatformOperations } from "@/components/MatchDashboard/constants";
import { useAuth } from "@/contexts/AuthContext";

type League = "saudi" | "saudi-super-cup" | "spanish-super-cup" | null;
type WeekFilterType = "all" | "single" | "range";

// Helper to format views (pure numbers with commas, no abbreviations)
const formatViews = (views: number) => {
  return views.toLocaleString("en-US");
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { leagues } = useAuth();
  const [isRoundReportOpen, setIsRoundReportOpen] = useState(false);

  // PlatformComparison sorting state
  const [comparisonSort, setComparisonSort] = useState<
    | "views"
    | "violations"
    | "active"
    | "blocked"
    | "removed"
    | "avgBlockTime"
    | "underReview"
  >("violations");
  const [comparisonSortDirection, setComparisonSortDirection] = useState<
    "desc" | "asc"
  >("desc");

  // League and week/stage filtering
  const [selectedLeague, setSelectedLeague] = useState<League>(null);
  const [weekFilterType, setWeekFilterType] = useState<WeekFilterType>("all");
  const [singleWeek, setSingleWeek] = useState<string>("12");
  const [weekRangeStart, setWeekRangeStart] = useState<string>("1");
  const [weekRangeEnd, setWeekRangeEnd] = useState<string>("12");

  // Stage filtering for Super Cups
  const [stageFilterType, setStageFilterType] = useState<WeekFilterType>("all");
  const [singleStage, setSingleStage] = useState<string>("");
  const [stageRangeStart, setStageRangeStart] = useState<string>("");
  const [stageRangeEnd, setStageRangeEnd] = useState<string>("");

  // Hardcoded stages for Super Cups (similar to weeks for regular leagues)
  const availableStages = [
    "16th Finals",
    "8th Finals",
    "Quarter-finals",
    "Semi-finals",
    "Final",
  ];

  // Dashboard stats
  const [dashboardStats, setDashboardStats] = useState({
    totalViolations: 0,
    blocked: 0,
    stillActive: 0,
    removed: 0,
    underReview: 0,
    totalViews: 0,
    avgBlockTime: 0,
    topPlatform: null as {
      id: string;
      name: string;
      violations: number;
    } | null,
    topMatch: null as {
      teams: string;
      week: string;
      violations: number;
      totalViews: number;
      externalMatchId: string;
      platforms: Array<{
        name: string;
        violations: number;
        views: number;
        successRate: number;
      }>;
    } | null,
    matchStats: {
      total: 0,
      completed: 0,
      live: 0,
      upcoming: 0,
      postponed: 0,
    },
    contentSplit: {
      live: { views: 0, violations: 0 },
      highlights: { views: 0, violations: 0 },
      others: { views: 0, violations: 0 },
    },
    platforms: [] as Array<{
      id: string;
      name: string;
      violations: number;
      views: number;
      successRate: number;
      avgBlockTime: number;
      statusBreakdown: {
        active: number;
        blocked: number;
        removed: number;
        underReview: number;
      };
      contentSplit: {
        live: { violations: number; views: number };
        highlights: { violations: number; views: number };
        others: { violations: number; views: number };
      };
      matchesAffected: number;
    }>,
    matches: [] as Array<{
      id: string;
      description: string;
      week: string;
      status: string;
      violations: number;
      totalViews: number;
    }>,
  });
  const [statsLoading, setStatsLoading] = useState(true); // Start with true to show loading initially

  // Active Trouble List state
  const [troubleListFilter, setTroubleListFilter] = useState<
    "Active" | "Under Review"
  >("Active");
  const [troubleListViolations, setTroubleListViolations] = useState<
    Array<{
      _id?: string;
      id?: string | number;
      status: string;
      contentType: string;
      views?: string;
      violationUrl: string;
      accountChannel: string;
      timeAdded: string;
      blockedAt?: string;
      matchId?:
        | {
            team1?: string;
            team2?: string;
            description?: string;
            externalMatchId?: string;
          }
        | string;
      matchName?: string;
      platformName?: string;
      platformId?: string;
    }>
  >([]);
  const [troubleListLoading, setTroubleListLoading] = useState(false);

  // Download state
  const [isDownloading, setIsDownloading] = useState(false);

  // Refs for report components
  const violationsOverviewRef = useRef<HTMLDivElement>(null);
  const matchStatsOverviewRef = useRef<HTMLDivElement>(null);
  const totalViewsCardRef = useRef<HTMLDivElement>(null);
  const avgBlockTimeCardRef = useRef<HTMLDivElement>(null);
  const topPlatformCardRef = useRef<HTMLDivElement>(null);
  const topMatchCardRef = useRef<HTMLDivElement>(null);
  const contentSplitChartRef = useRef<HTMLDivElement>(null);
  const platformsOverviewRef = useRef<HTMLDivElement>(null);
  const platformComparisonRef = useRef<HTMLDivElement>(null);
  const topMatchByViolationsRef = useRef<HTMLDivElement>(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  // Load selected league from localStorage on mount
  useEffect(() => {
    const savedLeague = localStorage.getItem("selectedLeague") as League;
    if (
      savedLeague &&
      ["saudi", "saudi-super-cup", "spanish-super-cup"].includes(savedLeague)
    ) {
      setSelectedLeague(savedLeague);
    } else {
      // If no league is selected, redirect to home
      navigate("/");
    }
  }, [navigate]);

  // Fetch dashboard stats when league or week/stage filters change
  useEffect(() => {
    if (!selectedLeague) {
      setStatsLoading(false);
      return;
    }

    const fetchDashboardStats = async () => {
      setStatsLoading(true);
      try {
        const isSuperCup =
          selectedLeague === "saudi-super-cup" ||
          selectedLeague === "spanish-super-cup";
        const params = new URLSearchParams({
          league: selectedLeague,
        });

        if (isSuperCup) {
          // Use stage filtering for Super Cups
          params.append("stageFilter", stageFilterType);
          if (stageFilterType === "single" && singleStage) {
            params.append("stage", singleStage);
          } else if (
            stageFilterType === "range" &&
            stageRangeStart &&
            stageRangeEnd
          ) {
            params.append("stageStart", stageRangeStart);
            params.append("stageEnd", stageRangeEnd);
          }
        } else {
          // Use week filtering for regular leagues
          params.append("weekFilter", weekFilterType);
          if (weekFilterType === "single" && singleWeek) {
            params.append("week", singleWeek);
          } else if (
            weekFilterType === "range" &&
            weekRangeStart &&
            weekRangeEnd
          ) {
            params.append("weekStart", weekRangeStart);
            params.append("weekEnd", weekRangeEnd);
          }
        }

        const response = await fetch(
          `${API_URL}/matches/dashboard/stats?${params.toString()}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard stats");
        }

        const data = await response.json();
        setDashboardStats({
          totalViolations: data.totalViolations || 0,
          blocked: data.blocked || 0,
          stillActive: data.stillActive || 0,
          removed: data.removed || 0,
          underReview: data.underReview || 0,
          totalViews: data.totalViews || 0,
          avgBlockTime: data.avgBlockTime || 0,
          topPlatform: data.topPlatform || null,
          topMatch: data.topMatch || null,
          matchStats: data.matchStats || {
            total: 0,
            completed: 0,
            live: 0,
            upcoming: 0,
            postponed: 0,
          },
          contentSplit: data.contentSplit || {
            live: { views: 0, violations: 0 },
            highlights: { views: 0, violations: 0 },
            others: { views: 0, violations: 0 },
          },
          platforms: data.platforms || [],
          matches: data.matches || [],
        });
        // Only set loading to false after successful fetch
        setStatsLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        // Set to 0 on error but keep loading false to show error state
        setDashboardStats({
          totalViolations: 0,
          blocked: 0,
          stillActive: 0,
          removed: 0,
          underReview: 0,
          totalViews: 0,
          avgBlockTime: 0,
          topPlatform: null,
          topMatch: null,
          matchStats: {
            total: 0,
            completed: 0,
            live: 0,
            upcoming: 0,
            postponed: 0,
          },
          contentSplit: {
            live: { views: 0, violations: 0 },
            highlights: { views: 0, violations: 0 },
            others: { views: 0, violations: 0 },
          },
          platforms: [],
          matches: [],
        });
        setStatsLoading(false);
      }
    };

    fetchDashboardStats();
  }, [
    selectedLeague,
    weekFilterType,
    singleWeek,
    weekRangeStart,
    weekRangeEnd,
    stageFilterType,
    singleStage,
    stageRangeStart,
    stageRangeEnd,
    API_URL,
  ]);

  // Fetch trouble list violations when filters change
  useEffect(() => {
    if (!selectedLeague) {
      setTroubleListViolations([]);
      return;
    }

    const fetchTroubleListViolations = async () => {
      setTroubleListLoading(true);
      try {
        const isSuperCup =
          selectedLeague === "saudi-super-cup" ||
          selectedLeague === "spanish-super-cup";
        const params = new URLSearchParams({
          league: selectedLeague,
          status: troubleListFilter,
          sort: "desc",
          limit: "500", // Get enough violations to display
        });

        if (isSuperCup) {
          // Use stage filtering for Super Cups
          params.append("stageFilter", stageFilterType);
          if (stageFilterType === "single" && singleStage) {
            params.append("stage", singleStage);
          } else if (
            stageFilterType === "range" &&
            stageRangeStart &&
            stageRangeEnd
          ) {
            params.append("stageStart", stageRangeStart);
            params.append("stageEnd", stageRangeEnd);
          }
        } else {
          // Use week filtering for regular leagues
          params.append("weekFilter", weekFilterType);
          if (weekFilterType === "single" && singleWeek) {
            params.append("week", singleWeek);
          } else if (
            weekFilterType === "range" &&
            weekRangeStart &&
            weekRangeEnd
          ) {
            params.append("weekStart", weekRangeStart);
            params.append("weekEnd", weekRangeEnd);
          }
        }

        const response = await fetch(
          `${API_URL}/violations?${params.toString()}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch trouble list violations");
        }

        const data = await response.json();
        setTroubleListViolations(data || []);
      } catch (error) {
        console.error("Error fetching trouble list violations:", error);
        setTroubleListViolations([]);
      } finally {
        setTroubleListLoading(false);
      }
    };

    fetchTroubleListViolations();
  }, [
    selectedLeague,
    weekFilterType,
    singleWeek,
    weekRangeStart,
    weekRangeEnd,
    stageFilterType,
    singleStage,
    stageRangeStart,
    stageRangeEnd,
    troubleListFilter,
    API_URL,
  ]);

  // Get platform operations (for icon lookup)
  const platformOperations = getInitialPlatformOperations();

  // Get platform icon component class (for use with JSX like <Icon />)
  const getPlatformIconComponent = (platformName: string) => {
    const platform = platformOperations.find((p) => p.name === platformName);
    if (!platform) {
      // Fallback for platforms not in the list (e.g., Telegram)
      return Activity;
    }
    return platform.icon;
  };

  // Get platform icon as JSX (for direct rendering)
  const getPlatformIcon = (
    platformName: string,
    size: string = "h-3.5 w-3.5"
  ) => {
    const platform = platformOperations.find((p) => p.name === platformName);
    if (!platform) {
      // Fallback for platforms not in the list (e.g., Telegram)
      return <Activity className={size} />;
    }
    const IconComponent = platform.icon;
    return <IconComponent className={size} style={{ color: platform.color }} />;
  };

  // Get platform color
  const getPlatformColor = (name: string): string => {
    switch (name) {
      case "X/Twitter":
      case "Twitter":
        return "hsl(203 89% 53%)";
      case "YouTube":
        return "hsl(0 100% 50%)";
      case "Facebook":
        return "hsl(221 44% 41%)";
      case "Instagram":
        return "hsl(340 75% 55%)";
      case "Telegram":
        return "hsl(199 89% 48%)";
      case "TikTok":
        return "hsl(0 0% 0%)";
      default:
        return "hsl(0 0% 50%)";
    }
  };

  // Transform dashboard platforms to PlatformData format
  const transformPlatformsToPlatformData = (): PlatformData[] => {
    return dashboardStats.platforms.map((platform) => {
      const IconComponent = getPlatformIconComponent(platform.name);
      const color = getPlatformColor(platform.name);

      // Format avgBlockTime from minutes to string format expected by PlatformComparison
      // PlatformComparison expects formats like "21 min", "2h", or "1d"
      let avgBlockTimeStr = "0 min";
      if (platform.avgBlockTime > 0) {
        const minutes = platform.avgBlockTime;
        if (minutes >= 1440) {
          // Convert to days
          const days = Math.round(minutes / 1440);
          avgBlockTimeStr = `${days}d`;
        } else if (minutes >= 60) {
          // Convert to hours
          const hours = Math.round(minutes / 60);
          avgBlockTimeStr = `${hours}h`;
        } else {
          // Keep as minutes
          avgBlockTimeStr = `${Math.round(minutes)} min`;
        }
      }

      // Format totalViews as string
      const totalViewsStr = formatViewsUtil(platform.views);

      // Calculate blockSuccessRate from successRate (0-100)
      const blockSuccessRate = platform.successRate;

      return {
        id: platform.id,
        name: platform.name,
        icon: IconComponent,
        color: color,
        totalViolations: platform.violations,
        activeViolations: platform.statusBreakdown.active,
        blockedRate: platform.successRate,
        blockedCount: platform.statusBreakdown.blocked,
        removedCount: platform.statusBreakdown.removed,
        underReviewCount: platform.statusBreakdown.underReview,
        totalViews: totalViewsStr,
        avgBlockTime: avgBlockTimeStr,
        blockedSuccess: `${platform.successRate}%`,
        blockSuccessRate: blockSuccessRate,
        stillActive: platform.statusBreakdown.active,
        violations: [], // Empty array as we don't need individual violations for comparison
      };
    });
  };

  // Calculate time since added and sort active violations
  const getTimeSinceAdded = (reportedAt: string): string => {
    const now = new Date();
    const detected = new Date(reportedAt);
    const diffMs = now.getTime() - detected.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Format URL for display (shortened)
  const formatUrlForDisplay = (url: string): string => {
    const maxLength = 45;
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + "...";
  };

  // Calculate current week from real matches data
  const liveMatches = dashboardStats.matches.filter((m) => m.status === "live");
  const upcomingMatches = dashboardStats.matches.filter(
    (m) => m.status === "upcoming" || m.status === "scheduled"
  );
  const currentWeek =
    liveMatches.length > 0
      ? liveMatches[0].week
      : upcomingMatches.length > 0
      ? upcomingMatches[0].week
      : dashboardStats.matches.length > 0
      ? Math.max(
          ...dashboardStats.matches.map((m) => parseInt(m.week) || 0)
        ).toString()
      : "1";

  // Get all matches for current week (already sorted by violations from API)
  const currentWeekMatches = dashboardStats.matches.filter(
    (m) => m.week === currentWeek
  );

  // Process trouble list violations from API
  const violationsWithMinutes = troubleListViolations.map((v) => {
    const timeAdded = v.timeAdded ? new Date(v.timeAdded) : new Date();
    const minutesSinceAdded = Math.floor(
      (new Date().getTime() - timeAdded.getTime()) / 60000
    );

    // Helper to process views (handle "K" suffix and comma separators)
    const processViews = (viewsStr: string | number | undefined): number => {
      if (!viewsStr || viewsStr === "0") return 0;
      if (typeof viewsStr === "number") return viewsStr;
      const upperViews = viewsStr.toUpperCase();
      // Handle "K" suffix (e.g., "1.5K" = 1500) and comma separators (e.g., "1,000" = 1000)
      if (upperViews.includes("K")) {
        const num = parseFloat(upperViews.replace(/[K,]/g, "")) || 0;
        return num * 1000;
      }
      return parseFloat(viewsStr.replace(/,/g, "")) || 0;
    };

    // Get platform name (keep original case for icon matching)
    const platformName = v.platformName || v.platformId || "";

    // Map status to lowercase for UI
    const status = (v.status || "").toLowerCase();

    // Extract match information
    const match = v.matchId;
    let matchDescription = "";
    if (match) {
      if (typeof match === "object") {
        // Match is populated
        if (match.team1 && match.team2) {
          matchDescription = `${match.team1} vs ${match.team2}`;
        } else if (match.description) {
          matchDescription = match.description;
        }
      }
    }
    // Fallback to matchName if available
    if (!matchDescription && v.matchName) {
      matchDescription = v.matchName;
    }

    return {
      id: v._id || v.id,
      platform: platformName, // Keep original platform name for icon matching
      platformLower: platformName.toLowerCase(), // For display
      account: v.accountChannel || "",
      url: v.violationUrl || "",
      views: processViews(v.views),
      status: status,
      reportedAt: v.timeAdded || new Date().toISOString(),
      minutesSinceAdded,
      matchDescription,
    };
  });

  const currentWeekMinutesSinceAdded = violationsWithMinutes
    .map((v) => v.minutesSinceAdded)
    .sort((a, b) => a - b);
  const percentile80Idx = Math.floor(currentWeekMinutesSinceAdded.length * 0.8);
  const percentile80Value = currentWeekMinutesSinceAdded[percentile80Idx] || 0;
  const getWarningLevelForViolation = (
    minutes: number,
    distribution: number[]
  ): "none" | "warning" | "urgent" => {
    if (distribution.length === 0) return "none";
    const p80 = distribution[Math.floor(distribution.length * 0.8)] || 0;
    if (p80 === 0) return "none";
    if (minutes >= p80 * 1.5) return "urgent";
    if (minutes >= p80) return "warning";
    return "none";
  };
  const sortedActiveViolations = [...violationsWithMinutes].sort((a, b) => {
    // Sort by views (descending), then by time since added (descending - older first)
    const viewsScore = b.views - a.views;
    if (viewsScore !== 0) return viewsScore;
    return b.minutesSinceAdded - a.minutesSinceAdded;
  });

  // Download report as PNG
  const handleDownloadReport = async () => {
    setIsDownloading(true);
    try {
      const images: string[] = [];

      // Use a consistent target width for all components
      const targetWidth = 1100; // Fixed width for better control

      // Create and capture header with dashboard details
      const headerDiv = document.createElement("div");
      headerDiv.style.cssText = `
        width: ${targetWidth}px;
        padding: 40px;
        background-color: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      const leagueName =
        selectedLeague === "saudi"
          ? "Saudi Pro League"
          : selectedLeague === "saudi-super-cup"
          ? "Saudi Super Cup"
          : selectedLeague === "spanish-super-cup"
          ? "Spanish Super Cup"
          : "All Leagues";

      const weekInfo =
        weekFilterType === "all"
          ? "All Weeks"
          : weekFilterType === "single"
          ? `Week ${singleWeek}`
          : `Weeks ${weekRangeStart} - ${weekRangeEnd}`;

      headerDiv.innerHTML = `
        <h1 style="font-size: 32px; font-weight: bold; margin: 0 0 16px 0; color: #1a1a1a;">
          Dashboard Report
        </h1>
        <div style="font-size: 18px; color: #666; line-height: 1.8;">
          <p style="margin: 0 0 8px 0;"><strong>League:</strong> ${leagueName}</p>
          <p style="margin: 0;"><strong>Period:</strong> ${weekInfo}</p>
          </div>
      `;

      // Temporarily add to DOM for capture
      document.body.appendChild(headerDiv);

      // Wait for rendering
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Capture header
      const headerImage = await htmlToImage.toPng(headerDiv, {
        backgroundColor: "#ffffff",
        quality: 1,
        pixelRatio: 2,
        width: targetWidth,
      });

      // Remove from DOM
      document.body.removeChild(headerDiv);

      images.push(headerImage);

      // Helper function to capture element with width control
      const captureElement = async (
        element: HTMLElement | null,
        width?: number
      ): Promise<string | null> => {
        if (!element) return null;

        const originalStyle = element.style.cssText;
        const originalWidth = element.style.width;
        const originalMaxWidth = element.style.maxWidth;

        // Set width if provided
        if (width) {
          element.style.width = `${width}px`;
          element.style.maxWidth = `${width}px`;
        }

        // Find and modify parent containers
        const parentStyles: Array<{
          element: HTMLElement;
          originalStyle: string;
        }> = [];
        let currentParent = element.parentElement;
        while (currentParent) {
          parentStyles.push({
            element: currentParent,
            originalStyle: currentParent.style.cssText,
          });
          if (width) {
            currentParent.style.maxWidth = `${width}px`;
          }
          currentParent = currentParent.parentElement;
        }

        // Wait for styles to apply
        await new Promise((resolve) => setTimeout(resolve, 100));

        try {
          const dataUrl = await htmlToImage.toPng(element, {
            backgroundColor: "#ffffff",
            quality: 1,
            pixelRatio: 2,
            width: width,
          });
          return dataUrl;
        } finally {
          // Restore original styles
          element.style.cssText = originalStyle;
          if (width) {
            element.style.width = originalWidth;
            element.style.maxWidth = originalMaxWidth;
          }
          parentStyles.forEach(
            ({ element: parentEl, originalStyle: origStyle }) => {
              parentEl.style.cssText = origStyle;
            }
          );
        }
      };

      // Capture Violations Overview
      const violationsImg = await captureElement(
        violationsOverviewRef.current,
        targetWidth
      );
      if (violationsImg) images.push(violationsImg);

      // Capture Match Stats Overview
      const matchStatsImg = await captureElement(
        matchStatsOverviewRef.current,
        targetWidth
      );
      if (matchStatsImg) images.push(matchStatsImg);

      // Combine small cards into one image
      const smallCardsContainer = document.createElement("div");
      smallCardsContainer.style.cssText = `
        width: ${targetWidth}px;
        padding: 20px;
        background-color: #ffffff;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      // Clone and add small cards
      const cardsToCapture = [
        totalViewsCardRef,
        avgBlockTimeCardRef,
        topPlatformCardRef,
        topMatchCardRef,
      ];

      for (const ref of cardsToCapture) {
        if (ref.current) {
          const clone = ref.current.cloneNode(true) as HTMLElement;
          clone.style.margin = "0";
          smallCardsContainer.appendChild(clone);
        }
      }

      // Add content split chart if available
      if (contentSplitChartRef.current) {
        const chartClone = contentSplitChartRef.current.cloneNode(
          true
        ) as HTMLElement;
        chartClone.style.margin = "0";
        chartClone.style.width = "100%";
        chartClone.style.gridColumn = "1 / -1";
        smallCardsContainer.appendChild(chartClone);
      }

      document.body.appendChild(smallCardsContainer);
      await new Promise((resolve) => setTimeout(resolve, 200));

      const smallCardsImg = await htmlToImage.toPng(smallCardsContainer, {
        backgroundColor: "#ffffff",
        quality: 1,
        pixelRatio: 2,
        width: targetWidth,
      });
      document.body.removeChild(smallCardsContainer);
      images.push(smallCardsImg);

      // Capture Platforms Overview with controlled width
      const platformsImg = await captureElement(
        platformsOverviewRef.current,
        targetWidth
      );
      if (platformsImg) images.push(platformsImg);

      // Capture Platform Comparison
      const platformComparisonImg = await captureElement(
        platformComparisonRef.current,
        targetWidth
      );
      if (platformComparisonImg) images.push(platformComparisonImg);

      // Capture Top Match by Violations
      const topMatchImg = await captureElement(
        topMatchByViolationsRef.current,
        targetWidth
      );
      if (topMatchImg) images.push(topMatchImg);

      if (images.length === 0) {
        throw new Error("No components found to capture");
      }

      // Create a canvas to combine all images
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      // Load all images and calculate total height
      const imagePromises = images.map((url) => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = url;
        });
      });

      const loadedImages = await Promise.all(imagePromises);
      const maxWidth = Math.max(...loadedImages.map((img) => img.width));
      const totalHeight = loadedImages.reduce(
        (sum, img) => sum + img.height,
        0
      );

      // Set canvas dimensions
      canvas.width = maxWidth;
      canvas.height = totalHeight;

      // Draw all images vertically
      let currentY = 0;
      loadedImages.forEach((img) => {
        ctx.drawImage(img, 0, currentY);
        currentY += img.height;
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error("Failed to create image blob");
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;

        // Format filename
        const leagueFormatted = selectedLeague
          ? selectedLeague === "saudi"
            ? "Saudi-Pro-League"
            : selectedLeague === "saudi-super-cup"
            ? "Saudi-Super-Cup"
            : "Spanish-Super-Cup"
          : "All-Leagues";
        const weekFormatted =
          weekFilterType === "all"
            ? "All-Weeks"
            : weekFilterType === "single"
            ? `Week-${singleWeek}`
            : `Weeks-${weekRangeStart}-${weekRangeEnd}`;
        const dateFormatted = new Date().toISOString().split("T")[0];
        link.download = `Dashboard-Report-${leagueFormatted}-${weekFormatted}-${dateFormatted}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Report Downloaded",
          description: "Dashboard report has been downloaded successfully",
        });
      }, "image/png");
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {(() => {
              const leagueInfo = leagues?.find((l) => l.league === selectedLeague);
              const leagueKnownName = leagueInfo?.knownName || leagueInfo?.name || "";
              const isSuperCup =
                selectedLeague === "saudi-super-cup" ||
                selectedLeague === "spanish-super-cup";
              if (isSuperCup) {
                const stageText = stageFilterType === "all"
                  ? "All Stages Overview"
                  : stageFilterType === "single"
                  ? `${singleStage} Overview`
                  : `${stageRangeStart} - ${stageRangeEnd} Overview`;
                return leagueKnownName ? `${stageText} • ${leagueKnownName}` : stageText;
              } else {
                const weekText = weekFilterType === "all"
                  ? "All Weeks Overview"
                  : weekFilterType === "single"
                  ? `Week ${singleWeek} Overview`
                  : `Weeks ${weekRangeStart} - ${weekRangeEnd} Overview`;
                return leagueKnownName ? `${weekText} • ${leagueKnownName}` : weekText;
              }
            })()}
          </p>
        </div>

        {/* League and Week Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {/* League Display */}
          {selectedLeague && (() => {
            const leagueInfo = leagues?.find((l) => l.league === selectedLeague);
            const iconUrl = leagueInfo?.iconUrl
              ? leagueInfo.iconUrl.startsWith("/")
                ? `${API_URL.replace("/api", "")}${leagueInfo.iconUrl}`
                : leagueInfo.iconUrl
              : null;
            return (
              <Badge
                variant="secondary"
                className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 justify-center sm:justify-start px-2 sm:px-3 py-1.5 sm:py-2">
                {iconUrl && (
                  <img
                    src={iconUrl}
                    alt={leagueInfo?.name || leagueInfo?.arabicName || selectedLeague}
                    className="h-8 sm:h-12 object-contain flex-shrink-0"
                  />
                )}
                <span className="hidden xs:inline">
                  {leagueInfo?.name || leagueInfo?.arabicName || selectedLeague}
                </span>
              </Badge>
            );
          })()}

          {/* Download Dropdown */}
          <HoverCard openDelay={100} closeDelay={100}>
            <HoverCardTrigger asChild>
              <Button
                size="sm"
                variant="default"
                className="h-8 sm:h-7 text-[10px] sm:text-[11px] bg-blue-600 hover:bg-blue-700 text-white touch-manipulation"
                disabled={isDownloading}>
                {isDownloading ? (
                  <>
                    <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5 animate-spin" />
                    <span className="hidden sm:inline">Downloading...</span>
                    <span className="sm:hidden">Loading...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
                    <span className="hidden sm:inline">Download</span>
                    <span className="sm:hidden">DL</span>
                  </>
                )}
              </Button>
            </HoverCardTrigger>
            <HoverCardContent align="end" className="w-48 p-1" sideOffset={5}>
              <div className="flex flex-col">
                <Button
                  variant="ghost"
                  className="w-full justify-start h-9 text-xs font-normal touch-manipulation"
                  onClick={handleDownloadReport}
                  disabled={isDownloading}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Report
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-9 text-xs font-normal touch-manipulation"
                  onClick={() => setIsRoundReportOpen(true)}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Round Report
                </Button>
              </div>
            </HoverCardContent>
          </HoverCard>

          {/* Week/Stage Filter Type */}
          {(() => {
            const isSuperCup =
              selectedLeague === "saudi-super-cup" ||
              selectedLeague === "spanish-super-cup";

            if (isSuperCup) {
              // Stage filters for Super Cups
              return (
                <>
                  <Select
                    value={stageFilterType}
                    onValueChange={(value) =>
                      setStageFilterType(value as WeekFilterType)
                    }>
                    <SelectTrigger className="w-full sm:w-[140px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs sm:text-sm">
                        All Stages
                      </SelectItem>
                      <SelectItem value="single" className="text-xs sm:text-sm">
                        Single Stage
                      </SelectItem>
                      <SelectItem value="range" className="text-xs sm:text-sm">
                        Stage Range
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Single Stage Selector */}
                  {stageFilterType === "single" && (
                    <Select value={singleStage} onValueChange={setSingleStage}>
                      <SelectTrigger className="w-full sm:w-[180px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStages.map((stage) => (
                          <SelectItem
                            key={stage}
                            value={stage}
                            className="text-xs sm:text-sm">
                            {stage}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Stage Range Selectors */}
                  {stageFilterType === "range" && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <Select
                        value={stageRangeStart}
                        onValueChange={setStageRangeStart}>
                        <SelectTrigger className="w-full sm:w-[180px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                          <SelectValue placeholder="Start Stage" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStages.map((stage) => (
                            <SelectItem
                              key={stage}
                              value={stage}
                              className="text-xs sm:text-sm">
                              {stage}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground text-xs sm:text-sm text-center sm:text-left">
                        to
                      </span>
                      <Select
                        value={stageRangeEnd}
                        onValueChange={setStageRangeEnd}>
                        <SelectTrigger className="w-full sm:w-[180px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                          <SelectValue placeholder="End Stage" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStages.map((stage) => (
                            <SelectItem
                              key={stage}
                              value={stage}
                              className="text-xs sm:text-sm">
                              {stage}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              );
            } else {
              // Week filters for regular leagues
              return (
                <>
                  <Select
                    value={weekFilterType}
                    onValueChange={(value) =>
                      setWeekFilterType(value as WeekFilterType)
                    }>
                    <SelectTrigger className="w-full sm:w-[140px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs sm:text-sm">
                        All Weeks
                      </SelectItem>
                      <SelectItem value="single" className="text-xs sm:text-sm">
                        Single Week
                      </SelectItem>
                      <SelectItem value="range" className="text-xs sm:text-sm">
                        Week Range
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Single Week Selector */}
                  {weekFilterType === "single" && (
                    <Select value={singleWeek} onValueChange={setSingleWeek}>
                      <SelectTrigger className="w-full sm:w-[140px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 38 }, (_, i) => i + 1).map(
                          (week) => (
                            <SelectItem
                              key={week}
                              value={week.toString()}
                              className="text-xs sm:text-sm">
                              Week {week}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Week Range Selectors */}
                  {weekFilterType === "range" && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <Select
                        value={weekRangeStart}
                        onValueChange={setWeekRangeStart}>
                        <SelectTrigger className="w-full sm:w-[100px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                          <SelectValue placeholder="Start Week" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 38 }, (_, i) => i + 1).map(
                            (week) => (
                              <SelectItem
                                key={week}
                                value={week.toString()}
                                className="text-xs sm:text-sm">
                                Week {week}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground text-xs sm:text-sm text-center sm:text-left">
                        to
                      </span>
                      <Select
                        value={weekRangeEnd}
                        onValueChange={setWeekRangeEnd}>
                        <SelectTrigger className="w-full sm:w-[100px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                          <SelectValue placeholder="End Week" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 38 }, (_, i) => i + 1).map(
                            (week) => (
                              <SelectItem
                                key={week}
                                value={week.toString()}
                                className="text-xs sm:text-sm">
                                Week {week}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              );
            }
          })()}
        </div>
      </div>

      {/* Row 1: Main Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[2.5fr_1fr] gap-3 sm:gap-4 items-start">
        {/* Left: Violations Overview and Match Stats Overview */}
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Violations Overview Component */}
          <div ref={violationsOverviewRef}>
            <ViolationsOverview
              totalViolations={dashboardStats.totalViolations}
              stillActive={dashboardStats.stillActive}
              blocked={dashboardStats.blocked}
              removed={dashboardStats.removed}
              underReview={dashboardStats.underReview}
              statsLoading={statsLoading}
            />
          </div>

          {/* Match Stats Overview Component */}
          <div ref={matchStatsOverviewRef}>
            <MatchStatsOverview
              matchStats={dashboardStats.matchStats}
              statsLoading={statsLoading}
            />
          </div>
        </div>

        {/* Right Column: Stacked Small Cards (30% width) */}
        <div className="grid grid-cols-2 lg:flex lg:flex-col gap-2 sm:gap-3">
          {/* Total Views Card (Small) */}
          <Card
            ref={totalViewsCardRef}
            className="p-3 sm:p-4 bg-gradient-to-br from-chart-4/5 to-chart-4/10 border border-chart-4/20 transition-all duration-300 hover:scale-105 active:scale-[0.98] hover:shadow-lg hover:shadow-chart-4/20 cursor-pointer touch-manipulation">
            <div className="flex items-center justify-between mb-1 sm:mb-1.5">
              <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground">
                Total Views
              </p>
              <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-chart-4" />
            </div>

            {statsLoading ? (
              <div className="flex items-center justify-center py-4 sm:py-6">
                <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex items-baseline gap-1 sm:gap-1.5">
                <p className="text-xl sm:text-2xl font-bold text-foreground">
                  {dashboardStats.totalViews.toLocaleString("en-US")}
                </p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground hidden sm:inline">
                  Across All Platforms
                </p>
              </div>
            )}
          </Card>

          {/* Avg Block Time Card */}
          <Card
            ref={avgBlockTimeCardRef}
            className="p-3 sm:p-4 bg-gradient-to-br from-success/5 to-success/10 border border-success/20 transition-all duration-300 hover:scale-105 active:scale-[0.98] hover:shadow-lg hover:shadow-success/20 cursor-pointer touch-manipulation">
            <div className="flex items-center justify-between mb-1 sm:mb-1.5">
              <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground">
                Avg Block Time
              </p>
              <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-success" />
            </div>
            {statsLoading ? (
              <div className="flex items-center justify-center py-2 sm:py-3">
                <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <p className="text-lg sm:text-xl font-bold text-foreground">
                {(() => {
                  const minutes = dashboardStats.avgBlockTime || 0;
                  const hours = minutes / 60;
                  return (
                    <>
                      {minutes}
                      <span className="text-xs sm:text-sm text-muted-foreground ml-1">
                        min{" "}
                        <span className="text-medium text-muted-foreground hidden sm:inline">
                          ({hours < 1 ? hours.toFixed(2) : hours.toFixed(1)}hrs)
                        </span>
                      </span>
                    </>
                  );
                })()}
              </p>
            )}
          </Card>

          {/* Top Platform Card */}
          {dashboardStats.topPlatform && (
            <Card
              ref={topPlatformCardRef}
              className="p-3 sm:p-4 bg-gradient-to-br from-chart-2/5 to-chart-2/10 border border-chart-2/20 transition-all duration-300 hover:scale-105 active:scale-[0.98] hover:shadow-lg hover:shadow-chart-2/20 cursor-pointer touch-manipulation">
              <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground">
                  Top Platform
                </p>
                {(() => {
                  const Icon = getPlatformIconComponent(
                    dashboardStats.topPlatform.name
                  );
                  return (
                    <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-chart-2" />
                  );
                })()}
              </div>
              <p className="text-sm sm:text-base font-bold text-foreground mb-0.5 truncate">
                {dashboardStats.topPlatform.name}
              </p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                {dashboardStats.topPlatform.violations} violations
              </p>
            </Card>
          )}

          {/* Top Match Card */}
          {dashboardStats.topMatch && (
            <Card
              ref={topMatchCardRef}
              className="p-3 sm:p-4 bg-gradient-to-br from-orange-500/5 to-orange-500/10 border border-orange-500/20 transition-all duration-300 hover:scale-105 active:scale-[0.98] hover:shadow-lg hover:shadow-orange-500/20 cursor-pointer touch-manipulation">
              <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground">
                  Top Match
                </p>
                <Trophy className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-orange-600" />
              </div>
              <p className="text-sm sm:text-base font-bold text-foreground mb-0.5 truncate">
                {dashboardStats.topMatch.teams}
              </p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                Week {dashboardStats.topMatch.week} •{" "}
                {dashboardStats.topMatch.violations} violations
              </p>
            </Card>
          )}

          {/* Content Split Chart */}
          <div
            ref={contentSplitChartRef}
            className="mt-4 col-span-2 lg:col-span-1">
            {(() => {
              // Calculate total views for Total Violations entry
              const totalViews =
                dashboardStats.contentSplit.live.views +
                dashboardStats.contentSplit.highlights.views +
                dashboardStats.contentSplit.others.views;

              const contentSplitData = [
                {
                  name: "Total Violations",
                  value: totalViews,
                  violations: dashboardStats.totalViolations,
                  color: "hsl(var(--chart-4))",
                },
                {
                  name: "Live",
                  value: dashboardStats.contentSplit.live.views,
                  violations: dashboardStats.contentSplit.live.violations,
                  color: "hsl(var(--chart-1))",
                },
                {
                  name: "Highlights",
                  value: dashboardStats.contentSplit.highlights.views,
                  violations: dashboardStats.contentSplit.highlights.violations,
                  color: "hsl(var(--chart-2))",
                },
                {
                  name: "Others",
                  value: dashboardStats.contentSplit.others.views,
                  violations: dashboardStats.contentSplit.others.violations,
                  color: "hsl(var(--chart-3))",
                },
              ];

              return (
                <ContentSplitChart data={contentSplitData} compact={true} />
              );
            })()}
          </div>
        </div>
      </div>

      {/* Row 2: Violations & Views by Platform */}
      <div ref={platformsOverviewRef}>
        {/* Mobile Version */}
        <div className="md:hidden">
          <PlatformsOverviewMobile
            platforms={dashboardStats.platforms}
            statsLoading={statsLoading}
          />
        </div>
        {/* Desktop Version */}
        <div className="hidden md:block">
          <PlatformsOverview
            platforms={dashboardStats.platforms}
            statsLoading={statsLoading}
          />
        </div>
      </div>

      {/* Platform Comparison - Shows all platforms */}
      {statsLoading ? (
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-center py-6 sm:py-8">
            <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-muted-foreground mr-2" />
            <span className="text-xs sm:text-sm text-muted-foreground">
              Loading platform comparison...
            </span>
          </div>
        </Card>
      ) : dashboardStats.platforms.length > 0 ? (
        <>
          {/* Mobile Version */}
          <div ref={platformComparisonRef} className="md:hidden">
            <PlatformComparisonMobile
              platformOperations={transformPlatformsToPlatformData()}
              comparisonSort={comparisonSort}
              comparisonSortDirection={comparisonSortDirection}
              onSortChange={setComparisonSort}
              onSortDirectionChange={setComparisonSortDirection}
              targetMins={15}
              title="Platform Comparison"
              description="Compare platform performance across all matches"
              showCard={true}
            />
          </div>
          {/* Desktop Version */}
          <div ref={platformComparisonRef} className="hidden md:block">
            <PlatformComparison
              platformOperations={transformPlatformsToPlatformData()}
              comparisonSort={comparisonSort}
              comparisonSortDirection={comparisonSortDirection}
              onSortChange={setComparisonSort}
              onSortDirectionChange={setComparisonSortDirection}
              targetMins={15}
              title="Platform Comparison"
              description="Compare platform performance across all matches"
              showCard={true}
            />
          </div>
        </>
      ) : null}

      {/* Row 3: Top Match by Violations and Matches Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Top Match by Violations - Takes 2 columns (wider) */}
        <div ref={topMatchByViolationsRef} className="lg:col-span-2">
          <TopMatchByViolations
            topMatch={dashboardStats.topMatch}
            statsLoading={statsLoading}
          />
        </div>

        {/* Matches Leaderboard - Modern Redesign */}
        <Card className="h-[400px] sm:h-[500px] flex flex-col p-3 sm:p-4">
          <div className="flex-shrink-0 mb-2 sm:mb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-[15px] font-semibold">
                  Matches Leaderboard
                </h3>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 sm:mt-1">
                  Matches ranked by violations
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="h-5 px-2 text-[9px] sm:text-[10px]">
                  {weekFilterType === "all"
                    ? "All Weeks"
                    : weekFilterType === "single"
                    ? `Week ${singleWeek}`
                    : `Weeks ${weekRangeStart}-${weekRangeEnd}`}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 sm:space-y-2">
            {statsLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-muted-foreground" />
              </div>
            ) : dashboardStats.matches.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs sm:text-sm text-muted-foreground">
                No matches found
              </div>
            ) : (
              dashboardStats.matches.map((match) => {
                return (
                  <div
                    key={match.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 p-3 sm:p-4 rounded-lg border border-border/40 hover:border-primary/30 hover:bg-muted/20 transition-all cursor-pointer touch-manipulation active:scale-[0.98]"
                    onClick={() => navigate(`/match/${match.id}`)}>
                    {/* Match Title */}
                    <h4 className="text-xs sm:text-[14px] font-semibold flex-1 min-w-0 truncate sm:pr-4">
                      {match.description}
                    </h4>

                    {/* Metrics */}
                    <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                      <div className="flex items-baseline gap-1 sm:gap-1.5">
                        <span className="text-sm sm:text-[16px] font-bold tabular-nums">
                          {match.violations}
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-muted-foreground">
                          Violations
                        </span>
                      </div>
                      <span className="text-muted-foreground/30 hidden sm:inline">
                        •
                      </span>
                      <div className="flex items-baseline gap-1 sm:gap-1.5">
                        <span className="text-sm sm:text-[16px] font-bold tabular-nums">
                          {formatViews(match.totalViews)}
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-muted-foreground">
                          Views
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Active Trouble List */}
        <Card className="lg:col-span-3 h-[400px] sm:h-[340px] flex flex-col p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-3 flex-shrink-0 gap-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h3 className="text-sm sm:text-[15px] font-semibold">
                Active Trouble List (Live)
              </h3>
              <Badge
                variant="secondary"
                className="h-5 px-2 bg-chart-1/10 text-chart-1 border-0 text-[9px] sm:text-[10px] w-fit">
                <div className="w-1.5 h-1.5 rounded-full bg-chart-1 animate-pulse mr-1.5" />
                {sortedActiveViolations.length}{" "}
                {troubleListFilter.toLowerCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant={troubleListFilter === "Active" ? "default" : "outline"}
                size="sm"
                className="h-8 sm:h-7 px-2 sm:px-3 text-[10px] sm:text-xs touch-manipulation"
                onClick={() => setTroubleListFilter("Active")}>
                Active
              </Button>
              <Button
                variant={
                  troubleListFilter === "Under Review" ? "default" : "outline"
                }
                size="sm"
                className="h-8 sm:h-7 px-2 sm:px-3 text-[10px] sm:text-xs touch-manipulation"
                onClick={() => setTroubleListFilter("Under Review")}>
                Under Review
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 sm:space-y-1.5">
            {troubleListLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-muted-foreground" />
              </div>
            ) : sortedActiveViolations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <FileQuestion className="h-6 w-6 sm:h-8 sm:w-8 mb-2 opacity-50" />
                <p className="text-xs sm:text-sm">
                  No {troubleListFilter.toLowerCase()} violations found
                </p>
              </div>
            ) : (
              sortedActiveViolations.map((violation) => {
                const timeSinceAdded = getTimeSinceAdded(violation.reportedAt);
                const warningLevel = getWarningLevelForViolation(
                  violation.minutesSinceAdded,
                  currentWeekMinutesSinceAdded
                );
                return (
                  <div
                    key={violation.id}
                    className="group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-h-[42px] sm:h-[42px] border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors px-2 py-2 sm:py-0">
                    {/* Platform & Account */}
                    <div className="flex items-center gap-2 flex-1 sm:w-[180px] sm:flex-shrink-0 min-w-0">
                      <div className="flex-shrink-0">
                        {getPlatformIcon(
                          violation.platform,
                          "h-3.5 w-3.5 sm:h-4 sm:w-4"
                        )}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs sm:text-[13px] font-medium truncate">
                          {violation.platform}
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                          {violation.account}
                        </span>
                      </div>
                    </div>

                    {/* Match Information */}
                    {violation.matchDescription && (
                      <div className="flex-1 sm:w-[200px] sm:flex-shrink-0 min-w-0">
                        <div className="flex items-center gap-1.5 h-[24px] sm:h-[26px] px-2 rounded-md bg-muted/30 border border-border/30">
                          <Trophy className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground flex-shrink-0" />
                          <span
                            className="text-[10px] sm:text-[11px] font-medium text-foreground/80 truncate"
                            title={violation.matchDescription}>
                            {violation.matchDescription}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Link of Post */}
                    <div className="flex-1 sm:w-[300px] sm:flex-shrink-0 min-w-0">
                      <a
                        href={violation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 sm:gap-2 h-[24px] sm:h-[26px] px-2 sm:px-3 rounded-md bg-muted/40 hover:bg-muted/60 border border-border/40 hover:border-primary/30 text-[10px] sm:text-[11px] font-medium text-foreground/70 hover:text-primary transition-all w-full touch-manipulation"
                        title={violation.url}>
                        <Link className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate flex-1">
                          {formatUrlForDisplay(violation.url)}
                        </span>
                        <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0 opacity-50" />
                      </a>
                    </div>

                    {/* Metrics - Right side */}
                    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap sm:flex-nowrap sm:flex-1 sm:justify-end">
                      <span className="inline-flex items-center gap-1 h-[20px] sm:h-[22px] px-1.5 sm:px-2 rounded-full bg-muted/40 text-[10px] sm:text-[12px] font-medium tabular-nums">
                        <Eye className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                        <span>{formatViews(violation.views)}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 h-[20px] sm:h-[22px] px-1.5 sm:px-2 rounded-full bg-muted/40 text-[10px] sm:text-[12px] font-medium">
                        <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                        <span>{timeSinceAdded}</span>
                      </span>
                      <Badge
                        variant={
                          violation.status === "active"
                            ? "destructive"
                            : violation.status === "under review"
                            ? "default"
                            : "secondary"
                        }
                        className="h-[16px] sm:h-[18px] text-[9px] sm:text-[10px] px-1 sm:px-1.5">
                        {violation.status === "under review"
                          ? "under review"
                          : violation.status}
                      </Badge>
                      {warningLevel === "urgent" && (
                        <Badge
                          variant="destructive"
                          className="h-[16px] sm:h-[18px] text-[9px] sm:text-[10px] px-1 sm:px-1.5">
                          overdue
                        </Badge>
                      )}
                      {warningLevel === "warning" && (
                        <Badge
                          variant="secondary"
                          className="h-[16px] sm:h-[18px] text-[9px] sm:text-[10px] px-1 sm:px-1.5 bg-amber-500/10 text-amber-700 border-amber-500/20">
                          slower
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Round Report Modal */}
      <RoundReport
        open={isRoundReportOpen}
        onClose={() => setIsRoundReportOpen(false)}
        week={
          weekFilterType === "all"
            ? "All"
            : weekFilterType === "single"
            ? singleWeek
            : `${weekRangeStart}-${weekRangeEnd}`
        }
        competition={
          selectedLeague === "saudi"
            ? "Saudi Pro League"
            : selectedLeague === "saudi-super-cup"
            ? "Saudi Super Cup"
            : selectedLeague === "spanish-super-cup"
            ? "Spanish Super Cup"
            : "All Leagues"
        }
        fileName={
          weekFilterType === "all"
            ? `Round-Report-${
                selectedLeague === "saudi"
                  ? "Saudi-Pro-League"
                  : selectedLeague === "saudi-super-cup"
                  ? "Saudi-Super-Cup"
                  : selectedLeague === "spanish-super-cup"
                  ? "Spanish-Super-Cup"
                  : "All-Leagues"
              }-All-Weeks-${new Date().toISOString().split("T")[0]}.png`
            : weekFilterType === "single"
            ? `Round-Report-${
                selectedLeague === "saudi"
                  ? "Saudi-Pro-League"
                  : selectedLeague === "saudi-super-cup"
                  ? "Saudi-Super-Cup"
                  : selectedLeague === "spanish-super-cup"
                  ? "Spanish-Super-Cup"
                  : "All-Leagues"
              }-Week-${singleWeek}-${
                new Date().toISOString().split("T")[0]
              }.png`
            : `Round-Report-${
                selectedLeague === "saudi"
                  ? "Saudi-Pro-League"
                  : selectedLeague === "saudi-super-cup"
                  ? "Saudi-Super-Cup"
                  : selectedLeague === "spanish-super-cup"
                  ? "Spanish-Super-Cup"
                  : "All-Leagues"
              }-Weeks-${weekRangeStart}-${weekRangeEnd}-${
                new Date().toISOString().split("T")[0]
              }.png`
        }
        liveMetrics={dashboardStats.platforms
          .filter((platform) => platform.contentSplit.live.violations > 0)
          .map((platform) => {
            const Icon = getPlatformIconComponent(platform.name);
            const platformColor = getPlatformColor(platform.name);
            const detected = platform.contentSplit.live.violations;
            // Calculate blocked count for Live content type
            // Use overall success rate to estimate blocked count for Live
            const blocked = Math.round((detected * platform.successRate) / 100);

            return {
              platform: platform.name,
              icon: (
                <Icon className="h-4 w-4" style={{ color: platformColor }} />
              ),
              detected: detected,
              blocked: blocked,
              successRate: platform.successRate,
              avgBlockTime: platform.avgBlockTime,
              views: platform.contentSplit.live.views,
            };
          })}
        highlightsMetrics={dashboardStats.platforms
          .filter((platform) => platform.contentSplit.highlights.violations > 0)
          .map((platform) => {
            const Icon = getPlatformIconComponent(platform.name);
            const platformColor = getPlatformColor(platform.name);
            const detected = platform.contentSplit.highlights.violations;
            // Calculate blocked count for Highlights content type
            // Use overall success rate to estimate blocked count for Highlights
            const blocked = Math.round((detected * platform.successRate) / 100);

            return {
              platform: platform.name,
              icon: (
                <Icon className="h-4 w-4" style={{ color: platformColor }} />
              ),
              detected: detected,
              blocked: blocked,
              successRate: platform.successRate,
              avgBlockTime: platform.avgBlockTime,
              views: platform.contentSplit.highlights.views,
            };
          })}
      />
    </div>
  );
}
