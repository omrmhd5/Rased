import { useParams } from "react-router-dom";
import { AlertCircle, RefreshCw, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import {
  MatchOverview,
  ContentSplitChart,
  ActivityLog,
  PlatformCard,
  PlatformFilters,
  PlatformComparison,
  AddViolationSheet,
  BlockConfirmDialog,
  DeleteConfirmDialog,
  AddNoteDialog,
  getInitialContentSplitData,
  getInitialActivityLog,
  getInitialPlatformOperations,
  formatViews,
  formatViewsString,
  getKSATime,
  convertKSATimeToUTC,
  convertUTCToKSATime,
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
  const [formNotes, setFormNotes] = useState<string[]>([]);
  
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

  // Add note dialog state
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [noteViolation, setNoteViolation] = useState<{
    platformId: string;
    violation: Violation;
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
  
  // Helper to get competition name
  const getCompetitionName = () => {
    if (!match) return "";
    if (typeof match.competition === "object" && match.competition !== null) {
      return (match.competition as { name?: string }).name || "";
    }
    return typeof match.competition === "string" ? match.competition : "";
  };

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
      } else if (cardFilter === "removed") {
        filtered = filtered.filter((v) => v.statusBadge === "Removed");
      } else {
        // Map lowercase filter to capitalized statusBadge
        const statusMap: Record<string, string> = {
          blocked: "Blocked",
          review: "Review",
        };
        const statusBadge = statusMap[cardFilter] || cardFilter;
        filtered = filtered.filter((v) => v.statusBadge === statusBadge);
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
    setFormNotes([]);
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
    // Convert timeAdded from UTC to KSA time for datetime-local input
    setFormTimeAdded(
      violation.timeAdded
        ? convertUTCToKSATime(violation.timeAdded)
        : getKSATime()
    );
    // Convert blockedAt from UTC to KSA time for datetime-local input
    setFormBlockedAt(
      violation.blockedAt
        ? convertUTCToKSATime(violation.blockedAt)
        : ""
    );
    setFormStillActive(
      violation.active !== undefined
        ? violation.active
        : violation.stillActive || false
    );
    setFormNotes(
      Array.isArray(violation.notes)
        ? violation.notes
        : violation.notes
        ? [violation.notes]
        : []
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
    // Convert block time to UTC (customBlockTime is in KSA time from datetime-local input)
    const blockTime =
      blockTimeChoice === "current"
        ? new Date().toISOString() // Current time is already in UTC
        : customBlockTime
        ? convertKSATimeToUTC(customBlockTime) // Convert KSA time to UTC
        : new Date().toISOString();

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

      // Handle blockedAt: send it if status is Blocked/Removed, otherwise don't send it
      let blockedAtValue: string | null | undefined = undefined;
      if (formStatus === "Blocked" || formStatus === "Removed") {
        // If blockedAt is provided, convert from KSA time to UTC; otherwise backend will set it to current time
        blockedAtValue = formBlockedAt ? convertKSATimeToUTC(formBlockedAt) : undefined;
      } else if (formStatus === "Active") {
        // For Active status, explicitly set to null to clear any existing blockedAt
        blockedAtValue = null;
      }

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
        // Convert timeAdded from KSA time (datetime-local) to UTC ISO string
        timeAdded: convertKSATimeToUTC(formTimeAdded),
        blockedAt: blockedAtValue,
        notes: formNotes.filter((note) => note.trim() !== ""),
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

  // Open add note dialog
  const openAddNoteDialog = (platformId: string, violation: Violation) => {
    setNoteViolation({ platformId, violation });
    setIsAddNoteOpen(true);
  };

  // Save note to violation
  const saveNote = async (note: string) => {
    if (!noteViolation) return;

    const { platformId, violation } = noteViolation;
    const platform = platformOperations.find((p) => p.id === platformId);
    if (!platform) return;

    try {
      const violationDbId =
        (violation as Violation & { _id?: string })._id ||
        violation.id.toString();

      // Get current notes and add the new one
      const currentNotes = Array.isArray(violation.notes) ? violation.notes : [];
      const updatedNotes = [...currentNotes, note];

      // Update violation with new note
      const response = await fetch(`${API_URL}/violations/${violationDbId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notes: updatedNotes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add note");
      }

      const updatedViolation = await response.json();

      // Update local state
      setPlatformOperations((prev) =>
        prev.map((p) => {
          if (p.id !== platformId) return p;

          const updatedViolations = p.violations.map((v) => {
            if (v.id === violation.id || v._id === violation._id) {
              return convertBackendViolationToFrontend(updatedViolation);
            }
            return v;
          });

          return {
            ...p,
            violations: updatedViolations,
            totalViolations: updatedViolations.length,
            activeViolations: updatedViolations.filter(
              (v) => v.status === "Active" || v.status === "Under Review"
            ).length,
            blockedCount: calculateBlockedCount(updatedViolations),
            blockedRate:
              updatedViolations.length > 0
                ? Math.round(
                    (calculateBlockedCount(updatedViolations) /
                      updatedViolations.length) *
                      100
                  )
                : 0,
            totalViews: calculateTotalViews(updatedViolations),
            avgBlockTime: calculateAvgBlockTime(updatedViolations),
            blockedSuccess: calculateBlockedSuccess(updatedViolations),
            stillActive: calculateStillActive(updatedViolations),
          };
        })
      );

      toast({
        title: "Note added",
        description: "Note has been added successfully",
      });

      setIsAddNoteOpen(false);
      setNoteViolation(null);
    } catch (error) {
      console.error("Error adding note:", error);
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive",
      });
    }
  };

  // Calculate KPIs from platform operations
  const totalViolations = platformOperations.reduce(
    (sum, p) => sum + p.totalViolations,
    0
  );
  
  // Calculate status-specific counts
  const allViolations = platformOperations.flatMap((p) => p.violations);
  const totalActive = allViolations.filter(
    (v) => v.status === "Active"
  ).length;
  const totalBlocked = allViolations.filter(
    (v) => v.status === "Blocked"
  ).length;
  const totalRemoved = allViolations.filter(
    (v) => v.status === "Removed"
  ).length;
  const totalUnderReview = allViolations.filter(
    (v) => v.status === "Under Review"
  ).length;
  
  // Block/removal success rate = (Blocked + Removed) / Total violations * 100
  const blockRemovalSuccessRate =
    totalViolations > 0
      ? Math.round(((totalBlocked + totalRemoved) / totalViolations) * 100)
      : 0;
  
  // Blocked rate (for MatchOverview - same as block/removal success rate)
  const blockedRate = blockRemovalSuccessRate;

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

      <BlockConfirmDialog
        open={isBlockConfirmOpen}
        onOpenChange={setIsBlockConfirmOpen}
        blockConfirmViolation={blockConfirmViolation}
        platformOperations={platformOperations}
        blockTimeChoice={blockTimeChoice}
        onBlockTimeChoiceChange={setBlockTimeChoice}
        customBlockTime={customBlockTime}
        onCustomBlockTimeChange={setCustomBlockTime}
        onConfirm={confirmBlock}
      />

      {/* Platform Operations Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Platform Operations (This Match)
          </h2>
                      </div>

        <PlatformFilters
          selectedSlots={selectedSlots}
          allPlatforms={platformOperations}
          contentTypeFilter={contentTypeFilter}
          onRemovePlatform={removePlatformFromSlot}
          onAddPlatform={addPlatformToSlot}
          onContentTypeFilterChange={setContentTypeFilter}
        />

        <div
          className={
            selectedSlots.length === 1
              ? "grid grid-cols-1 gap-6"
              : "grid grid-cols-1 lg:grid-cols-2 gap-6"
          }>
          {platformOperations
            .filter((platform) => selectedSlots.includes(platform.id))
            .map((platform) => {
              const cardFilter = platformCardFilter[platform.id] || "all";
              const filteredViolations = getFilteredViolations(
                platform.id,
                platform.violations
              );

                    return (
                <PlatformCard
                        key={platform.id}
                  platform={platform}
                  filteredViolations={filteredViolations}
                  cardFilter={cardFilter}
                  searchQuery={platformSearchQuery[platform.id] || ""}
                  onFilterChange={(filter) =>
                    setPlatformCardFilter({
                      ...platformCardFilter,
                      [platform.id]: filter,
                    })
                  }
                  onSearchChange={(query) =>
                    setPlatformSearchQuery({
                      ...platformSearchQuery,
                      [platform.id]: query,
                    })
                  }
                  onAddViolation={() => openAddViolationDrawer(platform.id)}
                  onEdit={openEditViolationDrawer}
                  onToggleStatus={toggleViolationStatus}
                  onDelete={deleteViolation}
                  onCopyUrl={copyViolationUrl}
                  onAddNote={openAddNoteDialog}
                  getPlatformIcon={getPlatformIcon}
                />
              );
            })}
          </div>
      </div>

      <PlatformComparison
        platformOperations={platformOperations}
        contentTypeFilter={contentTypeFilter}
        comparisonMetric={comparisonMetric}
        comparisonSort={comparisonSort}
        comparisonSortDirection={comparisonSortDirection}
        selectedSlots={selectedSlots}
        onMetricChange={setComparisonMetric}
        onSortChange={setComparisonSort}
        onSortDirectionChange={setComparisonSortDirection}
        onSelectedSlotsChange={setSelectedSlots}
      />

      <AddViolationSheet
        open={isAddViolationOpen}
        onOpenChange={setIsAddViolationOpen}
        isEditMode={isEditMode}
        match={match}
        platformOperations={platformOperations}
        selectedPlatformForAdd={selectedPlatformForAdd}
        formUrl={formUrl}
        onFormUrlChange={setFormUrl}
        formAccountHandle={formAccountHandle}
        onFormAccountHandleChange={setFormAccountHandle}
        formContentType={formContentType}
        onFormContentTypeChange={setFormContentType}
        formStatus={formStatus}
        onFormStatusChange={setFormStatus}
        formViews={formViews}
        onFormViewsChange={setFormViews}
        formTimeAdded={formTimeAdded}
        onFormTimeAddedChange={setFormTimeAdded}
        formBlockedAt={formBlockedAt}
        onFormBlockedAtChange={setFormBlockedAt}
        formNotes={formNotes}
        onFormNotesChange={setFormNotes}
        onNoteChange={(index, note) => {
          const updated = [...formNotes];
          updated[index] = note;
          setFormNotes(updated);
        }}
        onAddNote={() => {
          setFormNotes([...formNotes, ""]);
        }}
        onDeleteNote={(index) => {
          setFormNotes(formNotes.filter((_, i) => i !== index));
        }}
        onSave={saveViolation}
      />

      <DeleteConfirmDialog
        open={isDeleteConfirmOpen}
        onOpenChange={(open) => {
          setIsDeleteConfirmOpen(open);
          if (!open) setDeleteConfirmViolation(null);
        }}
        onConfirm={confirmDeleteViolation}
      />

      <AddNoteDialog
        open={isAddNoteOpen}
        onOpenChange={(open) => {
          setIsAddNoteOpen(open);
          if (!open) setNoteViolation(null);
        }}
        violation={noteViolation?.violation || null}
        onSave={saveNote}
      />
    </div>
  );
}
