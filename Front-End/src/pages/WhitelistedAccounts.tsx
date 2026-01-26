import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  UserCircle,
  Layers,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getInitialPlatformOperations,
  fetchPlatformsFromBackend,
} from "@/components/MatchDashboard/constants";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { WhitelistedAccountsMobile } from "./WhitelistedAccountsMobile";

import { API_URL, BASE_URL } from "@/components/MatchDashboard/types";

interface WhitelistedAccount {
  _id: string;
  accountChannel: string;
  platforms: string[];
  platformNames?: { [key: string]: string };
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Violation {
  _id: string;
  violationUrl: string;
  platformId: string;
  platformName: string;
  status: string;
  contentType: string;
  views: string;
  timeAdded: string;
  matchName?: string;
  accountChannel?: string;
  matchId?:
    | {
        _id?: string;
        externalMatchId?: string;
      }
    | string;
  externalMatchId?: string;
  auditLog?: {
    action: string;
    userName: string;
  }[];
}

interface BulkViolation {
  _id: string;
  bulkId: string;
  matchId: string;
  accountChannel: string;
  platformId: string;
  platformName: string;
  totalCount: number;
  activeCount: number;
  blockedCount: number;
  removedCount: number;
  underReviewCount: number;
  totalViews: number;
  liveCount: number;
  highlightsCount: number;
  othersCount: number;
  timeAdded: string;
}

export default function WhitelistedAccounts() {
  const navigate = useNavigate();
  const { user, leagues, loadingLeagues } = useAuth();
  const { t, isRTL } = useLanguage();
  const isSuperAdmin = user?.role === "superAdmin";

  // Get available leagues based on user role
  const getAvailableLeagues = (): string[] => {
    if (!user || !leagues) return [];

    // Filter out hidden leagues
    const visibleLeagues = leagues.filter((l) => !l.isHidden);

    // SuperAdmin and Viewer can access all visible leagues
    if (user.role === "superAdmin" || user.role === "viewer") {
      return visibleLeagues.map((l) => l.league);
    }

    // Employees can only access their assigned leagues (that are visible)
    if (user.role === "employee" && user.leagues) {
      return visibleLeagues
        .filter((l) => user.leagues?.includes(l.league))
        .map((l) => l.league);
    }

    return [];
  };

  // Validate user's league access on mount and when user/leagues change
  useEffect(() => {
    // Wait until leagues are loaded before validating
    if (!user || loadingLeagues) {
      return;
    }

    // If leagues array is empty after loading, something went wrong - but don't redirect yet
    if (leagues.length === 0) {
      return;
    }

    // Get available leagues based on user role
    const visibleLeagues = leagues.filter((l) => !l.isHidden);
    let availableLeaguesList: string[] = [];
    if (user.role === "superAdmin" || user.role === "viewer") {
      availableLeaguesList = visibleLeagues.map((l) => l.league);
    } else if (user.role === "employee" && user.leagues) {
      availableLeaguesList = visibleLeagues
        .filter((l) => user.leagues?.includes(l.league))
        .map((l) => l.league);
    }

    // For employees: if they have no available leagues, redirect to home
    if (user.role === "employee" && availableLeaguesList.length === 0) {
      navigate("/");
      return;
    }

    // Validate saved league from localStorage (if exists)
    const savedLeague = localStorage.getItem("selectedLeague");
    if (savedLeague) {
      const leagueInfo = leagues.find((l) => l.league === savedLeague);

      // For employees: check if saved league is still in their assigned leagues
      if (user.role === "employee") {
        const isInAssignedLeagues =
          user.leagues && user.leagues.includes(savedLeague);
        const isVisible = leagueInfo && !leagueInfo.isHidden;

        if (!isInAssignedLeagues || !isVisible) {
          // Saved league is no longer valid - redirect to home to select new league
          navigate("/");
        }
        // If valid, do nothing - let the page continue
      } else {
        // For superAdmin/viewer: check if saved league is still valid
        if (
          !leagueInfo ||
          leagueInfo.isHidden ||
          !availableLeaguesList.includes(savedLeague)
        ) {
          // Saved league is no longer valid - redirect to home
          navigate("/");
        }
        // If valid, do nothing - let the page continue
      }
    }
    // Only run validation when user role, leagues finish loading, or leagues array changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user?.id, loadingLeagues, leagues?.length]);
  const [accounts, setAccounts] = useState<WhitelistedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Violations state - map of accountChannel to violations
  const [accountViolations, setAccountViolations] = useState<{
    [key: string]: Violation[];
  }>({});
  const [accountBulkViolations, setAccountBulkViolations] = useState<{
    [key: string]: BulkViolation[];
  }>({});
  const [loadingViolations, setLoadingViolations] = useState<{
    [key: string]: boolean;
  }>({});

  // Form states
  const [accountChannel, setAccountChannel] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [platformNames, setPlatformNames] = useState<{ [key: string]: string }>(
    {},
  );
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] =
    useState<WhitelistedAccount | null>(null);
  const [deletingAccount, setDeletingAccount] =
    useState<WhitelistedAccount | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // State for Violations Modal
  const [violationsAccount, setViolationsAccount] =
    useState<WhitelistedAccount | null>(null);
  const [isViolationsDialogOpen, setIsViolationsDialogOpen] = useState(false);
  const [dialogCurrentPage, setDialogCurrentPage] = useState(1);
  const [dialogSearchQuery, setDialogSearchQuery] = useState("");
  const [dialogViewMetaFilter, setDialogViewMetaFilter] = useState<
    "all" | "bulk" | "individual"
  >("all");
  const dialogItemsPerPage = 10;

  // Get platform operations for checkboxes - fetch from backend
  const [platformOperations, setPlatformOperations] = useState(
    getInitialPlatformOperations(),
  );

  // Fetch platforms from backend on mount
  useEffect(() => {
    const loadPlatforms = async () => {
      const platforms = await fetchPlatformsFromBackend();
      setPlatformOperations(platforms);
    };
    loadPlatforms();
  }, []);

  // Fetch whitelisted accounts
  useEffect(() => {
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch violations for accounts when they change (only fetch once per account)
  useEffect(() => {
    if (accounts.length > 0 && user && leagues) {
      // Only fetch violations for accounts that don't already have violations loaded
      accounts.forEach((account) => {
        const key = account._id;
        // Only fetch if we don't already have violations or aren't currently loading
        if (!accountViolations[key] && !loadingViolations[key]) {
          fetchViolationsForAccount(account);
        }
      });
    }
    // Only depend on accounts length and user id, not the full objects or leagues array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts.length, user?.id]);

  // Get account name for a platform (main name or platform-specific)
  const getAccountNameForPlatform = (
    account: WhitelistedAccount,
    platformId: string,
  ): string => {
    if (account.platformNames && account.platformNames[platformId]) {
      return account.platformNames[platformId];
    }
    return account.accountChannel;
  };

  // Filter accounts by search query
  const filteredAccounts = accounts.filter((account) => {
    if (!searchQuery.trim()) return true;
    const searchLower = searchQuery.toLowerCase();
    return account.accountChannel.toLowerCase().includes(searchLower);
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAccounts = filteredAccounts.slice(startIndex, endIndex);

  // Create array of pages to display for pagination
  const pagesToShow: (number | string)[] = [];
  if (totalPages > 1) {
    for (let page = 1; page <= totalPages; page++) {
      if (
        page === 1 ||
        page === totalPages ||
        (page >= currentPage - 1 && page <= currentPage + 1)
      ) {
        pagesToShow.push(page);
      } else if (page === currentPage - 2 || page === currentPage + 2) {
        pagesToShow.push("...");
      }
    }
  }
  // Reverse for RTL
  const displayPages = isRTL ? [...pagesToShow].reverse() : pagesToShow;

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/whitelisted-accounts`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch whitelisted accounts");
      }

      const data = await response.json();
      setAccounts(data || []);
    } catch (error) {
      console.error("Error fetching whitelisted accounts:", error);
      toast({
        title: t("whitelistedAccounts.error.title"),
        description: t("whitelistedAccounts.error.failedToLoad"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch violations for a specific account
  const fetchViolationsForAccount = async (account: WhitelistedAccount) => {
    const key = account._id;
    setLoadingViolations((prev) => ({ ...prev, [key]: true }));

    try {
      const availableLeagues = getAvailableLeagues();

      // If no leagues available, return empty array
      if (availableLeagues.length === 0) {
        setAccountViolations((prev) => ({
          ...prev,
          [key]: [],
        }));
        setAccountBulkViolations((prev) => ({
          ...prev,
          [key]: [],
        }));
        return;
      }

      // Fetch individual violations for each platform that this account is whitelisted on
      const violationPromises = account.platforms.map(async (platformId) => {
        // Get the account name for this platform (main name or platform-specific)
        const accountNameForPlatform = getAccountNameForPlatform(
          account,
          platformId,
        );

        // Fetch violations for each allowed league and combine
        const leagueViolationPromises = availableLeagues.map(async (league) => {
          // Fetch violations for this platform and league
          const response = await fetch(
            `${API_URL}/violations?platformId=${platformId}&league=${league}&limit=1000`,
            {
              credentials: "include",
            },
          );

          if (!response.ok) {
            return [];
          }

          const violations = await response.json();
          // Filter to only EXACT accountChannel matches (case-insensitive)
          // If platform-specific name exists, ONLY check that name (not the main name)
          // Otherwise, check the main account name
          return violations.filter((v: Violation) => {
            if (!v.accountChannel || v.platformId !== platformId) {
              return false;
            }

            const violationName = v.accountChannel.trim().toLowerCase();
            const platformName = accountNameForPlatform.trim().toLowerCase();

            // Exact match only - no contains/substring matching
            // Since accountNameForPlatform already returns platform-specific name if it exists,
            // or main name if it doesn't, we just need to check against that
            return violationName === platformName;
          });
        });

        const leagueViolationsArrays = await Promise.all(
          leagueViolationPromises,
        );
        return leagueViolationsArrays.flat();
      });

      // Fetch bulk violations for each platform
      const bulkViolationPromises = account.platforms.map(
        async (platformId) => {
          const accountNameForPlatform = getAccountNameForPlatform(
            account,
            platformId,
          );

          try {
            const response = await fetch(
              `${API_URL}/violations/bulk?accountChannel=${encodeURIComponent(
                accountNameForPlatform,
              )}&platformId=${platformId}&limit=1000`,
              {
                credentials: "include",
              },
            );

            if (!response.ok) {
              return [];
            }

            const bulks = await response.json();
            // Filter to exact match on accountChannel and extract matchId properly
            return (bulks || [])
              .filter((b: any) => {
                const bulkName = b.accountChannel.trim().toLowerCase();
                const platformName = accountNameForPlatform
                  .trim()
                  .toLowerCase();
                return bulkName === platformName && b.platformId === platformId;
              })
              .map((b: any) => ({
                ...b,
                // Extract externalMatchId from populated matchId object
                matchId:
                  typeof b.matchId === "object" && b.matchId?.externalMatchId
                    ? b.matchId.externalMatchId
                    : b.matchId,
              }));
          } catch {
            return [];
          }
        },
      );

      const [violationsArrays, bulksArrays] = await Promise.all([
        Promise.all(violationPromises),
        Promise.all(bulkViolationPromises),
      ]);

      const allViolations = violationsArrays.flat();
      const allBulks = bulksArrays.flat();

      // Deduplicate violations by _id to prevent duplicates from manual leagues or overlapping queries
      const uniqueViolations = Array.from(
        new Map(allViolations.map((v: Violation) => [v._id, v])).values(),
      );

      // Deduplicate bulk violations by bulkId
      const uniqueBulks = Array.from(
        new Map(allBulks.map((b: BulkViolation) => [b.bulkId, b])).values(),
      );

      setAccountViolations((prev) => ({
        ...prev,
        [key]: uniqueViolations,
      }));

      setAccountBulkViolations((prev) => ({
        ...prev,
        [key]: uniqueBulks,
      }));
    } catch (error) {
      console.error(
        `Error fetching violations for account ${account.accountChannel}:`,
        error,
      );
      setAccountViolations((prev) => ({
        ...prev,
        [key]: [],
      }));
      setAccountBulkViolations((prev) => ({
        ...prev,
        [key]: [],
      }));
    } finally {
      setLoadingViolations((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Reset form
  const resetForm = () => {
    setAccountChannel("");
    setSelectedPlatforms([]);
    setPlatformNames({});
    setNotes("");
    setFormError("");
  };

  // Handle platform name change
  const handlePlatformNameChange = (platformId: string, name: string) => {
    setPlatformNames((prev) => {
      const updated = { ...prev };
      if (name.trim()) {
        updated[platformId] = name.trim();
      } else {
        delete updated[platformId];
      }
      return updated;
    });
  };

  // Handle platform checkbox change
  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms((prev) => {
      if (prev.includes(platformId)) {
        // Remove platform name when unchecking
        setPlatformNames((names) => {
          const updated = { ...names };
          delete updated[platformId];
          return updated;
        });
        return prev.filter((id) => id !== platformId);
      } else {
        return [...prev, platformId];
      }
    });
  };

  // Handle add account
  const handleAddAccount = async () => {
    setFormError("");

    if (!accountChannel.trim()) {
      setFormError(t("whitelistedAccounts.accountChannelRequired"));
      return;
    }

    if (selectedPlatforms.length === 0) {
      setFormError(t("whitelistedAccounts.atLeastOnePlatform"));
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/whitelisted-accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          accountChannel: accountChannel.trim(),
          platforms: selectedPlatforms,
          platformNames: platformNames,
          notes: notes.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to add whitelisted account");
      }

      await fetchAccounts();
      resetForm();
      setIsAddDialogOpen(false);
      toast({
        title: t("whitelistedAccounts.success.title"),
        description: t("whitelistedAccounts.success.accountWhitelisted", {
          account: accountChannel.trim(),
        }),
      });
      // Violations will be fetched automatically via useEffect
    } catch (error) {
      console.error("Error adding whitelisted account:", error);
      setFormError(
        error instanceof Error
          ? error.message
          : t("whitelistedAccounts.error.failedToAddAccount"),
      );
      toast({
        title: t("whitelistedAccounts.error.failedToAdd"),
        description:
          error instanceof Error
            ? error.message
            : t("whitelistedAccounts.error.failedToAdd"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle edit account
  const handleEditAccount = async () => {
    if (!editingAccount) return;

    setFormError("");

    if (!accountChannel.trim()) {
      setFormError(t("whitelistedAccounts.accountChannelRequired"));
      return;
    }

    if (selectedPlatforms.length === 0) {
      setFormError(t("whitelistedAccounts.atLeastOnePlatform"));
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        `${API_URL}/whitelisted-accounts/${editingAccount._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            accountChannel: accountChannel.trim(),
            platforms: selectedPlatforms,
            platformNames: platformNames,
            notes: notes.trim(),
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Failed to update whitelisted account",
        );
      }

      await fetchAccounts();
      resetForm();
      setIsEditDialogOpen(false);
      setEditingAccount(null);
      toast({
        title: t("whitelistedAccounts.success.title"),
        description: t("whitelistedAccounts.success.accountUpdated", {
          account: accountChannel.trim(),
        }),
      });
      // Violations will be fetched automatically via useEffect
    } catch (error) {
      console.error("Error updating whitelisted account:", error);
      setFormError(
        error instanceof Error
          ? error.message
          : t("whitelistedAccounts.error.failedToUpdateAccount"),
      );
      toast({
        title: t("whitelistedAccounts.error.failedToUpdate"),
        description:
          error instanceof Error
            ? error.message
            : t("whitelistedAccounts.error.failedToUpdate"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle delete account
  const handleDeleteAccount = async () => {
    if (!deletingAccount) return;

    setSaving(true);
    try {
      const response = await fetch(
        `${API_URL}/whitelisted-accounts/${deletingAccount._id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Failed to delete whitelisted account",
        );
      }

      await fetchAccounts();
      setIsDeleteDialogOpen(false);
      setDeletingAccount(null);
      toast({
        title: t("whitelistedAccounts.success.title"),
        description: t("whitelistedAccounts.success.accountRemoved", {
          account: deletingAccount.accountChannel,
        }),
      });
    } catch (error) {
      console.error("Error deleting whitelisted account:", error);
      toast({
        title: t("whitelistedAccounts.error.title"),
        description:
          error instanceof Error
            ? error.message
            : t("whitelistedAccounts.error.failedToDelete"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (account: WhitelistedAccount) => {
    setEditingAccount(account);
    setAccountChannel(account.accountChannel);
    setSelectedPlatforms([...account.platforms]);
    setPlatformNames(account.platformNames || {});
    setNotes(account.notes || "");
    setFormError("");
    setIsEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (account: WhitelistedAccount) => {
    setDeletingAccount(account);
    setIsDeleteDialogOpen(true);
  };

  // Handle viewing violations in modal
  const handleViewViolations = (account: WhitelistedAccount) => {
    setViolationsAccount(account);
    setDialogCurrentPage(1);
    setDialogSearchQuery("");
    setIsViolationsDialogOpen(true);
    // Fetch violations if not already loaded
    if (!accountViolations[account._id]) {
      fetchViolationsForAccount(account);
    }
  };

  // Get platform name by ID
  const getPlatformName = (platformId: string): string => {
    const platform = platformOperations.find((p) => p.id === platformId);
    return platform ? platform.name : platformId;
  };

  // Get platform icon by ID
  const getPlatformIcon = (platformId: string, className = "h-3 w-3") => {
    const platform = platformOperations.find((p) => p.id === platformId);
    if (!platform) return null;

    if (platform.iconUrl) {
      const src = platform.iconUrl.startsWith("http")
        ? platform.iconUrl
        : `${BASE_URL}${platform.iconUrl}`;
      return (
        <img
          src={src}
          alt={platform.name}
          className={`${className} object-contain`}
        />
      );
    }

    const IconComponent = platform.icon;
    return (
      <IconComponent className={className} style={{ color: platform.color }} />
    );
  };

  // Convert backend status to statusBadge format (for comparison - keep English)
  const getStatusBadgeKey = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (statusLower === "removed") return "Removed";
    if (statusLower === "under review") return "Review";
    if (statusLower === "active") return "Active";
    if (statusLower === "blocked") return "Blocked";
    return status;
  };

  // Convert backend status to translated display text
  const getStatusBadge = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (statusLower === "removed") return t("problematicAccounts.removed");
    if (statusLower === "under review") return t("dashboard.underReview");
    if (statusLower === "active") return t("dashboard.active");
    if (statusLower === "blocked") return t("dashboard.blocked");
    return status;
  };

  // Convert content type to translated display text
  const getContentTypeBadge = (contentType: string): string => {
    const contentTypeLower = contentType.toLowerCase();
    if (contentTypeLower === "live") return t("dashboard.live");
    if (contentTypeLower === "highlights") return t("dashboard.highlights");
    if (contentTypeLower === "others") return t("dashboard.others");
    return contentType;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
          {t("whitelistedAccounts.title")}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
          {t("whitelistedAccounts.subtitle")}
        </p>
      </div>

      {/* Add Account Card */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-lg sm:text-xl">
                {t("whitelistedAccounts.title")}
              </CardTitle>
            </div>
            {isSuperAdmin && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => resetForm()}
                    className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    <span className="hidden xs:inline">
                      {t("whitelistedAccounts.addAccount")}
                    </span>
                    <span className="xs:hidden">
                      {t("whitelistedAccounts.add")}
                    </span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl">
                      {t("whitelistedAccounts.addWhitelistedAccount")}
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">
                      {t("whitelistedAccounts.addDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
                    {formError && (
                      <Alert variant="destructive">
                        <AlertDescription>{formError}</AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-2">
                      <Label
                        htmlFor="account-channel"
                        className="text-xs sm:text-sm">
                        {t("whitelistedAccounts.accountChannel")}
                      </Label>
                      <Input
                        id="account-channel"
                        value={accountChannel}
                        onChange={(e) => setAccountChannel(e.target.value)}
                        placeholder={t(
                          "whitelistedAccounts.accountChannelPlaceholder",
                        )}
                        className="h-9 sm:h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      <Label className="text-xs sm:text-sm">
                        {t("whitelistedAccounts.selectPlatforms")}
                      </Label>
                      <div className="space-y-2 sm:space-y-3 p-3 sm:p-4 border rounded-lg">
                        {platformOperations.map((platform) => {
                          const PlatformIcon = platform.icon;
                          const isSelected = selectedPlatforms.includes(
                            platform.id,
                          );
                          const platformName = platformNames[platform.id] || "";
                          return (
                            <div key={platform.id} className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`platform-${platform.id}`}
                                  checked={isSelected}
                                  onCheckedChange={() =>
                                    handlePlatformToggle(platform.id)
                                  }
                                />
                                <Label
                                  htmlFor={`platform-${platform.id}`}
                                  className="flex items-center gap-2 cursor-pointer flex-1 text-xs sm:text-sm">
                                  {getPlatformIcon(
                                    platform.id,
                                    "h-3.5 w-3.5 sm:h-4 sm:w-4",
                                  )}
                                  <span>{platform.name}</span>
                                </Label>
                              </div>
                              {isSelected && (
                                <div className="ml-5 sm:ml-6 space-y-1">
                                  <Label
                                    htmlFor={`platform-name-${platform.id}`}
                                    className="text-[10px] sm:text-xs text-muted-foreground">
                                    {t(
                                      "whitelistedAccounts.accountNameForPlatform",
                                      { platform: platform.name },
                                    )}
                                  </Label>
                                  <Input
                                    id={`platform-name-${platform.id}`}
                                    value={platformName}
                                    onChange={(e) =>
                                      handlePlatformNameChange(
                                        platform.id,
                                        e.target.value,
                                      )
                                    }
                                    placeholder={
                                      accountChannel ||
                                      t("whitelistedAccounts.sameAsMainName")
                                    }
                                    className="h-8 sm:h-9 text-xs sm:text-sm"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {selectedPlatforms.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          {t("whitelistedAccounts.atLeastOnePlatform")}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-xs sm:text-sm">
                        {t("whitelistedAccounts.notesOptional")}
                      </Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={t("whitelistedAccounts.notesPlaceholder")}
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddDialogOpen(false);
                        resetForm();
                      }}
                      className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                      {t("whitelistedAccounts.cancel")}
                    </Button>
                    <Button
                      onClick={handleAddAccount}
                      disabled={saving}
                      className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                      {saving ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                          {t("whitelistedAccounts.saving")}
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                          {t("whitelistedAccounts.addAccount")}
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <CardDescription className="text-xs sm:text-sm">
            {t("whitelistedAccounts.exemptFromTracking")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-muted-foreground mr-2" />
              <span className="text-xs sm:text-sm text-muted-foreground">
                {t("whitelistedAccounts.loadingAccounts")}
              </span>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-muted-foreground">
              <Shield className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-xs sm:text-sm">
                {t("whitelistedAccounts.noAccountsFound")}
              </p>
            </div>
          ) : (
            <>
              {/* Search Bar */}
              <div className="relative mb-4">
                <Search
                  className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${
                    isRTL ? "right-3" : "left-3"
                  }`}
                />
                <Input
                  type="text"
                  placeholder={t("whitelistedAccounts.searchAccounts")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`h-10 text-sm text-left placeholder:text-left ${
                    isRTL ? "pr-10 pl-3" : "pl-10 pr-3"
                  }`}
                />
              </div>

              {/* Mobile Version */}
              <div className="md:hidden">
                <WhitelistedAccountsMobile
                  accounts={paginatedAccounts}
                  accountViolations={accountViolations}
                  loadingViolations={loadingViolations}
                  isSuperAdmin={isSuperAdmin}
                  onViewViolations={handleViewViolations}
                  onEdit={openEditDialog}
                  onDelete={openDeleteDialog}
                  getAccountNameForPlatform={getAccountNameForPlatform}
                  platformOperations={platformOperations}
                />
                {/* Mobile Pagination */}
                {filteredAccounts.length > 0 && totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent
                        className={`flex-wrap justify-center gap-1 ${
                          isRTL ? "flex-row-reverse" : ""
                        }`}>
                        {isRTL ? (
                          <>
                            <PaginationItem>
                              <Button
                                variant="ghost"
                                size="default"
                                onClick={() => {
                                  if (currentPage < totalPages) {
                                    setCurrentPage(currentPage + 1);
                                  }
                                }}
                                disabled={currentPage === totalPages}
                                className="gap-1 pr-2.5 h-9 text-xs">
                                <span>{t("dashboard.pagination.next")}</span>
                                <ChevronRight className="h-4 w-4 scale-x-[-1]" />
                              </Button>
                            </PaginationItem>
                            {displayPages.map((item, index) => {
                              if (item === "...") {
                                return (
                                  <PaginationItem key={`ellipsis-${index}`}>
                                    <span className="px-2 text-muted-foreground">
                                      ...
                                    </span>
                                  </PaginationItem>
                                );
                              }
                              const page = item as number;
                              return (
                                <PaginationItem key={page}>
                                  <PaginationLink
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setCurrentPage(page);
                                    }}
                                    isActive={currentPage === page}
                                    className="cursor-pointer min-w-[32px] h-8 text-xs">
                                    {page}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            })}
                            <PaginationItem>
                              <Button
                                variant="ghost"
                                size="default"
                                onClick={() => {
                                  if (currentPage > 1) {
                                    setCurrentPage(currentPage - 1);
                                  }
                                }}
                                disabled={currentPage === 1}
                                className="gap-1 pl-2.5 h-9 text-xs">
                                <ChevronLeft className="h-4 w-4 scale-x-[-1]" />
                                <span>
                                  {t("dashboard.pagination.previous")}
                                </span>
                              </Button>
                            </PaginationItem>
                          </>
                        ) : (
                          <>
                            <PaginationItem>
                              <Button
                                variant="ghost"
                                size="default"
                                onClick={() => {
                                  if (currentPage > 1) {
                                    setCurrentPage(currentPage - 1);
                                  }
                                }}
                                disabled={currentPage === 1}
                                className="gap-1 pl-2.5 h-9 text-xs">
                                <ChevronLeft className="h-4 w-4" />
                                <span>
                                  {t("dashboard.pagination.previous")}
                                </span>
                              </Button>
                            </PaginationItem>
                            {displayPages.map((item, index) => {
                              if (item === "...") {
                                return (
                                  <PaginationItem key={`ellipsis-${index}`}>
                                    <span className="px-2 text-muted-foreground">
                                      ...
                                    </span>
                                  </PaginationItem>
                                );
                              }
                              const page = item as number;
                              return (
                                <PaginationItem key={page}>
                                  <PaginationLink
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setCurrentPage(page);
                                    }}
                                    isActive={currentPage === page}
                                    className="cursor-pointer min-w-[32px] h-8 text-xs">
                                    {page}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            })}
                            <PaginationItem>
                              <Button
                                variant="ghost"
                                size="default"
                                onClick={() => {
                                  if (currentPage < totalPages) {
                                    setCurrentPage(currentPage + 1);
                                  }
                                }}
                                disabled={currentPage === totalPages}
                                className="gap-1 pr-2.5 h-9 text-xs">
                                <span>{t("dashboard.pagination.next")}</span>
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </PaginationItem>
                          </>
                        )}
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>

              {/* Desktop Version */}
              <div className="hidden md:block rounded-md border overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t("whitelistedAccounts.accountChannel")}
                      </TableHead>
                      <TableHead>
                        {t("whitelistedAccounts.platforms")}
                      </TableHead>
                      <TableHead>
                        {t("whitelistedAccounts.violations")}
                      </TableHead>
                      <TableHead>{t("whitelistedAccounts.notes")}</TableHead>
                      <TableHead>{t("whitelistedAccounts.created")}</TableHead>
                      <TableHead className="text-right">
                        {t("whitelistedAccounts.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAccounts.map((account) => {
                      const violations = accountViolations[account._id] || [];
                      const bulks = accountBulkViolations[account._id] || [];
                      const isLoading = loadingViolations[account._id] || false;
                      const individualCount = violations.length;
                      const bulkCount = bulks.reduce(
                        (sum, bulk) => sum + bulk.totalCount,
                        0,
                      );
                      const violationCount = individualCount + bulkCount;

                      return (
                        <TableRow key={account._id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              {account.accountChannel}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              {account.platforms.map((platformId) => {
                                const platform = platformOperations.find(
                                  (p) => p.id === platformId,
                                );
                                const PlatformIcon = platform?.icon;
                                const accountNameForPlatform =
                                  getAccountNameForPlatform(
                                    account,
                                    platformId,
                                  );
                                const hasCustomName =
                                  account.platformNames &&
                                  account.platformNames[platformId];
                                return (
                                  <Badge
                                    key={platformId}
                                    variant="secondary"
                                    className="flex items-center gap-1"
                                    title={
                                      hasCustomName
                                        ? `${t(
                                            "whitelistedAccounts.accountName",
                                          )} ${accountNameForPlatform}`
                                        : undefined
                                    }>
                                    {getPlatformIcon(platformId, "h-3 w-3")}
                                    <span>{getPlatformName(platformId)}</span>
                                    {hasCustomName && (
                                      <span className="text-xs opacity-70 ml-1">
                                        ({accountNameForPlatform})
                                      </span>
                                    )}
                                  </Badge>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {isLoading ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">
                                    {t("whitelistedAccounts.loading")}
                                  </span>
                                </>
                              ) : violationCount > 0 ? (
                                <>
                                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleViewViolations(account)
                                    }
                                    className="h-auto p-0 text-sm font-normal text-amber-600 hover:text-amber-700">
                                    {violationCount}{" "}
                                    {violationCount !== 1
                                      ? t("whitelistedAccounts.violations")
                                      : t("whitelistedAccounts.violation")}
                                  </Button>
                                </>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  {t("whitelistedAccounts.noViolations")}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              {account.notes ? (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {account.notes}
                                </p>
                              ) : (
                                <span className="text-sm text-muted-foreground italic">
                                  {t("whitelistedAccounts.noNotes")}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {account.createdAt
                              ? new Date(account.createdAt).toLocaleDateString()
                              : t("whitelistedAccounts.nA")}
                          </TableCell>
                          <TableCell className="text-right">
                            {isSuperAdmin && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(account)}
                                  className="h-8 w-8">
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openDeleteDialog(account)}
                                  className="h-8 w-8 text-destructive hover:text-destructive dark:text-red-400 dark:hover:text-red-300">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            {!isSuperAdmin && (
                              <span className="text-sm text-muted-foreground">
                                {t("whitelistedAccounts.viewOnly")}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {/* Desktop Pagination */}
              {filteredAccounts.length > 0 && totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent
                      className={`flex-wrap justify-center gap-1 ${
                        isRTL ? "flex-row-reverse" : ""
                      }`}>
                      {isRTL ? (
                        <>
                          <PaginationItem>
                            <Button
                              variant="ghost"
                              size="default"
                              onClick={() => {
                                if (currentPage < totalPages) {
                                  setCurrentPage(currentPage + 1);
                                }
                              }}
                              disabled={currentPage === totalPages}
                              className="gap-1 pr-2.5 h-9 text-xs">
                              <span>{t("dashboard.pagination.next")}</span>
                              <ChevronRight className="h-4 w-4 scale-x-[-1]" />
                            </Button>
                          </PaginationItem>
                          {displayPages.map((item, index) => {
                            if (item === "...") {
                              return (
                                <PaginationItem key={`ellipsis-${index}`}>
                                  <span className="px-2 text-muted-foreground">
                                    ...
                                  </span>
                                </PaginationItem>
                              );
                            }
                            const page = item as number;
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setCurrentPage(page);
                                  }}
                                  isActive={currentPage === page}
                                  className="cursor-pointer min-w-[32px] h-8 text-xs">
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}
                          <PaginationItem>
                            <Button
                              variant="ghost"
                              size="default"
                              onClick={() => {
                                if (currentPage > 1) {
                                  setCurrentPage(currentPage - 1);
                                }
                              }}
                              disabled={currentPage === 1}
                              className="gap-1 pl-2.5 h-9 text-xs">
                              <ChevronLeft className="h-4 w-4 scale-x-[-1]" />
                              <span>{t("dashboard.pagination.previous")}</span>
                            </Button>
                          </PaginationItem>
                        </>
                      ) : (
                        <>
                          <PaginationItem>
                            <Button
                              variant="ghost"
                              size="default"
                              onClick={() => {
                                if (currentPage > 1) {
                                  setCurrentPage(currentPage - 1);
                                }
                              }}
                              disabled={currentPage === 1}
                              className="gap-1 pl-2.5 h-9 text-xs">
                              <ChevronLeft className="h-4 w-4" />
                              <span>{t("dashboard.pagination.previous")}</span>
                            </Button>
                          </PaginationItem>
                          {displayPages.map((item, index) => {
                            if (item === "...") {
                              return (
                                <PaginationItem key={`ellipsis-${index}`}>
                                  <span className="px-2 text-muted-foreground">
                                    ...
                                  </span>
                                </PaginationItem>
                              );
                            }
                            const page = item as number;
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setCurrentPage(page);
                                  }}
                                  isActive={currentPage === page}
                                  className="cursor-pointer min-w-[32px] h-8 text-xs">
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}
                          <PaginationItem>
                            <Button
                              variant="ghost"
                              size="default"
                              onClick={() => {
                                if (currentPage < totalPages) {
                                  setCurrentPage(currentPage + 1);
                                }
                              }}
                              disabled={currentPage === totalPages}
                              className="gap-1 pr-2.5 h-9 text-xs">
                              <span>{t("dashboard.pagination.next")}</span>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </PaginationItem>
                        </>
                      )}
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Violations Dialog */}
      <Dialog
        open={isViolationsDialogOpen}
        onOpenChange={setIsViolationsDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {(() => {
                if (!violationsAccount) return 0;
                const individualCount =
                  accountViolations[violationsAccount._id]?.length || 0;
                const bulkTotalCount = (
                  accountBulkViolations[violationsAccount._id] || []
                ).reduce((sum, bulk) => sum + bulk.totalCount, 0);
                const totalCount = individualCount + bulkTotalCount;
                return t("whitelistedAccounts.associatedViolations", {
                  count: totalCount,
                });
              })()}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {violationsAccount?.accountChannel}
              {(() => {
                if (!violationsAccount) return null;
                const individualCount =
                  accountViolations[violationsAccount._id]?.length || 0;
                const bulkTotalCount = (
                  accountBulkViolations[violationsAccount._id] || []
                ).reduce((sum, bulk) => sum + bulk.totalCount, 0);
                if (individualCount > 0 || bulkTotalCount > 0) {
                  return (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {individualCount > 0 && (
                        <span>{individualCount} individual</span>
                      )}
                      {individualCount > 0 && bulkTotalCount > 0 && (
                        <span> + </span>
                      )}
                      {bulkTotalCount > 0 && (
                        <span>{bulkTotalCount} from bulk</span>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* View Type Filter and Search */}
            <div className="space-y-3 pb-4 border-b">
              <div className="flex gap-1 flex-wrap">
                <Badge
                  variant={
                    dialogViewMetaFilter === "all" ? "secondary" : "outline"
                  }
                  className="cursor-pointer text-[10px]"
                  onClick={() => {
                    setDialogViewMetaFilter("all");
                    setDialogCurrentPage(1);
                  }}>
                  {isRTL ? "الكل" : "All Items"}
                </Badge>
                <Badge
                  variant={
                    dialogViewMetaFilter === "bulk" ? "secondary" : "outline"
                  }
                  className="cursor-pointer text-[10px]"
                  onClick={() => {
                    setDialogViewMetaFilter("bulk");
                    setDialogCurrentPage(1);
                  }}>
                  {isRTL ? "مجمعة فقط" : "Bulks Only"}
                </Badge>
                <Badge
                  variant={
                    dialogViewMetaFilter === "individual"
                      ? "secondary"
                      : "outline"
                  }
                  className="cursor-pointer text-[10px]"
                  onClick={() => {
                    setDialogViewMetaFilter("individual");
                    setDialogCurrentPage(1);
                  }}>
                  {isRTL ? "فردية فقط" : "Singles Only"}
                </Badge>
              </div>

              <div className="relative">
                <Search
                  className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${
                    isRTL ? "right-3" : "left-3"
                  }`}
                />
                <Input
                  type="text"
                  placeholder={t("whitelistedAccounts.searchViolations")}
                  value={dialogSearchQuery}
                  onChange={(e) => {
                    setDialogSearchQuery(e.target.value);
                    setDialogCurrentPage(1);
                  }}
                  className={`h-9 text-xs sm:text-sm text-left placeholder:text-left ${
                    isRTL ? "pr-9 pl-3" : "pl-9 pr-3"
                  }`}
                />
              </div>
            </div>

            {/* Combined Violations Section */}
            {(() => {
              if (!violationsAccount) return null;

              const violations = accountViolations[violationsAccount._id] || [];
              const bulks = accountBulkViolations[violationsAccount._id] || [];

              // Build combined display items
              const allDisplayItems: Array<{
                type: "bulk" | "individual";
                bulkViolation?: BulkViolation;
                violation?: Violation;
              }> = [];

              // Add individual violations (if not filtered out)
              violations.forEach((violation) => {
                if (dialogViewMetaFilter === "bulk") return;
                allDisplayItems.push({
                  type: "individual",
                  violation: violation,
                });
              });

              // Add bulk violations (if not filtered out)
              bulks.forEach((bulk) => {
                if (dialogViewMetaFilter === "individual") return;
                allDisplayItems.push({
                  type: "bulk",
                  bulkViolation: bulk,
                });
              });

              // Apply search filter
              const filteredItems = allDisplayItems.filter((item) => {
                if (!dialogSearchQuery.trim()) return true;
                const query = dialogSearchQuery.toLowerCase();

                if (item.type === "bulk" && item.bulkViolation) {
                  return item.bulkViolation.matchId
                    .toLowerCase()
                    .includes(query);
                } else if (item.type === "individual" && item.violation) {
                  const matchName = (
                    item.violation.matchName || ""
                  ).toLowerCase();
                  const creator =
                    item.violation.auditLog
                      ?.find((log) => log.action === "created")
                      ?.userName?.toLowerCase() || "";
                  return matchName.includes(query) || creator.includes(query);
                }
                return true;
              });

              // Sort by time (most recent first)
              filteredItems.sort((a, b) => {
                const timeA =
                  a.type === "bulk"
                    ? new Date(a.bulkViolation?.timeAdded || 0).getTime()
                    : new Date(a.violation?.timeAdded || 0).getTime();
                const timeB =
                  b.type === "bulk"
                    ? new Date(b.bulkViolation?.timeAdded || 0).getTime()
                    : new Date(b.violation?.timeAdded || 0).getTime();
                return timeB - timeA;
              });

              // Paginate
              const totalPages = Math.ceil(
                filteredItems.length / dialogItemsPerPage,
              );
              const startIndex = (dialogCurrentPage - 1) * dialogItemsPerPage;
              const endIndex = startIndex + dialogItemsPerPage;
              const paginatedItems = filteredItems.slice(startIndex, endIndex);

              // Create pagination pages
              const pages: (number | string)[] = [];
              if (totalPages > 1) {
                for (let i = 1; i <= totalPages; i++) {
                  if (
                    i === 1 ||
                    i === totalPages ||
                    (i >= dialogCurrentPage - 1 && i <= dialogCurrentPage + 1)
                  ) {
                    pages.push(i);
                  } else if (
                    i === dialogCurrentPage - 2 ||
                    i === dialogCurrentPage + 2
                  ) {
                    pages.push("...");
                  }
                }
              }
              const displayPages = isRTL ? [...pages].reverse() : pages;

              if (filteredItems.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-xs sm:text-sm">
                      {t("whitelistedAccounts.noViolations")}
                    </p>
                  </div>
                );
              }

              return (
                <div className="flex flex-col gap-4">
                  <div className="space-y-2 flex-1"></div>

                  <div className="space-y-2">
                    {paginatedItems.map((item) => {
                      if (item.type === "bulk" && item.bulkViolation) {
                        const bulk = item.bulkViolation;
                        return (
                          <div
                            key={bulk.bulkId}
                            className={cn(
                              "p-3 border rounded-lg bg-background/50 cursor-pointer transition-colors hover:bg-accent/50 hover:border-primary/50",
                            )}
                            onClick={() => {
                              navigate(`/match/${bulk.matchId}`);
                              setIsViolationsDialogOpen(false);
                            }}
                            title={t("whitelistedAccounts.clickToViewMatch")}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs font-medium">
                                    {t("whitelistedAccounts.bulkViolations")}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {bulk.totalCount} total
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                  <div className="p-2 bg-muted rounded text-center">
                                    <p className="text-muted-foreground text-[10px]">
                                      Active
                                    </p>
                                    <p className="font-semibold text-destructive">
                                      {bulk.activeCount}
                                    </p>
                                  </div>
                                  <div className="p-2 bg-muted rounded text-center">
                                    <p className="text-muted-foreground text-[10px]">
                                      Blocked
                                    </p>
                                    <p className="font-semibold text-success">
                                      {bulk.blockedCount}
                                    </p>
                                  </div>
                                  <div className="p-2 bg-muted rounded text-center">
                                    <p className="text-muted-foreground text-[10px]">
                                      Removed
                                    </p>
                                    <p className="font-semibold text-cyan-500">
                                      {bulk.removedCount}
                                    </p>
                                  </div>
                                  <div className="p-2 bg-muted rounded text-center">
                                    <p className="text-muted-foreground text-[10px]">
                                      Review
                                    </p>
                                    <p className="font-semibold text-yellow-600 dark:text-yellow-400">
                                      {bulk.underReviewCount}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    {bulk.totalViews.toLocaleString()}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {new Date(
                                      bulk.timeAdded,
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      } else if (item.type === "individual" && item.violation) {
                        const violation = item.violation;
                        const matchId =
                          (typeof violation.matchId === "object" &&
                            violation.matchId?.externalMatchId) ||
                          violation.externalMatchId ||
                          (typeof violation.matchId === "string"
                            ? violation.matchId
                            : null);

                        const violationIdStr = String(violation._id || "");

                        const creator = violation.auditLog?.find(
                          (log) => log.action === "created",
                        )?.userName;

                        return (
                          <div
                            key={violation._id}
                            className={cn(
                              "flex items-start justify-between p-3 border rounded-lg bg-background cursor-pointer transition-colors",
                              "hover:bg-accent/50 hover:border-primary/50",
                            )}
                            onClick={() => {
                              if (matchId && violationIdStr) {
                                navigate(
                                  `/match/${matchId}#violation-${violationIdStr}`,
                                );
                                setIsViolationsDialogOpen(false);
                              } else if (matchId) {
                                navigate(`/match/${matchId}`);
                                setIsViolationsDialogOpen(false);
                              } else {
                                window.open(violation.violationUrl, "_blank");
                              }
                            }}
                            title={t("whitelistedAccounts.clickToViewMatch")}>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className="text-xs flex items-center gap-1">
                                  {getPlatformIcon(violation.platformId) && (
                                    <span>
                                      {getPlatformIcon(violation.platformId)}
                                    </span>
                                  )}
                                  {violation.platformName}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs",
                                    (getStatusBadgeKey(violation.status) ===
                                      "Active" ||
                                      getStatusBadgeKey(violation.status) ===
                                        "Reported") &&
                                      "bg-red-100 text-red-700 hover:bg-red-200 border-red-300 dark:bg-red-900/30 dark:text-red-400",
                                    getStatusBadgeKey(violation.status) ===
                                      "Blocked" &&
                                      "bg-green-100 text-green-700 hover:bg-green-200 border-green-300 dark:bg-green-900/30 dark:text-green-400",
                                    getStatusBadgeKey(violation.status) ===
                                      "Removed" &&
                                      "bg-cyan-100 text-cyan-700 hover:bg-cyan-200 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-400",
                                    (getStatusBadgeKey(violation.status) ===
                                      "Review" ||
                                      getStatusBadgeKey(violation.status) ===
                                        "Under Review") &&
                                      "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400",
                                  )}>
                                  {getStatusBadge(violation.status)}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {getContentTypeBadge(violation.contentType)}
                                </Badge>
                                {creator && (
                                  <div
                                    className={cn(
                                      "flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/40 border border-border/50",
                                      isRTL ? "text-left" : "",
                                    )}>
                                    <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground font-medium">
                                      {creator}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {violation.matchName && (
                                <p className="text-sm text-muted-foreground">
                                  {violation.matchName}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {t("whitelistedAccounts.added")}{" "}
                                {new Date(violation.timeAdded).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>

                  {/* Combined Pagination */}
                  {totalPages > 1 && (
                    <div className="pt-4 mt-4 border-t">
                      <Pagination>
                        <PaginationContent
                          className={`flex-wrap justify-center gap-1 ${
                            isRTL ? "flex-row-reverse" : ""
                          }`}>
                          {isRTL ? (
                            <>
                              <PaginationItem>
                                <Button
                                  variant="ghost"
                                  size="default"
                                  onClick={() => {
                                    if (dialogCurrentPage < totalPages) {
                                      setDialogCurrentPage(
                                        dialogCurrentPage + 1,
                                      );
                                    }
                                  }}
                                  disabled={dialogCurrentPage === totalPages}
                                  className="gap-1 pr-2.5 h-9 text-xs">
                                  <span>{t("dashboard.pagination.next")}</span>
                                  <ChevronRight className="h-4 w-4 scale-x-[-1]" />
                                </Button>
                              </PaginationItem>

                              {displayPages.map((item, index) => {
                                if (item === "...") {
                                  return (
                                    <PaginationItem key={`ellipsis-${index}`}>
                                      <span className="px-2 text-muted-foreground">
                                        ...
                                      </span>
                                    </PaginationItem>
                                  );
                                }
                                const page = item as number;
                                return (
                                  <PaginationItem key={page}>
                                    <PaginationLink
                                      href="#"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setDialogCurrentPage(page);
                                      }}
                                      isActive={dialogCurrentPage === page}
                                      className="cursor-pointer min-w-[32px] h-8 text-xs">
                                      {page}
                                    </PaginationLink>
                                  </PaginationItem>
                                );
                              })}

                              <PaginationItem>
                                <Button
                                  variant="ghost"
                                  size="default"
                                  onClick={() => {
                                    if (dialogCurrentPage > 1) {
                                      setDialogCurrentPage(
                                        dialogCurrentPage - 1,
                                      );
                                    }
                                  }}
                                  disabled={dialogCurrentPage === 1}
                                  className="gap-1 pl-2.5 h-9 text-xs">
                                  <ChevronLeft className="h-4 w-4 scale-x-[-1]" />
                                  <span>
                                    {t("dashboard.pagination.previous")}
                                  </span>
                                </Button>
                              </PaginationItem>
                            </>
                          ) : (
                            <>
                              <PaginationItem>
                                <Button
                                  variant="ghost"
                                  size="default"
                                  onClick={() => {
                                    if (dialogCurrentPage > 1) {
                                      setDialogCurrentPage(
                                        dialogCurrentPage - 1,
                                      );
                                    }
                                  }}
                                  disabled={dialogCurrentPage === 1}
                                  className="gap-1 pl-2.5 h-9 text-xs">
                                  <ChevronLeft className="h-4 w-4" />
                                  <span>
                                    {t("dashboard.pagination.previous")}
                                  </span>
                                </Button>
                              </PaginationItem>

                              {displayPages.map((item, index) => {
                                if (item === "...") {
                                  return (
                                    <PaginationItem key={`ellipsis-${index}`}>
                                      <span className="px-2 text-muted-foreground">
                                        ...
                                      </span>
                                    </PaginationItem>
                                  );
                                }
                                const page = item as number;
                                return (
                                  <PaginationItem key={page}>
                                    <PaginationLink
                                      href="#"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setDialogCurrentPage(page);
                                      }}
                                      isActive={dialogCurrentPage === page}
                                      className="cursor-pointer min-w-[32px] h-8 text-xs">
                                      {page}
                                    </PaginationLink>
                                  </PaginationItem>
                                );
                              })}

                              <PaginationItem>
                                <Button
                                  variant="ghost"
                                  size="default"
                                  onClick={() => {
                                    if (dialogCurrentPage < totalPages) {
                                      setDialogCurrentPage(
                                        dialogCurrentPage + 1,
                                      );
                                    }
                                  }}
                                  disabled={dialogCurrentPage === totalPages}
                                  className="gap-1 pr-2.5 h-9 text-xs">
                                  <span>{t("dashboard.pagination.next")}</span>
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </PaginationItem>
                            </>
                          )}
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsViolationsDialogOpen(false)}>
              {t("whitelistedAccounts.closed")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {t("whitelistedAccounts.editWhitelistedAccount")}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t("whitelistedAccounts.editDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label
                htmlFor="edit-account-channel"
                className="text-xs sm:text-sm">
                {t("whitelistedAccounts.accountChannel")}
              </Label>
              <Input
                id="edit-account-channel"
                value={accountChannel}
                onChange={(e) => setAccountChannel(e.target.value)}
                placeholder={t(
                  "whitelistedAccounts.accountChannelPlaceholderEdit",
                )}
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-xs sm:text-sm">
                {t("whitelistedAccounts.selectPlatforms")}
              </Label>
              <div className="space-y-2 sm:space-y-3 p-3 sm:p-4 border rounded-lg">
                {platformOperations.map((platform) => {
                  const PlatformIcon = platform.icon;
                  const isSelected = selectedPlatforms.includes(platform.id);
                  const platformName = platformNames[platform.id] || "";
                  return (
                    <div key={platform.id} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-platform-${platform.id}`}
                          checked={isSelected}
                          onCheckedChange={() =>
                            handlePlatformToggle(platform.id)
                          }
                        />
                        <Label
                          htmlFor={`edit-platform-${platform.id}`}
                          className="flex items-center gap-2 cursor-pointer flex-1 text-xs sm:text-sm">
                          {getPlatformIcon(
                            platform.id,
                            "h-3.5 w-3.5 sm:h-4 sm:w-4",
                          )}
                          <span>{platform.name}</span>
                        </Label>
                      </div>
                      {isSelected && (
                        <div className="ml-5 sm:ml-6 space-y-1">
                          <Label
                            htmlFor={`edit-platform-name-${platform.id}`}
                            className="text-[10px] sm:text-xs text-muted-foreground">
                            {t("whitelistedAccounts.accountNameForPlatform", {
                              platform: platform.name,
                            })}
                          </Label>
                          <Input
                            id={`edit-platform-name-${platform.id}`}
                            value={platformName}
                            onChange={(e) =>
                              handlePlatformNameChange(
                                platform.id,
                                e.target.value,
                              )
                            }
                            placeholder={
                              accountChannel ||
                              t("whitelistedAccounts.sameAsMainName")
                            }
                            className="h-8 sm:h-9 text-xs sm:text-sm"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {selectedPlatforms.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("whitelistedAccounts.atLeastOnePlatform")}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes" className="text-xs sm:text-sm">
                {t("whitelistedAccounts.notesOptional")}
              </Label>
              <Textarea
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("whitelistedAccounts.notesPlaceholder")}
                rows={3}
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
                setEditingAccount(null);
              }}
              className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
              {t("whitelistedAccounts.cancel")}
            </Button>
            <Button
              onClick={handleEditAccount}
              disabled={saving}
              className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                  {t("whitelistedAccounts.saving")}
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  {t("whitelistedAccounts.saveChanges")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {t("whitelistedAccounts.removeFromWhitelist")}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t("whitelistedAccounts.removeConfirm")}
            </DialogDescription>
          </DialogHeader>
          {deletingAccount && (
            <div className="py-3 sm:py-4">
              <Alert variant="destructive">
                <AlertDescription className="text-xs sm:text-sm">
                  {t("whitelistedAccounts.willBeRemoved", {
                    account: deletingAccount.accountChannel,
                  })}
                </AlertDescription>
              </Alert>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingAccount(null);
              }}
              className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
              {t("whitelistedAccounts.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={saving}
              className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                  {t("whitelistedAccounts.deleting")}
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  {t("whitelistedAccounts.removeFromWhitelist")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
