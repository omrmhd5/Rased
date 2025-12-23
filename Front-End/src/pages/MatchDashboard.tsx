import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Shield,
  Eye,
  Clock,
  Activity,
  FileText,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Zap,
  RefreshCw,
  MessageSquare,
  ExternalLink,
  Maximize2,
  Edit,
  ShieldCheck,
  MoreHorizontal,
  Plus,
  X,
  ChevronDown,
  Minimize2,
  Lock,
  Copy,
  FileEdit,
  Trash2,
  Link as LinkIcon,
  Search,
  BarChart3,
  XCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { MatchReport } from "@/components/MatchReport";
import {
  MatchOverview,
  ContentSplitChart,
  ActivityLog,
  getInitialContentSplitData,
  getInitialActivityLog,
  getInitialPlatformOperations,
  formatViews,
  formatViewsString,
  getKSATime,
  calculateBlockedCount,
  calculateTotalViews,
  calculateAvgBlockTime,
  calculateBlockedSuccess,
  calculateStillActive,
  convertBackendViolationToFrontend,
  extractAccountHandleFromUrl,
  calculateBlockDuration,
  formatBlockedViolationText,
  type Violation,
  type PlatformData,
  type Match,
  type BackendViolation,
  API_URL,
} from "@/components/MatchDashboard";

