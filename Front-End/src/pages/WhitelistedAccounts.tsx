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
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitialPlatformOperations } from "@/components/MatchDashboard/constants";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { WhitelistedAccountsMobile } from "./WhitelistedAccountsMobile";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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
}

export default function WhitelistedAccounts() {
  const navigate = useNavigate();
  const { user, leagues } = useAuth();
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
  const [accounts, setAccounts] = useState<WhitelistedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Violations state - map of accountChannel to violations
  const [accountViolations, setAccountViolations] = useState<{
    [key: string]: Violation[];
  }>({});
  const [loadingViolations, setLoadingViolations] = useState<{
    [key: string]: boolean;
  }>({});
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(
    new Set()
  );

  // Form states
  const [accountChannel, setAccountChannel] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [platformNames, setPlatformNames] = useState<{ [key: string]: string }>(
    {}
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

  // Get platform operations for checkboxes
  const platformOperations = getInitialPlatformOperations();

  // Fetch whitelisted accounts
  useEffect(() => {
    fetchAccounts();
  }, []);

  // Fetch violations for accounts when they change or user/leagues change
  useEffect(() => {
    if (accounts.length > 0 && user) {
      accounts.forEach((account) => {
        fetchViolationsForAccount(account);
      });
    }
  }, [accounts, user, leagues]);

  // Get account name for a platform (main name or platform-specific)
  const getAccountNameForPlatform = (
    account: WhitelistedAccount,
    platformId: string
  ): string => {
    if (account.platformNames && account.platformNames[platformId]) {
      return account.platformNames[platformId];
    }
    return account.accountChannel;
  };

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
        title: "Error",
        description: "Failed to load whitelisted accounts.",
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
        return;
      }

      // Fetch violations for each platform that this account is whitelisted on
      const violationPromises = account.platforms.map(async (platformId) => {
        // Get the account name for this platform (main name or platform-specific)
        const accountNameForPlatform = getAccountNameForPlatform(
          account,
          platformId
        );

        // Fetch violations for each allowed league and combine
        const leagueViolationPromises = availableLeagues.map(async (league) => {
          // Fetch violations for this platform and league
          const response = await fetch(
            `${API_URL}/violations?platformId=${platformId}&league=${league}&limit=1000`,
            {
              credentials: "include",
            }
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

        const leagueViolationsArrays = await Promise.all(leagueViolationPromises);
        return leagueViolationsArrays.flat();
      });

      const violationsArrays = await Promise.all(violationPromises);
      const allViolations = violationsArrays.flat();

      // Deduplicate violations by _id to prevent duplicates from manual leagues or overlapping queries
      const uniqueViolations = Array.from(
        new Map(allViolations.map((v: Violation) => [v._id, v])).values()
      );

      setAccountViolations((prev) => ({
        ...prev,
        [key]: uniqueViolations,
      }));
    } catch (error) {
      console.error(
        `Error fetching violations for account ${account.accountChannel}:`,
        error
      );
      setAccountViolations((prev) => ({
        ...prev,
        [key]: [],
      }));
    } finally {
      setLoadingViolations((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Toggle expanded state for an account
  const toggleAccountExpanded = (accountId: string) => {
    setExpandedAccounts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
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
      setFormError("Account channel is required.");
      return;
    }

    if (selectedPlatforms.length === 0) {
      setFormError("At least one platform must be selected.");
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
        title: "Success",
        description: `Account "${accountChannel.trim()}" has been whitelisted.`,
      });
      // Violations will be fetched automatically via useEffect
    } catch (error) {
      console.error("Error adding whitelisted account:", error);
      setFormError(
        error instanceof Error ? error.message : "Failed to add account"
      );
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to add whitelisted account",
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
      setFormError("Account channel is required.");
      return;
    }

    if (selectedPlatforms.length === 0) {
      setFormError("At least one platform must be selected.");
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
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Failed to update whitelisted account"
        );
      }

      await fetchAccounts();
      resetForm();
      setIsEditDialogOpen(false);
      setEditingAccount(null);
      toast({
        title: "Success",
        description: `Account "${accountChannel.trim()}" has been updated.`,
      });
      // Violations will be fetched automatically via useEffect
    } catch (error) {
      console.error("Error updating whitelisted account:", error);
      setFormError(
        error instanceof Error ? error.message : "Failed to update account"
      );
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update whitelisted account",
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
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Failed to delete whitelisted account"
        );
      }

      await fetchAccounts();
      setIsDeleteDialogOpen(false);
      setDeletingAccount(null);
      toast({
        title: "Success",
        description: `Account "${deletingAccount.accountChannel}" has been removed from whitelist.`,
      });
    } catch (error) {
      console.error("Error deleting whitelisted account:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete whitelisted account",
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

  // Get platform name by ID
  const getPlatformName = (platformId: string): string => {
    const platform = platformOperations.find((p) => p.id === platformId);
    return platform ? platform.name : platformId;
  };

  // Get platform icon by ID
  const getPlatformIcon = (platformId: string) => {
    const platform = platformOperations.find((p) => p.id === platformId);
    if (!platform) return null;
    const IconComponent = platform.icon;
    return (
      <IconComponent className="h-3 w-3" style={{ color: platform.color }} />
    );
  };

  // Convert backend status to statusBadge format
  const getStatusBadge = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (statusLower === "removed") return "Removed";
    if (statusLower === "under review") return "Review";
    if (statusLower === "active") return "Active";
    if (statusLower === "blocked") return "Blocked";
    return status;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
          Whitelisted Accounts
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
          Manage accounts that are whitelisted across platforms
        </p>
      </div>

      {/* Add Account Card */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-lg sm:text-xl">Whitelisted Accounts</CardTitle>
            </div>
            {isSuperAdmin && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetForm()} className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    <span className="hidden xs:inline">Add Account</span>
                    <span className="xs:hidden">Add</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl">Add Whitelisted Account</DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">
                      Add an account to the whitelist. Select the platforms
                      where this account should be whitelisted.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
                    {formError && (
                      <Alert variant="destructive">
                        <AlertDescription>{formError}</AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="account-channel" className="text-xs sm:text-sm">Account Channel</Label>
                      <Input
                        id="account-channel"
                        value={accountChannel}
                        onChange={(e) => setAccountChannel(e.target.value)}
                        placeholder="Enter account channel name (e.g., @username)"
                        className="h-9 sm:h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      <Label className="text-xs sm:text-sm">Select Platforms</Label>
                      <div className="space-y-2 sm:space-y-3 p-3 sm:p-4 border rounded-lg">
                        {platformOperations.map((platform) => {
                          const PlatformIcon = platform.icon;
                          const isSelected = selectedPlatforms.includes(
                            platform.id
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
                                  <PlatformIcon
                                    className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                                    style={{ color: platform.color }}
                                  />
                                  <span>{platform.name}</span>
                                </Label>
                              </div>
                              {isSelected && (
                                <div className="ml-5 sm:ml-6 space-y-1">
                                  <Label
                                    htmlFor={`platform-name-${platform.id}`}
                                    className="text-[10px] sm:text-xs text-muted-foreground">
                                    Account name for {platform.name} (leave
                                    empty to use main name)
                                  </Label>
                                  <Input
                                    id={`platform-name-${platform.id}`}
                                    value={platformName}
                                    onChange={(e) =>
                                      handlePlatformNameChange(
                                        platform.id,
                                        e.target.value
                                      )
                                    }
                                    placeholder={
                                      accountChannel || "Same as main name"
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
                          At least one platform must be selected
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-xs sm:text-sm">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any notes about this account..."
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
                      Cancel
                    </Button>
                    <Button onClick={handleAddAccount} disabled={saving} className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                      {saving ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                          Add Account
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <CardDescription className="text-xs sm:text-sm">
            Accounts in the whitelist are exempt from violation tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-muted-foreground mr-2" />
              <span className="text-xs sm:text-sm text-muted-foreground">
                Loading whitelisted accounts...
              </span>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-muted-foreground">
              <Shield className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-xs sm:text-sm">
                No whitelisted accounts found. Add your first account to get
                started.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Version */}
              <div className="md:hidden">
                <WhitelistedAccountsMobile
                  accounts={accounts}
                  accountViolations={accountViolations}
                  loadingViolations={loadingViolations}
                  expandedAccounts={expandedAccounts}
                  isSuperAdmin={isSuperAdmin}
                  onToggleExpanded={toggleAccountExpanded}
                  onEdit={openEditDialog}
                  onDelete={openDeleteDialog}
                  getAccountNameForPlatform={getAccountNameForPlatform}
                />
              </div>

              {/* Desktop Version */}
              <div className="hidden md:block rounded-md border overflow-x-auto">
                <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Channel</TableHead>
                    <TableHead>Platforms</TableHead>
                    <TableHead>Violations</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => {
                    const violations = accountViolations[account._id] || [];
                    const isLoading = loadingViolations[account._id] || false;
                    const isExpanded = expandedAccounts.has(account._id);
                    const violationCount = violations.length;

                    return (
                      <Collapsible
                        key={account._id}
                        asChild
                        open={isExpanded}
                        onOpenChange={() => toggleAccountExpanded(account._id)}>
                        <>
                          <TableRow>
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
                                    (p) => p.id === platformId
                                  );
                                  const PlatformIcon = platform?.icon;
                                  const accountNameForPlatform =
                                    getAccountNameForPlatform(
                                      account,
                                      platformId
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
                                          ? `Account name: ${accountNameForPlatform}`
                                          : undefined
                                      }>
                                      {PlatformIcon && (
                                        <PlatformIcon
                                          className="h-3 w-3"
                                          style={{ color: platform.color }}
                                        />
                                      )}
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
                                      Loading...
                                    </span>
                                  </>
                                ) : violationCount > 0 ? (
                                  <>
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                    <CollapsibleTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-auto p-0 text-sm font-normal text-amber-600 hover:text-amber-700">
                                        {violationCount} violation
                                        {violationCount !== 1 ? "s" : ""}
                                      </Button>
                                    </CollapsibleTrigger>
                                  </>
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    No violations
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
                                    No notes
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {account.createdAt
                                ? new Date(
                                    account.createdAt
                                  ).toLocaleDateString()
                                : "N/A"}
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
                                    className="h-8 w-8 text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                              {!isSuperAdmin && (
                                <span className="text-sm text-muted-foreground">
                                  View only
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                          {violationCount > 0 && (
                            <CollapsibleContent asChild>
                              <TableRow>
                                <TableCell
                                  colSpan={6}
                                  className="bg-muted/50 p-0">
                                  <div className="p-4 space-y-2">
                                    <h4 className="text-sm font-semibold mb-3">
                                      Associated Violations ({violationCount})
                                    </h4>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                      {violations.map((violation) => {
                                        // Get match ID - matchId is populated with externalMatchId
                                        const matchId =
                                          (typeof violation.matchId ===
                                            "object" &&
                                            violation.matchId
                                              ?.externalMatchId) ||
                                          violation.externalMatchId ||
                                          (typeof violation.matchId === "string"
                                            ? violation.matchId
                                            : null);

                                        return (
                                          <div
                                            key={violation._id}
                                            className={cn(
                                              "flex items-start justify-between p-3 border rounded-lg bg-background cursor-pointer transition-colors",
                                              "hover:bg-accent/50 hover:border-primary/50"
                                            )}
                                            onClick={() => {
                                              if (matchId) {
                                                navigate(`/match/${matchId}`);
                                              } else {
                                                // Fallback to opening violation URL if match ID not available
                                                window.open(
                                                  violation.violationUrl,
                                                  "_blank"
                                                );
                                              }
                                            }}
                                            title="Click to view match dashboard">
                                            <div className="flex-1 space-y-1">
                                              <div className="flex items-center gap-2">
                                                <Badge
                                                  variant="outline"
                                                  className="text-xs flex items-center gap-1">
                                                  {getPlatformIcon(
                                                    violation.platformId
                                                  ) && (
                                                    <span>
                                                      {getPlatformIcon(
                                                        violation.platformId
                                                      )}
                                                    </span>
                                                  )}
                                                  {violation.platformName}
                                                </Badge>
                                                <Badge
                                                  variant="outline"
                                                  className={cn(
                                                    "text-xs",
                                                    (getStatusBadge(
                                                      violation.status
                                                    ) === "Active" ||
                                                      getStatusBadge(
                                                        violation.status
                                                      ) === "Reported") &&
                                                      "bg-red-100 text-red-700 hover:bg-red-200 border-red-300 dark:bg-red-900/30 dark:text-red-400",
                                                    getStatusBadge(
                                                      violation.status
                                                    ) === "Blocked" &&
                                                      "bg-green-100 text-green-700 hover:bg-green-200 border-green-300 dark:bg-green-900/30 dark:text-green-400",
                                                    getStatusBadge(
                                                      violation.status
                                                    ) === "Removed" &&
                                                      "bg-cyan-100 text-cyan-700 hover:bg-cyan-200 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-400",
                                                    (getStatusBadge(
                                                      violation.status
                                                    ) === "Review" ||
                                                      getStatusBadge(
                                                        violation.status
                                                      ) === "Under Review") &&
                                                      "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400"
                                                  )}>
                                                  {getStatusBadge(
                                                    violation.status
                                                  )}
                                                </Badge>
                                                <Badge
                                                  variant="outline"
                                                  className="text-xs">
                                                  {violation.contentType}
                                                </Badge>
                                              </div>
                                              {violation.matchName && (
                                                <p className="text-sm text-muted-foreground">
                                                  {violation.matchName}
                                                </p>
                                              )}
                                              <p className="text-xs text-muted-foreground">
                                                Added:{" "}
                                                {new Date(
                                                  violation.timeAdded
                                                ).toLocaleString()}
                                              </p>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            </CollapsibleContent>
                          )}
                        </>
                      </Collapsible>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Account Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit Whitelisted Account</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Update the account channel and platform selections.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-account-channel" className="text-xs sm:text-sm">Account Channel</Label>
              <Input
                id="edit-account-channel"
                value={accountChannel}
                onChange={(e) => setAccountChannel(e.target.value)}
                placeholder="Enter account channel name"
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-xs sm:text-sm">Select Platforms</Label>
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
                          <PlatformIcon
                            className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                            style={{ color: platform.color }}
                          />
                          <span>{platform.name}</span>
                        </Label>
                      </div>
                      {isSelected && (
                        <div className="ml-5 sm:ml-6 space-y-1">
                          <Label
                            htmlFor={`edit-platform-name-${platform.id}`}
                            className="text-[10px] sm:text-xs text-muted-foreground">
                            Account name for {platform.name} (leave empty to use
                            main name)
                          </Label>
                          <Input
                            id={`edit-platform-name-${platform.id}`}
                            value={platformName}
                            onChange={(e) =>
                              handlePlatformNameChange(
                                platform.id,
                                e.target.value
                              )
                            }
                            placeholder={accountChannel || "Same as main name"}
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
                  At least one platform must be selected
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes" className="text-xs sm:text-sm">Notes (Optional)</Label>
              <Textarea
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this account..."
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
              Cancel
            </Button>
            <Button onClick={handleEditAccount} disabled={saving} className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  Save Changes
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
            <DialogTitle className="text-lg sm:text-xl">Remove from Whitelist</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Are you sure you want to remove this account from the whitelist?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingAccount && (
            <div className="py-3 sm:py-4">
              <Alert variant="destructive">
                <AlertDescription className="text-xs sm:text-sm">
                  <strong>{deletingAccount.accountChannel}</strong> will be
                  removed from the whitelist.
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
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={saving}
              className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  Remove from Whitelist
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