export default function MatchDashboard() {
  const { id } = useParams<{ id: string }>();
  const [logFilter, setLogFilter] = useState<
    "all" | "violations" | "status" | "notes"
  >("all");
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentSplitData, setContentSplitData] = useState(
    getInitialContentSplitData()
  );
  const [activityLog, setActivityLog] = useState(getInitialActivityLog());

  // Platform operations state
  const [platformOperations, setPlatformOperations] = useState<PlatformData[]>(
    getInitialPlatformOperations()
  );

  // Fetch match data
  useEffect(() => {
    const fetchMatch = async () => {
      if (!id) return;

      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/matches/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch match");
        }
        const matchData = await response.json();

        // Format date if needed
        const formattedMatch: Match = {
          ...matchData,
          date: matchData.date
            ? typeof matchData.date === "string"
              ? matchData.date
              : new Date(matchData.date).toISOString().split("T")[0]
            : "",
        };

        setMatch(formattedMatch);

        // Fetch violations for this match using externalMatchId
        const violationsResponse = await fetch(
          `${API_URL}/violations?matchId=${matchData.externalMatchId}`
        );
        if (violationsResponse.ok) {
          const violations = await violationsResponse.json();

          // Group violations by platform
          const violationsByPlatform: { [key: string]: BackendViolation[] } =
            {};
          violations.forEach((violation: BackendViolation) => {
            const platformId = violation.platformId;
            if (!violationsByPlatform[platformId]) {
              violationsByPlatform[platformId] = [];
            }
            violationsByPlatform[platformId].push(violation);
          });

          // Update platform operations with real violations
          setPlatformOperations((prev) =>
            prev.map((platform) => {
              const platformViolations =
                violationsByPlatform[platform.id] || [];

              // Convert backend violations to frontend format
              const convertedViolations = platformViolations.map((v) =>
                convertBackendViolationToFrontend(v)
              );

              // Calculate metrics
              const totalViolations = convertedViolations.length;
              const activeViolations = convertedViolations.filter(
                (v) => v.status === "Active" || v.status === "Under Review"
              ).length;
              const blockedCount = calculateBlockedCount(convertedViolations);
              const blockedRate =
                totalViolations > 0
                  ? Math.round((blockedCount / totalViolations) * 100)
                  : 0;
              const totalViews = calculateTotalViews(convertedViolations);
              const avgBlockTime = calculateAvgBlockTime(convertedViolations);
              const blockedSuccess =
                calculateBlockedSuccess(convertedViolations);
              const stillActive = calculateStillActive(convertedViolations);

              return {
                ...platform,
                violations: convertedViolations,
                totalViolations,
                activeViolations,
                blockedCount,
                blockedRate,
                totalViews,
                avgBlockTime,
                blockedSuccess,
                stillActive,
              };
            })
          );
        }
      } catch (error) {
        console.error("Error fetching match:", error);
        toast({
          title: "Error",
          description: "Failed to load match data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMatch();
  }, [id]);

  // Platform slot system (max 2 platforms visible)
  const [selectedSlots, setSelectedSlots] = useState<string[]>([
    "twitter",
    "youtube",
  ]);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");
  const [platformCardFilter, setPlatformCardFilter] = useState<{
    [key: string]: string;
  }>({});
  const [platformSearchQuery, setPlatformSearchQuery] = useState<{
    [key: string]: string;
  }>({});

  // Add/Edit violation state
  const [isAddViolationOpen, setIsAddViolationOpen] = useState(false);
  const [selectedPlatformForAdd, setSelectedPlatformForAdd] =
    useState<string>("");
  const [editingViolation, setEditingViolation] = useState<Violation | null>(
    null
  );
  const [isEditMode, setIsEditMode] = useState(false);

  // Form state
  const [formUrl, setFormUrl] = useState("");
  const [formAccountHandle, setFormAccountHandle] = useState("");
  const [formContentType, setFormContentType] = useState("live");
  const [formStatus, setFormStatus] = useState<
    "Active" | "Blocked" | "Removed" | "Under Review"
  >("Active");
  const [formViews, setFormViews] = useState("");
  const [formTimeAdded, setFormTimeAdded] = useState(getKSATime());
  const [formBlockedAt, setFormBlockedAt] = useState("");
  const [formStillActive, setFormStillActive] = useState(false);
  const [formNotes, setFormNotes] = useState("");

  // Block confirmation dialog state
  const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);
  const [blockConfirmViolation, setBlockConfirmViolation] = useState<{
    platformId: string;
    violationId: number | string;
    violation: Violation;
  } | null>(null);
  const [blockTimeChoice, setBlockTimeChoice] = useState<"current" | "custom">(
    "current"
  );
  const [customBlockTime, setCustomBlockTime] = useState(getKSATime());

  // Delete confirmation dialog state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteConfirmViolation, setDeleteConfirmViolation] = useState<{
    platformId: string;
    violationId: number | string;
  } | null>(null);

  // Platform comparison state
  const [comparisonMetric, setComparisonMetric] = useState<
    "violations" | "views" | "blocked" | "response" | "active"
  >("violations");
  const [comparisonSort, setComparisonSort] = useState<
    "violations" | "views" | "response" | "active"
  >("violations");
  const [comparisonSortDirection, setComparisonSortDirection] = useState<
    "desc" | "asc"
  >("desc");

  // Match report state
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Helper to get platform color
  const getPlatformColor = (platform: string | null) => {
    switch (platform) {
      case "Twitter":
        return "hsl(203 89% 53%)";
      case "YouTube":
        return "hsl(0 100% 50%)";
      case "Facebook":
        return "hsl(221 44% 41%)";
      case "TikTok":
        return "hsl(0 0% 0%)";
      case "Instagram":
        return "hsl(329 100% 50%)";
      case "Telegram":
        return "hsl(200 100% 48%)";
      default:
        return "hsl(var(--muted-foreground))";
    }
  };

  // Helper to get platform icon
  const getPlatformIcon = (platformName: string) => {
    const platform = platformOperations.find((p) => p.name === platformName);
    if (!platform) return <Activity className="h-3.5 w-3.5" />;
    const IconComponent = platform.icon;
    return (
      <IconComponent
        className="h-3.5 w-3.5"
        style={{ color: platform.color }}
      />
    );
  };

  // Add platform to slot
  const addPlatformToSlot = (platformId: string) => {
    if (selectedSlots.length < 2) {
      setSelectedSlots([...selectedSlots, platformId]);
    } else {
      // Replace the second slot
      setSelectedSlots([selectedSlots[0], platformId]);
    }
  };

  // Remove platform from slot
  const removePlatformFromSlot = (platformId: string) => {
    setSelectedSlots(selectedSlots.filter((id) => id !== platformId));
  };

  // Available platforms (not in slots)
  const availablePlatforms = platformOperations.filter(
    (p) => !selectedSlots.includes(p.id)
  );

  // Get filtered violations for a platform card
  const getFilteredViolations = (
    platformId: string,
    violations: Violation[]
  ) => {
    const cardFilter = platformCardFilter[platformId] || "all";
    const searchQuery = platformSearchQuery[platformId] || "";
    let filtered = violations;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.url.toLowerCase().includes(query) ||
          (v.accountHandle && v.accountHandle.toLowerCase().includes(query))
      );
    }

    // Apply card filter (All/Active/Blocked/Removed/Review)
    if (cardFilter !== "all") {
      if (cardFilter === "active") {
        filtered = filtered.filter((v) =>
          ["Reported", "Active", "Pending"].includes(v.statusBadge)
        );
      } else {
        filtered = filtered.filter((v) => v.statusBadge === cardFilter);
      }
    }

    // Apply content type filter
    if (contentTypeFilter !== "all") {
      filtered = filtered.filter(
        (v) => v.type.toLowerCase() === contentTypeFilter
      );
    }

    return filtered;
  };

  // Open add violation drawer
  const openAddViolationDrawer = (platformId: string) => {
    setSelectedPlatformForAdd(platformId);
    setIsEditMode(false);
    setEditingViolation(null);
    // Reset form
    setFormUrl("");
    setFormAccountHandle("");
    setFormContentType("live");
    setFormStatus("Active");
    setFormViews("");
    setFormTimeAdded(getKSATime());
    setFormBlockedAt("");
    setFormStillActive(false);
    setFormNotes("");
    setIsAddViolationOpen(true);
  };

  // Open edit violation drawer
  const openEditViolationDrawer = (
    platformId: string,
    violation: Violation
  ) => {
    setSelectedPlatformForAdd(platformId);
    setIsEditMode(true);
    setEditingViolation(violation);
    // Pre-fill form
    setFormUrl(violation.violationUrl || violation.url || "");
    setFormAccountHandle(
      violation.accountChannel || violation.accountHandle || ""
    );
    setFormContentType(
      (violation.contentType || violation.type || "live").toLowerCase()
    );
    // Map old status values to new ones
    const statusMap: Record<
      string,
      "Active" | "Blocked" | "Removed" | "Under Review"
    > = {
      reported: "Active",
      active: "Active",
      Active: "Active",
      blocked: "Blocked",
      Blocked: "Blocked",
      removed: "Removed",
      Removed: "Removed",
      review: "Under Review",
      "under review": "Under Review",
      "Under Review": "Under Review",
      pending: "Active",
    };
    setFormStatus(statusMap[violation.status] || "Active");
    setFormViews(violation.views.replace("K", "000").replace(".", ""));
    // Convert timeAdded to datetime-local format (YYYY-MM-DDTHH:mm)
    setFormTimeAdded(
      violation.timeAdded
        ? new Date(violation.timeAdded).toISOString().slice(0, 16)
        : getKSATime()
    );
    setFormBlockedAt(
      violation.blockedAt
        ? new Date(violation.blockedAt).toISOString().slice(0, 16)
        : ""
    );
    setFormStillActive(
      violation.active !== undefined
        ? violation.active
        : violation.stillActive || false
    );
    setFormNotes(
      Array.isArray(violation.notes)
        ? violation.notes.join(", ")
        : violation.notes || ""
    );
    setIsAddViolationOpen(true);
  };

  // Toggle violation status (quick block/unblock)
  const toggleViolationStatus = (
    platformId: string,
    violationId: number | string
  ) => {
    const platform = platformOperations.find((p) => p.id === platformId);
    if (!platform) return;

    const violation = platform.violations.find(
      (v) => v.id === violationId || v._id === violationId
    );
    if (!violation) return;

    const isCurrentlyBlocked = violation.status === "Blocked";

    if (!isCurrentlyBlocked) {
      // Show confirmation dialog for Active -> Blocked
      setBlockConfirmViolation({ platformId, violationId, violation });
      setBlockTimeChoice("current");
      setCustomBlockTime(getKSATime());
      setIsBlockConfirmOpen(true);
    } else {
      // Directly unblock (Blocked -> Active)
      const unblockViolation = async () => {
        try {
          const violationDbId =
            (violation as Violation & { _id?: string })._id ||
            violation.id.toString();

          // Update status in backend
          const response = await fetch(
            `${API_URL}/violations/${violationDbId}/status`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                status: "Active",
              }),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to update violation status");
          }

          // Update local state
          setPlatformOperations((prev) =>
            prev.map((p) => {
              if (p.id !== platformId) return p;

              const updatedViolations = p.violations.map((v) => {
                if (v.id !== violationId) return v;

                return {
                  ...v,
                  status: "Active" as const,
                  statusBadge: "Active" as const,
                };
              });

              const totalViolations = updatedViolations.length;
              const activeViolations = updatedViolations.filter(
                (v) => v.status === "Active" || v.status === "Under Review"
              ).length;
              const blockedCount = calculateBlockedCount(updatedViolations);
              const blockedRate =
                totalViolations > 0
                  ? Math.round((blockedCount / totalViolations) * 100)
                  : 0;

              return {
                ...p,
                violations: updatedViolations,
                totalViolations,
                activeViolations,
                blockedCount,
                blockedRate,
                totalViews: calculateTotalViews(updatedViolations),
                avgBlockTime: calculateAvgBlockTime(updatedViolations),
                blockedSuccess: calculateBlockedSuccess(updatedViolations),
                stillActive: calculateStillActive(updatedViolations),
              };
            })
          );

          toast({
            title: "Status changed to Active",
            description: "Violation is now active again",
          });
        } catch (error) {
          console.error("Error unblocking violation:", error);
          toast({
            title: "Error",
            description: "Failed to unblock violation",
            variant: "destructive",
          });
        }
      };

      unblockViolation();
    }
  };

  // Confirm block with chosen time
  const confirmBlock = async () => {
    if (!blockConfirmViolation) return;

    const { platformId, violationId, violation } = blockConfirmViolation;
    const blockTime =
      blockTimeChoice === "current"
        ? new Date().toISOString()
        : customBlockTime;

    try {
      const violationDbId =
        (violation as Violation & { _id?: string })._id ||
        violation.id.toString();

      // Update status in backend
      const response = await fetch(
        `${API_URL}/violations/${violationDbId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "Blocked",
            blockedAt: blockTime,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update violation status");
      }

      // Update local state
      setPlatformOperations((prev) =>
        prev.map((platform) => {
          if (platform.id !== platformId) return platform;

          const updatedViolations = platform.violations.map((v) => {
            if (v.id !== violationId) return v;

            return {
              ...v,
              status: "Blocked" as const,
              statusBadge: "Blocked" as const,
            };
          });

          const totalViolations = updatedViolations.length;
          const activeViolations = updatedViolations.filter(
            (v) => v.status === "Active" || v.status === "Under Review"
          ).length;
          const blockedCount = calculateBlockedCount(updatedViolations);
          const blockedRate =
            totalViolations > 0
              ? Math.round((blockedCount / totalViolations) * 100)
              : 0;

          return {
            ...platform,
            violations: updatedViolations,
            totalViolations,
            activeViolations,
            blockedCount,
            blockedRate,
            totalViews: calculateTotalViews(updatedViolations),
            avgBlockTime: calculateAvgBlockTime(updatedViolations),
            blockedSuccess: calculateBlockedSuccess(updatedViolations),
            stillActive: calculateStillActive(updatedViolations),
          };
        })
      );

      toast({
        title: "Violation blocked",
        description: `Violation marked as blocked at ${new Date(
          blockTime
        ).toLocaleString()}`,
      });

      setIsBlockConfirmOpen(false);
      setBlockConfirmViolation(null);
    } catch (error) {
      console.error("Error blocking violation:", error);
      toast({
        title: "Error",
        description: "Failed to block violation",
        variant: "destructive",
      });
    }
  };

  // Save violation (add or edit)
  const saveViolation = async () => {
    if (!formUrl) {
      toast({
        title: "Validation Error",
        description: "Violation URL is required",
        variant: "destructive",
      });
      return;
    }

    if (!formAccountHandle) {
      toast({
        title: "Validation Error",
        description: "Account / Channel is required",
        variant: "destructive",
      });
      return;
    }

    if (!match) {
      toast({
        title: "Error",
        description: "Match not found",
        variant: "destructive",
      });
      return;
    }

    const platform = platformOperations.find(
      (p) => p.id === selectedPlatformForAdd
    );
    if (!platform) return;

    try {
      // Map contentType to match backend schema exactly: "Live", "Highlights", or "Other"
      let contentType: "Live" | "Highlights" | "Other" = "Other";
      if (formContentType.toLowerCase() === "live") {
        contentType = "Live";
      } else if (formContentType.toLowerCase() === "highlights") {
        contentType = "Highlights";
      }

      // Map status to match backend schema exactly: "Active", "Blocked", "Removed", "Under Review"
      // formStatus is already capitalized, so we just use it directly or map if needed
      const status: "Active" | "Blocked" | "Removed" | "Under Review" =
        formStatus;

      const violationData = {
        matchId: match.externalMatchId,
        matchName: `${match.team1} vs ${match.team2}`,
        platformId: platform.id,
        platformName: platform.name,
        violationUrl: formUrl,
        accountChannel: formAccountHandle,
        contentType,
        status,
        views: formViews
          ? parseInt(formViews.replace(/,/g, "")).toLocaleString("en-US")
          : undefined,
        timeAdded: formTimeAdded,
        blockedAt:
          (formStatus === "Blocked" || formStatus === "Removed") &&
          formBlockedAt
            ? formBlockedAt
            : formStatus === "Active"
            ? null
            : undefined,
        notes: formNotes ? [formNotes] : [],
      };

      if (isEditMode && editingViolation) {
        // Update existing violation - use _id if available, otherwise id
        const violationId =
          (editingViolation as Violation & { _id?: string })._id ||
          editingViolation.id.toString();
        const response = await fetch(`${API_URL}/violations/${violationId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(violationData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to update violation");
        }

        const updatedViolation = await response.json();

        // Update local state - convert backend format to frontend display format
        setPlatformOperations((prev) =>
          prev.map((p) => {
            if (p.id !== selectedPlatformForAdd) return p;

            const updatedViolations = p.violations.map((v) => {
              if (
                v.id === editingViolation.id ||
                v._id === editingViolation._id
              ) {
                return convertBackendViolationToFrontend(updatedViolation);
              }
              return v;
            });

            const totalViolations = updatedViolations.length;
            const activeViolations = updatedViolations.filter(
              (v) => v.status === "Active" || v.status === "Under Review"
            ).length;
            const blockedCount = calculateBlockedCount(updatedViolations);
            const blockedRate =
              totalViolations > 0
                ? Math.round((blockedCount / totalViolations) * 100)
                : 0;

            return {
              ...p,
              violations: updatedViolations,
              totalViolations,
              activeViolations,
              blockedCount,
              blockedRate,
              totalViews: calculateTotalViews(updatedViolations),
              avgBlockTime: calculateAvgBlockTime(updatedViolations),
              blockedSuccess: calculateBlockedSuccess(updatedViolations),
              stillActive: calculateStillActive(updatedViolations),
            };
          })
        );

        toast({
          title: "Violation updated",
          description: "Changes saved successfully",
        });
      } else {
        // Add new violation
        const response = await fetch(`${API_URL}/violations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(violationData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to add violation");
        }

        const newViolation = await response.json();

        // Convert backend violation to frontend format
        const frontendViolation =
          convertBackendViolationToFrontend(newViolation);

        setPlatformOperations((prev) =>
          prev.map((p) => {
            if (p.id !== selectedPlatformForAdd) return p;

            const updatedViolations = [frontendViolation, ...p.violations];

            const totalViolations = updatedViolations.length;
            const activeViolations = updatedViolations.filter(
              (v) => v.status === "Active" || v.status === "Under Review"
            ).length;
            const blockedCount = calculateBlockedCount(updatedViolations);
            const blockedRate =
              totalViolations > 0
                ? Math.round((blockedCount / totalViolations) * 100)
                : 0;

            return {
              ...p,
              violations: updatedViolations,
              totalViolations,
              activeViolations,
              blockedCount,
              blockedRate,
              totalViews: calculateTotalViews(updatedViolations),
              avgBlockTime: calculateAvgBlockTime(updatedViolations),
              blockedSuccess: calculateBlockedSuccess(updatedViolations),
              stillActive: calculateStillActive(updatedViolations),
            };
          })
        );

        toast({
          title: "Violation added",
          description: `New violation added to ${platform.name}`,
        });
      }

      setIsAddViolationOpen(false);
    } catch (error) {
      console.error("Error saving violation:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save violation",
        variant: "destructive",
      });
    }
  };

  // Delete violation - show confirmation dialog
  const deleteViolation = (
    platformId: string,
    violationId: number | string
  ) => {
    setDeleteConfirmViolation({ platformId, violationId });
    setIsDeleteConfirmOpen(true);
  };

  // Confirm delete violation
  const confirmDeleteViolation = async () => {
    if (!deleteConfirmViolation) return;

    const { platformId, violationId } = deleteConfirmViolation;
    const platform = platformOperations.find((p) => p.id === platformId);
    if (!platform) return;

    const violation = platform.violations.find(
      (v) => v.id === violationId || v._id === violationId
    );
    if (!violation) return;

    try {
      const violationDbId =
        (violation as Violation & { _id?: string })._id ||
        violation.id.toString();

      const response = await fetch(`${API_URL}/violations/${violationDbId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete violation");
      }

      // Update local state
      setPlatformOperations((prev) =>
        prev.map((p) => {
          if (p.id !== platformId) return p;

          const updatedViolations = p.violations.filter(
            (v) => v.id !== violationId && v._id !== violationId
          );

          const totalViolations = updatedViolations.length;
          const activeViolations = updatedViolations.filter(
            (v) => v.status === "Active" || v.status === "Under Review"
          ).length;
          const blockedCount = calculateBlockedCount(updatedViolations);
          const blockedRate =
            totalViolations > 0
              ? Math.round((blockedCount / totalViolations) * 100)
              : 0;

          return {
            ...p,
            violations: updatedViolations,
            totalViolations,
            activeViolations,
            blockedCount,
            blockedRate,
            totalViews: calculateTotalViews(updatedViolations),
            avgBlockTime: calculateAvgBlockTime(updatedViolations),
            blockedSuccess: calculateBlockedSuccess(updatedViolations),
            stillActive: calculateStillActive(updatedViolations),
          };
        })
      );

      toast({
        title: "Violation deleted",
        description: "Violation has been removed successfully",
      });

      setIsDeleteConfirmOpen(false);
      setDeleteConfirmViolation(null);
    } catch (error) {
      console.error("Error deleting violation:", error);
      toast({
        title: "Error",
        description: "Failed to delete violation",
        variant: "destructive",
      });
    }
  };

  // Copy violation URL
  const copyViolationUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "URL copied",
      description: "Violation URL copied to clipboard",
    });
  };

  // Helper to get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Active":
      case "Reported":
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
      case "Blocked":
        return <Shield className="h-4 w-4 text-muted-foreground" />;
      case "Removed":
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
      case "Review":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Calculate KPIs from platform operations
  const totalViolations = platformOperations.reduce(
    (sum, p) => sum + p.totalViolations,
    0
  );
  const totalBlocked = platformOperations.reduce(
    (sum, p) => sum + p.blockedCount,
    0
  );
  const totalActive = platformOperations.reduce(
    (sum, p) => sum + p.stillActive,
    0
  );
  const blockedRate =
    totalViolations > 0
      ? Math.round((totalBlocked / totalViolations) * 100)
      : 0;

  // Calculate total views
  const totalViews = platformOperations.reduce((sum, p) => {
    const viewsNum = parseInt(p.totalViews.replace(/[^0-9]/g, "")) || 0;
    return sum + viewsNum;
  }, 0);
  const formattedTotalViews = totalViews.toLocaleString("en-US");

  // Find top platform
  const topPlatform = platformOperations.reduce((top, p) => {
    const pViews = parseInt(p.totalViews.replace(/[^0-9]/g, "")) || 0;
    const topViews =
      parseInt((top?.totalViews || "0").replace(/[^0-9]/g, "")) || 0;
    return pViews > topViews ? p : top;
  }, platformOperations[0]);

  // Calculate average block time (simplified - no blockedAt field)
  const allBlockTimes: number[] = [];
  const avgBlockTime =
    allBlockTimes.length > 0
      ? (
          allBlockTimes.reduce((sum, t) => sum + t, 0) / allBlockTimes.length
        ).toFixed(1)
      : "0";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading match data...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Match not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MatchOverview
        match={match}
        totalViolations={totalViolations}
        totalBlocked={totalBlocked}
        totalActive={totalActive}
        blockedRate={blockedRate}
        formattedTotalViews={formattedTotalViews}
        avgBlockTime={avgBlockTime}
        topPlatform={topPlatform}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <ContentSplitChart data={contentSplitData} />
        <ActivityLog
          log={activityLog}
          filter={logFilter}
          onFilterChange={setLogFilter}
          getPlatformColor={getPlatformColor}
        />
      </div>

      {/* Block Confirmation Dialog */}
      <Dialog open={isBlockConfirmOpen} onOpenChange={setIsBlockConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm block time</DialogTitle>
            <DialogDescription>
              You are marking this violation as blocked. Choose the exact block
              time to record for this post.
            </DialogDescription>
          </DialogHeader>

          {blockConfirmViolation && (
            <div className="py-3 px-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="text-xs">
                  {
                    platformOperations.find(
                      (p) => p.id === blockConfirmViolation.platformId
                    )?.name
                  }
                </Badge>
                <span className="text-muted-foreground">•</span>
                <span>{blockConfirmViolation.violation.type}</span>
                <span className="text-muted-foreground">•</span>
                <span className="font-medium">
                  {formatViewsString(blockConfirmViolation.violation.views)}{" "}
                  views
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  added {blockConfirmViolation.violation.addedAgo}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-4 py-4">
            <RadioGroup
              value={blockTimeChoice}
              onValueChange={(value) =>
                setBlockTimeChoice(value as "current" | "custom")
              }>
              <div
                className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => setBlockTimeChoice("current")}>
                <RadioGroupItem
                  value="current"
                  id="current"
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="current"
                    className="font-medium cursor-pointer">
                    Use current time
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Block time = now
                  </p>
                </div>
              </div>

              <div
                className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => setBlockTimeChoice("custom")}>
                <RadioGroupItem value="custom" id="custom" className="mt-0.5" />
                <div className="flex-1">
                  <Label
                    htmlFor="custom"
                    className="font-medium cursor-pointer">
                    Set custom block time
                  </Label>
                  {blockTimeChoice === "custom" && (
                    <Input
                      type="datetime-local"
                      value={customBlockTime}
                      onChange={(e) => setCustomBlockTime(e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsBlockConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmBlock}>Confirm block</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Platform Operations Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Platform Operations (This Match)
          </h2>
        </div>

        {/* Platform Slot Selector + Content Type Filter */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Platform Slots (Left) */}
          <div className="flex gap-2 items-center">
            <TooltipProvider>
              {selectedSlots.map((platformId) => {
                const platform = platformOperations.find(
                  (p) => p.id === platformId
                );
                if (!platform) return null;

                return (
                  <Badge
                    key={platformId}
                    variant="default"
                    className="cursor-pointer px-3 py-1.5 flex items-center gap-2">
                    <platform.icon
                      className="h-3.5 w-3.5"
                      style={{ color: platform.color }}
                    />
                    <span>{platform.name}</span>
                    <X
                      className="h-3 w-3 ml-1 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePlatformFromSlot(platformId);
                      }}
                    />
                  </Badge>
                );
              })}
            </TooltipProvider>

            {/* Add Platform Dropdown */}
            {availablePlatforms.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Add platform
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {availablePlatforms.map((platform) => (
                    <DropdownMenuItem
                      key={platform.id}
                      onClick={() => addPlatformToSlot(platform.id)}
                      className="gap-2">
                      <platform.icon
                        className="h-4 w-4"
                        style={{ color: platform.color }}
                      />
                      {platform.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Content Type Filter (Right) */}
          <div className="flex gap-2">
            <Badge
              variant={contentTypeFilter === "all" ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setContentTypeFilter("all")}>
              All types
            </Badge>
            <Badge
              variant={contentTypeFilter === "live" ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setContentTypeFilter("live")}>
              Live
            </Badge>
            <Badge
              variant={
                contentTypeFilter === "highlights" ? "default" : "outline"
              }
              className="cursor-pointer text-xs"
              onClick={() => setContentTypeFilter("highlights")}>
              Highlights
            </Badge>
            <Badge
              variant={contentTypeFilter === "other" ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setContentTypeFilter("other")}>
              Other
            </Badge>
          </div>
        </div>

        {/* Platform Cards Grid */}
        {expandedPlatform && (
          <Dialog
            open={!!expandedPlatform}
            onOpenChange={() => setExpandedPlatform(null)}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <div className="flex items-center justify-between gap-4">
                  <DialogTitle>
                    {
                      platformOperations.find((p) => p.id === expandedPlatform)
                        ?.name
                    }{" "}
                    - All Violations
                  </DialogTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search URLs or accounts..."
                      value={platformSearchQuery[expandedPlatform] || ""}
                      onChange={(e) =>
                        setPlatformSearchQuery({
                          ...platformSearchQuery,
                          [expandedPlatform]: e.target.value,
                        })
                      }
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                </div>
                <DialogDescription>
                  Viewing all violations for this platform in this match
                </DialogDescription>
              </DialogHeader>

              {/* Expanded view content */}
              {(() => {
                const platform = platformOperations.find(
                  (p) => p.id === expandedPlatform
                );
                if (!platform) return null;

                const filteredViolations = getFilteredViolations(
                  platform.id,
                  platform.violations
                );

                return (
                  <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                    {/* KPI Strip */}
                    <div className="flex items-center justify-between gap-4 py-3 px-4 bg-muted/30 rounded-lg">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">
                          Total views
                        </p>
                        <p className="text-sm font-bold">
                          {platform.totalViews}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">
                          Avg block time
                        </p>
                        <p className="text-sm font-bold">
                          {platform.avgBlockTime}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">
                          Blocked
                        </p>
                        <p className="text-sm font-bold">
                          {platform.blockedCount ?? 0}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                          {platform.blockedSuccess} success rate
                        </p>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">
                          Still active
                        </p>
                        <p className="text-sm font-bold">
                          {platform.stillActive}
                        </p>
                      </div>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2">
                      <Badge
                        variant={
                          platformCardFilter[platform.id] === "all" ||
                          !platformCardFilter[platform.id]
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer text-xs"
                        onClick={() =>
                          setPlatformCardFilter({
                            ...platformCardFilter,
                            [platform.id]: "all",
                          })
                        }>
                        All
                      </Badge>
                      <Badge
                        variant={
                          platformCardFilter[platform.id] === "active"
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer text-xs"
                        onClick={() =>
                          setPlatformCardFilter({
                            ...platformCardFilter,
                            [platform.id]: "active",
                          })
                        }>
                        Active
                      </Badge>
                      <Badge
                        variant={
                          platformCardFilter[platform.id] === "blocked"
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer text-xs"
                        onClick={() =>
                          setPlatformCardFilter({
                            ...platformCardFilter,
                            [platform.id]: "blocked",
                          })
                        }>
                        Blocked
                      </Badge>
                      <Badge
                        variant={
                          platformCardFilter[platform.id] === "removed"
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer text-xs"
                        onClick={() =>
                          setPlatformCardFilter({
                            ...platformCardFilter,
                            [platform.id]: "removed",
                          })
                        }>
                        Removed
                      </Badge>
                      <Badge
                        variant={
                          platformCardFilter[platform.id] === "review"
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer text-xs"
                        onClick={() =>
                          setPlatformCardFilter({
                            ...platformCardFilter,
                            [platform.id]: "review",
                          })
                        }>
                        Review
                      </Badge>
                    </div>

                    {/* Violations table */}
                    <ScrollArea className="flex-1">
                      <div className="space-y-2 pr-4">
                        {filteredViolations.map((violation) => {
                          const truncatedUrl =
                            violation.url.length > 45
                              ? violation.url.slice(0, 42) + "..."
                              : violation.url;

                          return (
                            <div
                              key={violation.id}
                              className="group rounded-md border bg-card p-3 hover:bg-accent/50 transition-colors">
                              {/* Line 1: Status icon + time + status pill + actions */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="text-muted-foreground">
                                    {getStatusIcon(violation.statusBadge)}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {violation.time}
                                  </span>
                                  <Badge
                                    variant={
                                      violation.statusBadge === "Removed"
                                        ? "destructive"
                                        : violation.statusBadge === "Active" ||
                                          violation.statusBadge === "Reported"
                                        ? "default"
                                        : violation.statusBadge === "Review"
                                        ? "secondary"
                                        : "outline"
                                    }
                                    className={cn(
                                      "text-xs",
                                      (violation.statusBadge === "Active" ||
                                        violation.statusBadge === "Reported") &&
                                        "bg-success text-success-foreground hover:bg-success/80",
                                      violation.statusBadge === "Blocked" &&
                                        "bg-muted text-muted-foreground hover:bg-muted/80 border-muted-foreground/20",
                                      violation.statusBadge === "Review" &&
                                        "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20"
                                    )}>
                                    {violation.statusBadge}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() =>
                                          window.open(
                                            violation.violationUrl ||
                                              violation.url ||
                                              "",
                                            "_blank"
                                          )
                                        }>
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Open link</TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() =>
                                          openEditViolationDrawer(
                                            platform.id,
                                            violation
                                          )
                                        }>
                                        <Edit className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit</TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() =>
                                          toggleViolationStatus(
                                            platform.id,
                                            violation.id
                                          )
                                        }>
                                        <Lock className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {violation.status === "Blocked"
                                        ? "Mark as active"
                                        : "Mark as blocked"}
                                    </TooltipContent>
                                  </Tooltip>

                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7">
                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() =>
                                          copyViolationUrl(violation.url)
                                        }>
                                        <Copy className="mr-2 h-4 w-4" />
                                        Copy link
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          openEditViolationDrawer(
                                            platform.id,
                                            violation
                                          )
                                        }>
                                        <FileEdit className="mr-2 h-4 w-4" />
                                        Add note
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() =>
                                          deleteViolation(
                                            platform.id,
                                            violation.id
                                          )
                                        }>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>

                              {/* Line 2: Platform icon + account handle + URL + views */}
                              <div className="flex items-center justify-between gap-2 mt-1.5">
                                <div className="flex items-center gap-2 min-w-0 flex-1 text-xs text-muted-foreground">
                                  <span className="shrink-0">
                                    {getPlatformIcon(platform.name)}
                                  </span>
                                  {violation.accountHandle && (
                                    <>
                                      <span className="font-medium shrink-0">
                                        {violation.accountHandle}
                                      </span>
                                      <span className="shrink-0">•</span>
                                    </>
                                  )}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() =>
                                          window.open(
                                            violation.violationUrl ||
                                              violation.url ||
                                              "",
                                            "_blank"
                                          )
                                        }
                                        className="flex items-center gap-1.5 min-w-0 hover:text-foreground transition-colors rounded px-1.5 py-0.5 hover:bg-accent">
                                        <LinkIcon className="h-3 w-3 shrink-0" />
                                        <span className="truncate">
                                          {truncatedUrl}
                                        </span>
                                        <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {violation.url}
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                  <Eye className="h-3.5 w-3.5" />
                                  <span className="font-medium">
                                    {formatViewsString(violation.views)}
                                  </span>
                                </div>
                              </div>

                              {/* Line 3: Meta text */}
                              <p className="text-xs text-muted-foreground mt-1">
                                {violation.statusBadge === "Blocked"
                                  ? formatBlockedViolationText(violation)
                                  : `${violation.type} • added ${violation.addedAgo}`}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                );
              })()}
            </DialogContent>
          </Dialog>
        )}

        <div
          className={
            selectedSlots.length === 1
              ? "grid grid-cols-1 gap-6"
              : "grid grid-cols-1 lg:grid-cols-2 gap-6"
          }>
          {platformOperations
            .filter((platform) => selectedSlots.includes(platform.id))
            .map((platform) => {
              console.log(
                `Platform ${platform.name} blockedCount:`,
                platform.blockedCount
              );
              const cardFilter = platformCardFilter[platform.id] || "all";
              const filteredViolations = getFilteredViolations(
                platform.id,
                platform.violations
              );

              return (
                <Card
                  id={`platform-card-${platform.id}`}
                  key={platform.id}
                  className="p-5 transition-all">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <platform.icon
                          className="h-5 w-5"
                          style={{ color: platform.color }}
                        />
                        <h3 className="font-semibold">{platform.name}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {platform.totalViolations} violations •{" "}
                        {platform.activeViolations} active •{" "}
                        {platform.blockedCount || 0} blocked (
                        {platform.blockedRate}% success)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                setExpandedPlatform(
                                  expandedPlatform === platform.id
                                    ? null
                                    : platform.id
                                )
                              }>
                              <Maximize2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Expand to full width</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        size="sm"
                        className="text-xs"
                        onClick={() => openAddViolationDrawer(platform.id)}>
                        <Plus className="h-3 w-3 mr-1.5" />
                        Add violation
                      </Button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between gap-3 mb-4 py-2.5 px-3 bg-muted/30 rounded-lg">
                    <div className="text-center flex-1">
                      <p className="text-xs text-muted-foreground mb-0.5">
                        Total views
                      </p>
                      <p className="text-sm font-bold">{platform.totalViews}</p>
                    </div>
                    <div className="h-6 w-px bg-border" />
                    <div className="text-center flex-1">
                      <p className="text-xs text-muted-foreground mb-0.5">
                        Avg block time
                      </p>
                      <p className="text-sm font-bold">
                        {platform.avgBlockTime}
                      </p>
                    </div>
                    <div className="h-6 w-px bg-border" />
                    <div className="text-center flex-1">
                      <p className="text-xs text-muted-foreground mb-0.5">
                        Blocked
                      </p>
                      <p className="text-sm font-bold">
                        {platform.blockedCount ?? 0}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        {platform.blockedSuccess} success rate
                      </p>
                    </div>
                    <div className="h-6 w-px bg-border" />
                    <div className="text-center flex-1">
                      <p className="text-xs text-muted-foreground mb-0.5">
                        Still active
                      </p>
                      <p className="text-sm font-bold">
                        {platform.stillActive}
                      </p>
                    </div>
                  </div>

                  {/* Filters and Search */}
                  <div className="space-y-2 mb-3">
                    <div className="flex gap-1">
                      <Badge
                        variant={cardFilter === "all" ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() =>
                          setPlatformCardFilter({
                            ...platformCardFilter,
                            [platform.id]: "all",
                          })
                        }>
                        All
                      </Badge>
                      <Badge
                        variant={
                          cardFilter === "active" ? "default" : "outline"
                        }
                        className="cursor-pointer text-xs"
                        onClick={() =>
                          setPlatformCardFilter({
                            ...platformCardFilter,
                            [platform.id]: "active",
                          })
                        }>
                        Active
                      </Badge>
                      <Badge
                        variant={
                          cardFilter === "blocked" ? "default" : "outline"
                        }
                        className="cursor-pointer text-xs"
                        onClick={() =>
                          setPlatformCardFilter({
                            ...platformCardFilter,
                            [platform.id]: "blocked",
                          })
                        }>
                        Blocked
                      </Badge>
                      <Badge
                        variant={
                          cardFilter === "review" ? "default" : "outline"
                        }
                        className="cursor-pointer text-xs"
                        onClick={() =>
                          setPlatformCardFilter({
                            ...platformCardFilter,
                            [platform.id]: "review",
                          })
                        }>
                        Review
                      </Badge>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search URLs or accounts..."
                        value={platformSearchQuery[platform.id] || ""}
                        onChange={(e) =>
                          setPlatformSearchQuery({
                            ...platformSearchQuery,
                            [platform.id]: e.target.value,
                          })
                        }
                        className="h-8 pl-8 text-xs"
                      />
                    </div>
                  </div>

                  {/* Violation List */}
                  <ScrollArea className="h-[280px]">
                    {filteredViolations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground mb-4">
                          No violations found matching your filters.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAddViolationDrawer(platform.id)}>
                          <Plus className="h-3 w-3 mr-1.5" />
                          Add violation
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredViolations.map((violation) => {
                          const truncatedUrl =
                            violation.url.length > 45
                              ? violation.url.slice(0, 42) + "..."
                              : violation.url;

                          return (
                            <div
                              key={violation.id}
                              className="group rounded-md border bg-card p-2.5 hover:bg-accent/50 transition-colors">
                              {/* Line 1: Status icon + time + status pill + actions */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="text-muted-foreground">
                                    {getStatusIcon(violation.statusBadge)}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {violation.time}
                                  </span>
                                  <Badge
                                    variant={
                                      violation.statusBadge === "Removed"
                                        ? "destructive"
                                        : violation.statusBadge === "Active" ||
                                          violation.statusBadge === "Reported"
                                        ? "default"
                                        : violation.statusBadge === "Review"
                                        ? "secondary"
                                        : "outline"
                                    }
                                    className={cn(
                                      "text-xs",
                                      (violation.statusBadge === "Active" ||
                                        violation.statusBadge === "Reported") &&
                                        "bg-success text-success-foreground hover:bg-success/80",
                                      violation.statusBadge === "Blocked" &&
                                        "bg-muted text-muted-foreground hover:bg-muted/80 border-muted-foreground/20",
                                      violation.statusBadge === "Review" &&
                                        "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20"
                                    )}>
                                    {violation.statusBadge}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() =>
                                          window.open(
                                            violation.violationUrl ||
                                              violation.url ||
                                              "",
                                            "_blank"
                                          )
                                        }>
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Open link</TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() =>
                                          openEditViolationDrawer(
                                            platform.id,
                                            violation
                                          )
                                        }>
                                        <Edit className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit</TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() =>
                                          toggleViolationStatus(
                                            platform.id,
                                            violation.id
                                          )
                                        }>
                                        <Lock className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {violation.status === "Blocked"
                                        ? "Mark as active"
                                        : "Mark as blocked"}
                                    </TooltipContent>
                                  </Tooltip>

                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7">
                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() =>
                                          copyViolationUrl(violation.url)
                                        }>
                                        <Copy className="mr-2 h-4 w-4" />
                                        Copy link
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          openEditViolationDrawer(
                                            platform.id,
                                            violation
                                          )
                                        }>
                                        <FileEdit className="mr-2 h-4 w-4" />
                                        Add note
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() =>
                                          deleteViolation(
                                            platform.id,
                                            violation.id
                                          )
                                        }>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>

                              {/* Line 2: Platform icon + account handle + URL + views */}
                              <div className="flex items-center justify-between gap-2 mt-1.5">
                                <div className="flex items-center gap-2 min-w-0 flex-1 text-xs text-muted-foreground">
                                  <span className="shrink-0">
                                    {getPlatformIcon(platform.name)}
                                  </span>
                                  {violation.accountHandle && (
                                    <>
                                      <span className="font-medium shrink-0">
                                        {violation.accountHandle}
                                      </span>
                                      <span className="shrink-0">•</span>
                                    </>
                                  )}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() =>
                                          window.open(
                                            violation.violationUrl ||
                                              violation.url ||
                                              "",
                                            "_blank"
                                          )
                                        }
                                        className="flex items-center gap-1.5 min-w-0 hover:text-foreground transition-colors rounded px-1.5 py-0.5 hover:bg-accent">
                                        <LinkIcon className="h-3 w-3 shrink-0" />
                                        <span className="truncate">
                                          {truncatedUrl}
                                        </span>
                                        <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {violation.url}
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                  <Eye className="h-3.5 w-3.5" />
                                  <span className="font-medium">
                                    {formatViewsString(violation.views)}
                                  </span>
                                </div>
                              </div>

                              {/* Line 3: Meta text */}
                              <p className="text-xs text-muted-foreground mt-1">
                                {violation.statusBadge === "Blocked"
                                  ? formatBlockedViolationText(violation)
                                  : `${violation.type} • added ${violation.addedAgo}`}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </Card>
              );
            })}
        </div>
      </div>

      {/* Platform Comparison (This Match) */}
      <div className="mt-6">
        <Card className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">
                Platform Comparison (This Match)
              </h3>
              <p className="text-sm text-muted-foreground">
                Compare platforms for this match
              </p>
              <p className="text-xs text-muted-foreground/70 mt-2">
                Metrics respect the current content filter (
                {contentTypeFilter === "all"
                  ? "All types"
                  : contentTypeFilter === "live"
                  ? "Live"
                  : contentTypeFilter === "highlights"
                  ? "Highlights"
                  : "Other"}
                )
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Report Button */}
              <Button
                onClick={() => setIsReportOpen(true)}
                size="sm"
                variant="default"
                className="gap-2">
                <BarChart3 className="h-4 w-4" />
                تقرير المباراة
              </Button>

              {/* Sort dropdown */}
              <Select
                value={comparisonSort}
                onValueChange={(v: string) => {
                  const validSort = v as
                    | "violations"
                    | "views"
                    | "response"
                    | "active";
                  setComparisonSort(validSort);
                  // Sync metric tab with sort selection
                  if (v === "violations") setComparisonMetric("violations");
                  else if (v === "views") setComparisonMetric("views");
                  else if (v === "response") setComparisonMetric("response");
                  else if (v === "active") setComparisonMetric("active");
                  setComparisonSortDirection("desc");
                }}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="violations">Most violations</SelectItem>
                  <SelectItem value="views">Highest views</SelectItem>
                  <SelectItem value="response">Slowest response</SelectItem>
                  <SelectItem value="active">Most active</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="mt-6 border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/30 border-b">
                <tr>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                    Platform
                  </th>
                  <th
                    onClick={() => {
                      if (comparisonMetric === "violations") {
                        setComparisonSortDirection(
                          comparisonSortDirection === "desc" ? "asc" : "desc"
                        );
                      } else {
                        setComparisonMetric("violations");
                        setComparisonSort("violations");
                        setComparisonSortDirection("desc");
                      }
                    }}
                    className={cn(
                      "text-left text-xs px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none",
                      comparisonMetric === "violations"
                        ? "font-semibold text-foreground border-b-2 border-primary"
                        : "font-medium text-muted-foreground"
                    )}>
                    <div className="flex items-center gap-1">
                      Violations
                      {comparisonMetric === "violations" && (
                        <span className="text-[10px]">
                          {comparisonSortDirection === "desc" ? "↓" : "↑"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => {
                      if (comparisonMetric === "blocked") {
                        setComparisonSortDirection(
                          comparisonSortDirection === "desc" ? "asc" : "desc"
                        );
                      } else {
                        setComparisonMetric("blocked");
                        setComparisonSort("violations");
                        setComparisonSortDirection("desc");
                      }
                    }}
                    className={cn(
                      "text-left text-xs px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none",
                      comparisonMetric === "blocked"
                        ? "font-semibold text-foreground border-b-2 border-primary"
                        : "font-medium text-muted-foreground"
                    )}>
                    <div className="flex items-center gap-1">
                      Blocked
                      {comparisonMetric === "blocked" && (
                        <span className="text-[10px]">
                          {comparisonSortDirection === "desc" ? "↓" : "↑"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => {
                      if (comparisonMetric === "views") {
                        setComparisonSortDirection(
                          comparisonSortDirection === "desc" ? "asc" : "desc"
                        );
                      } else {
                        setComparisonMetric("views");
                        setComparisonSort("views");
                        setComparisonSortDirection("desc");
                      }
                    }}
                    className={cn(
                      "text-left text-xs px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none",
                      comparisonMetric === "views"
                        ? "font-semibold text-foreground border-b-2 border-primary"
                        : "font-medium text-muted-foreground"
                    )}>
                    <div className="flex items-center gap-1">
                      Views
                      {comparisonMetric === "views" && (
                        <span className="text-[10px]">
                          {comparisonSortDirection === "desc" ? "↓" : "↑"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => {
                      if (comparisonMetric === "active") {
                        setComparisonSortDirection(
                          comparisonSortDirection === "desc" ? "asc" : "desc"
                        );
                      } else {
                        setComparisonMetric("active");
                        setComparisonSort("active");
                        setComparisonSortDirection("desc");
                      }
                    }}
                    className={cn(
                      "text-left text-xs px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none",
                      comparisonMetric === "active"
                        ? "font-semibold text-foreground border-b-2 border-primary"
                        : "font-medium text-muted-foreground"
                    )}>
                    <div className="flex items-center gap-1">
                      Still active
                      {comparisonMetric === "active" && (
                        <span className="text-[10px]">
                          {comparisonSortDirection === "desc" ? "↓" : "↑"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => {
                      if (comparisonMetric === "response") {
                        setComparisonSortDirection(
                          comparisonSortDirection === "desc" ? "asc" : "desc"
                        );
                      } else {
                        setComparisonMetric("response");
                        setComparisonSort("response");
                        setComparisonSortDirection("desc");
                      }
                    }}
                    className={cn(
                      "text-left text-xs px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none",
                      comparisonMetric === "response"
                        ? "font-semibold text-foreground border-b-2 border-primary"
                        : "font-medium text-muted-foreground"
                    )}>
                    <div className="flex items-center gap-1">
                      Avg block time
                      {comparisonMetric === "response" && (
                        <span className="text-[10px]">
                          {comparisonSortDirection === "desc" ? "↓" : "↑"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Calculate metrics per platform respecting contentTypeFilter
                  const platformMetrics = platformOperations.map((platform) => {
                    const filteredViolations =
                      contentTypeFilter === "all"
                        ? platform.violations
                        : platform.violations.filter(
                            (v) => v.type.toLowerCase() === contentTypeFilter
                          );

                    const totalViolations = filteredViolations.length;
                    const blockedViolations = filteredViolations.filter(
                      (v) => v.status === "Blocked" || v.status === "Removed"
                    );
                    const blockedCount = blockedViolations.length;
                    const blockedPercent =
                      totalViolations > 0
                        ? Math.round((blockedCount / totalViolations) * 100)
                        : 0;

                    const totalViews = filteredViolations.reduce((sum, v) => {
                      const views = parseFloat(v.views.replace("K", "")) * 1000;
                      return sum + views;
                    }, 0);

                    const activeCount = filteredViolations.filter((v) =>
                      ["reported", "active", "pending", "review"].includes(
                        v.status
                      )
                    ).length;

                    // Calculate avg block time
                    const avgBlockTimeMinutes =
                      blockedViolations.length > 0
                        ? blockedViolations.reduce((sum, v) => {
                            const blockInfo = calculateBlockDuration(v);
                            return sum + (blockInfo?.duration ?? 0);
                          }, 0) / blockedViolations.length
                        : 0;

                    return {
                      platform,
                      totalViolations,
                      blockedCount,
                      blockedPercent,
                      totalViews,
                      activeCount,
                      avgBlockTimeMinutes,
                    };
                  });

                  // Get max values for progress bars
                  const maxViolations = Math.max(
                    ...platformMetrics.map((p) => p.totalViolations),
                    1
                  );
                  const maxViews = Math.max(
                    ...platformMetrics.map((p) => p.totalViews),
                    1
                  );
                  const maxBlocked = Math.max(
                    ...platformMetrics.map((p) => p.blockedCount),
                    1
                  );
                  const maxResponse = Math.max(
                    ...platformMetrics.map((p) => p.avgBlockTimeMinutes),
                    1
                  );
                  const maxActive = Math.max(
                    ...platformMetrics.map((p) => p.activeCount),
                    1
                  );

                  // Sort platforms
                  const sortedMetrics = [...platformMetrics].sort((a, b) => {
                    let compareResult = 0;
                    switch (comparisonSort) {
                      case "violations":
                        compareResult = b.totalViolations - a.totalViolations;
                        break;
                      case "views":
                        compareResult = b.totalViews - a.totalViews;
                        break;
                      case "response":
                        compareResult =
                          b.avgBlockTimeMinutes - a.avgBlockTimeMinutes;
                        break;
                      case "active":
                        compareResult = b.activeCount - a.activeCount;
                        break;
                      default:
                        compareResult = 0;
                    }
                    return comparisonSortDirection === "desc"
                      ? compareResult
                      : -compareResult;
                  });

                  // SLA threshold (example: 10 min)
                  const slaThreshold = 10;

                  return sortedMetrics.map((metrics, index) => {
                    const { platform } = metrics;
                    const IconComponent = platform.icon;

                    // Calculate progress percentages
                    const violationsProgress =
                      (metrics.totalViolations / maxViolations) * 100;
                    const viewsProgress = (metrics.totalViews / maxViews) * 100;
                    const blockedProgress =
                      (metrics.blockedCount / maxBlocked) * 100;
                    const responseProgress =
                      (metrics.avgBlockTimeMinutes / maxResponse) * 100;
                    const activeProgress =
                      (metrics.activeCount / maxActive) * 100;

                    // Status pill
                    let statusVariant: "default" | "secondary" | "destructive" =
                      "default";
                    let statusText = "Within target";
                    if (metrics.avgBlockTimeMinutes > slaThreshold * 1.5) {
                      statusVariant = "destructive";
                      statusText = "Slow";
                    } else if (metrics.avgBlockTimeMinutes > slaThreshold) {
                      statusVariant = "secondary";
                      statusText = "Slightly slow";
                    }

                    return (
                      <tr
                        key={platform.id}
                        onClick={() => {
                          // Update P2 platform selection
                          if (selectedSlots.includes(platform.id)) {
                            // Platform is already visible, just highlight it
                            const element = document.getElementById(
                              `platform-card-${platform.id}`
                            );
                            if (element) {
                              element.scrollIntoView({
                                behavior: "smooth",
                                block: "center",
                              });
                              element.classList.add(
                                "ring-2",
                                "ring-primary",
                                "ring-offset-2"
                              );
                              setTimeout(() => {
                                element.classList.remove(
                                  "ring-2",
                                  "ring-primary",
                                  "ring-offset-2"
                                );
                              }, 2000);
                            }
                          } else {
                            // Platform is not visible: keep left card, replace right card
                            if (selectedSlots.length === 0) {
                              // No platforms visible, add as first
                              setSelectedSlots([platform.id]);
                            } else if (selectedSlots.length === 1) {
                              // One platform visible, add as second
                              setSelectedSlots([selectedSlots[0], platform.id]);
                            } else {
                              // Two platforms visible, replace the right one
                              setSelectedSlots([selectedSlots[0], platform.id]);
                            }

                            // Scroll to the platform operations section
                            setTimeout(() => {
                              const element = document.getElementById(
                                `platform-card-${platform.id}`
                              );
                              if (element) {
                                element.scrollIntoView({
                                  behavior: "smooth",
                                  block: "center",
                                });
                                element.classList.add(
                                  "ring-2",
                                  "ring-primary",
                                  "ring-offset-2"
                                );
                                setTimeout(() => {
                                  element.classList.remove(
                                    "ring-2",
                                    "ring-primary",
                                    "ring-offset-2"
                                  );
                                }, 2000);
                              }
                            }, 100);
                          }
                        }}
                        className="border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors">
                        {/* Platform */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <IconComponent
                              className="h-4 w-4"
                              style={{ color: platform.color }}
                            />
                            <span className="text-sm font-medium">
                              {platform.name}
                            </span>
                          </div>
                        </td>

                        {/* Violations */}
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "text-sm",
                              comparisonMetric === "violations"
                                ? "font-semibold"
                                : "font-medium"
                            )}>
                            {metrics.totalViolations}
                          </span>
                        </td>

                        {/* Blocked */}
                        <td className="px-4 py-3">
                          <div>
                            <p
                              className={cn(
                                "text-sm",
                                comparisonMetric === "blocked"
                                  ? "font-semibold"
                                  : "font-medium"
                              )}>
                              {metrics.blockedCount} blocked
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {metrics.blockedPercent}% success
                            </p>
                          </div>
                        </td>

                        {/* Views */}
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "text-sm",
                              comparisonMetric === "views"
                                ? "font-semibold"
                                : "font-medium"
                            )}>
                            {formatViews(metrics.totalViews)}
                          </span>
                        </td>

                        {/* Still active */}
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "text-sm",
                              comparisonMetric === "active"
                                ? "font-semibold"
                                : "font-medium"
                            )}>
                            {metrics.activeCount}
                          </span>
                        </td>

                        {/* Avg block time */}
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "text-sm",
                              comparisonMetric === "response"
                                ? "font-semibold"
                                : "font-medium"
                            )}>
                            {metrics.avgBlockTimeMinutes.toFixed(1)} min
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <Badge variant={statusVariant} className="text-xs">
                            {statusText}
                          </Badge>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Add/Edit Violation Drawer */}
      <Sheet open={isAddViolationOpen} onOpenChange={setIsAddViolationOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {isEditMode ? "Edit Violation" : "Add Violation"}
            </SheetTitle>
            <SheetDescription>
              {isEditMode
                ? "Update violation details"
                : "Add a new violation for this match and platform"}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6">
            {/* Match (Read-only) */}
            <div className="space-y-2">
              <Label>Match</Label>
              <Input
                value={match ? `${match.team1} vs ${match.team2}` : ""}
                disabled
              />
            </div>

            {/* Platform (Read-only) */}
            <div className="space-y-2">
              <Label>Platform</Label>
              <Input
                value={
                  platformOperations.find(
                    (p) => p.id === selectedPlatformForAdd
                  )?.name || ""
                }
                disabled
              />
            </div>

            {/* Violation URL */}
            <div className="space-y-2">
              <Label htmlFor="violation-url">Violation URL *</Label>
              <Input
                id="violation-url"
                placeholder="https://x.com/..."
                value={formUrl}
                onChange={(e) => {
                  const url = e.target.value;
                  setFormUrl(url);
                  // Auto-extract account handle from URL
                  const extractedHandle = extractAccountHandleFromUrl(url);
                  if (extractedHandle) {
                    setFormAccountHandle(extractedHandle);
                  }
                }}
              />
            </div>

            {/* Account / Channel */}
            <div className="space-y-2">
              <Label htmlFor="account-handle">Account / Channel *</Label>
              <Input
                id="account-handle"
                placeholder="@username or channel name"
                value={formAccountHandle}
                onChange={(e) => setFormAccountHandle(e.target.value)}
              />
            </div>

            {/* Content Type */}
            <div className="space-y-2">
              <Label htmlFor="content-type">Content Type *</Label>
              <Select
                value={formContentType}
                onValueChange={setFormContentType}>
                <SelectTrigger id="content-type">
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="highlights">Highlights</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formStatus}
                onValueChange={(value: string) => {
                  const validStatus = value as
                    | "Active"
                    | "Blocked"
                    | "Removed"
                    | "Under Review";
                  setFormStatus(validStatus);
                  // Auto-prefill blockedAt when status changes to blocked/removed
                  if (
                    (value === "Blocked" || value === "Removed") &&
                    !formBlockedAt
                  ) {
                    setFormBlockedAt(getKSATime());
                  }
                }}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                  <SelectItem value="Removed">Removed</SelectItem>
                  <SelectItem value="Under Review">Under Review</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Views (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="views">Views (optional)</Label>
              <Input
                id="views"
                type="text"
                placeholder="0"
                value={formViews}
                onChange={(e) => {
                  const value = e.target.value.replace(/,/g, "");
                  if (value === "" || /^\d+$/.test(value)) {
                    const formatted =
                      value === ""
                        ? ""
                        : parseInt(value).toLocaleString("en-US");
                    setFormViews(formatted);
                  }
                }}
              />
            </div>

            {/* Time Added */}
            <div className="space-y-2">
              <Label htmlFor="time-added">Time Added *</Label>
              <Input
                id="time-added"
                type="datetime-local"
                value={formTimeAdded}
                onChange={(e) => setFormTimeAdded(e.target.value)}
              />
            </div>

            {/* Blocked at (conditional) */}
            {(formStatus === "Blocked" ||
              formStatus === "Removed" ||
              (isEditMode && formBlockedAt)) && (
              <div className="space-y-2">
                <Label htmlFor="blocked-at">Blocked at (optional)</Label>
                <Input
                  id="blocked-at"
                  type="datetime-local"
                  value={formBlockedAt}
                  onChange={(e) => setFormBlockedAt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty or adjust the auto-filled time
                </p>
              </div>
            )}

            {/* Notes (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add operator comments or notes..."
                rows={4}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>
          </div>

          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddViolationOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveViolation}>
              {isEditMode ? "Save changes" : "Save Violation"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Violation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this violation? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteConfirmOpen(false);
                setDeleteConfirmViolation(null);
              }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteViolation}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Match Report */}
      <MatchReport
        open={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        matchName={match ? `${match.team1} vs ${match.team2}` : ""}
        week={match ? `Week ${match.week || "N/A"}` : "N/A"}
        competition={match ? getCompetitionName() : "N/A"}
        stadium="Prince Mohammed bin Fahd Stadium"
        date="21 مايو 2026"
        time="20:30"
        status="live"
        matchId={id || "match-1"}
        liveMetrics={platformOperations.map((platform) => {
          const liveViolations = platform.violations.filter(
            (v) => v.type.toLowerCase() === "live"
          );
          const blockedLive = liveViolations.filter(
            (v) => v.status === "Blocked" || v.status === "Removed"
          );
          const totalViews = liveViolations.reduce((sum, v) => {
            const views = parseFloat(v.views.replace("K", "")) * 1000;
            return sum + views;
          }, 0);
          const avgBlockTime =
            blockedLive.length > 0
              ? blockedLive.reduce((sum, v) => {
                  const blockInfo = calculateBlockDuration(v);
                  return sum + (blockInfo?.duration ?? 0);
                }, 0) / blockedLive.length
              : 0;

          const platformArabicNames: { [key: string]: string } = {
            "X/Twitter": "تويتر",
            YouTube: "يوتيوب",
            Facebook: "فيسبوك",
            TikTok: "تيك توك",
            Instagram: "إنستغرام",
            Telegram: "تيليجرام",
            IPTV: "IPTV",
            Websites: "مواقع",
          };

          const IconComponent = platform.icon;

          return {
            platform: platform.name,
            platformArabic: platformArabicNames[platform.name] || platform.name,
            icon: (
              <IconComponent
                className="h-4 w-4"
                style={{ color: platform.color }}
              />
            ),
            detected: liveViolations.length,
            blocked: blockedLive.length,
            successRate:
              liveViolations.length > 0
                ? Math.round((blockedLive.length / liveViolations.length) * 100)
                : 0,
            avgBlockTime,
            views: totalViews,
          };
        })}
        highlightsMetrics={platformOperations.map((platform) => {
          const highlightsViolations = platform.violations.filter(
            (v) => v.type.toLowerCase() === "highlights"
          );
          const blockedHighlights = highlightsViolations.filter(
            (v) => v.status === "Blocked" || v.status === "Removed"
          );
          const totalViews = highlightsViolations.reduce((sum, v) => {
            const views = parseFloat(v.views.replace("K", "")) * 1000;
            return sum + views;
          }, 0);
          const avgBlockTime =
            blockedHighlights.length > 0
              ? blockedHighlights.reduce((sum, v) => {
                  const blockInfo = calculateBlockDuration(v);
                  return sum + (blockInfo?.duration ?? 0);
                }, 0) / blockedHighlights.length
              : 0;

          const platformArabicNames: { [key: string]: string } = {
            "X/Twitter": "تويتر",
            YouTube: "يوتيوب",
            Facebook: "فيسبوك",
            TikTok: "تيك توك",
            Instagram: "إنستغرام",
            Telegram: "تيليجرام",
            IPTV: "IPTV",
            Websites: "مواقع",
          };

          const IconComponent = platform.icon;

          return {
            platform: platform.name,
            platformArabic: platformArabicNames[platform.name] || platform.name,
            icon: (
              <IconComponent
                className="h-4 w-4"
                style={{ color: platform.color }}
              />
            ),
            detected: highlightsViolations.length,
            blocked: blockedHighlights.length,
            successRate:
              highlightsViolations.length > 0
                ? Math.round(
                    (blockedHighlights.length / highlightsViolations.length) *
                      100
                  )
                : 0,
            avgBlockTime,
            views: totalViews,
          };
        })}
      />
    </div>
  );
}
