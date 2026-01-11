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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import {
  Settings as SettingsIcon,
  Clock,
  Save,
  Loader2,
  AlertTriangle,
  Globe,
  Plus,
  Eye,
  EyeOff,
  Edit,
} from "lucide-react";
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
import { API_URL } from "@/components/MatchDashboard/types";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Settings() {
  const { user: currentUser } = useAuth();
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [targetMinutes, setTargetMinutes] = useState<number>(15);
  const [targetHours, setTargetHours] = useState<number>(15 / 60);
  const [minutesInput, setMinutesInput] = useState<string>("15");
  const [hoursInput, setHoursInput] = useState<string>("0.25");
  const [focusedField, setFocusedField] = useState<"minutes" | "hours" | null>(
    null
  );

  // Threshold states
  const [viewsThreshold, setViewsThreshold] = useState<number>(1000);
  const [viewsThresholdInput, setViewsThresholdInput] =
    useState<string>("1000");
  const [violationsThreshold, setViolationsThreshold] = useState<number>(5);
  const [violationsThresholdInput, setViolationsThresholdInput] =
    useState<string>("5");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // League interface
  interface League {
    _id?: string;
    league: string;
    name: string;
    knownName?: string;
    arabicName?: string;
    isHidden: boolean;
    competitionCode?: string;
    competitionType?: "league" | "cup";
    iconUrl?: string;
    apiUrl?: string;
    referer?: string;
  }

  // Leagues management states
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [isAddLeagueOpen, setIsAddLeagueOpen] = useState(false);
  const [isEditLeagueOpen, setIsEditLeagueOpen] = useState(false);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [formSlug, setFormSlug] = useState("");
  const [formApiUrl, setFormApiUrl] = useState("");
  const [formReferer, setFormReferer] = useState("");
  const [formArabicName, setFormArabicName] = useState("");
  const [formName, setFormName] = useState("");
  const [formIsManual, setFormIsManual] = useState(false);
  const [formIsHidden, setFormIsHidden] = useState(false);
  const [formCompetitionType, setFormCompetitionType] = useState<"league" | "cup">("league");
  const [formIcon, setFormIcon] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const [addingLeague, setAddingLeague] = useState(false);
  const [updatingLeague, setUpdatingLeague] = useState(false);

  // Check if user is superAdmin
  useEffect(() => {
    if (!currentUser || currentUser.role !== "superAdmin") {
      toast({
        title: t("settings.accessDenied"),
        description: t("settings.onlySuperAdmin"),
        variant: "destructive",
      });
      navigate("/");
    }
  }, [currentUser, navigate]);

  // Load settings from backend API on mount
  useEffect(() => {
    // Only fetch settings if user is superAdmin
    if (!currentUser || currentUser.role !== "superAdmin") {
      return;
    }
    const fetchSettings = async () => {
      setLoadingSettings(true);
      try {
        const response = await fetch(`${API_URL}/settings`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch settings");
        }

        const settings = await response.json();
        const minutes = settings.targetMins || 15;
        const hours = minutes / 60;
        setTargetMinutes(minutes);
        setTargetHours(hours);
        setMinutesInput(minutes.toString());
        setHoursInput(hours.toFixed(2));

        // Load thresholds
        const viewsThresh = settings.viewsThreshold ?? 1000;
        const violationsThresh = settings.violationsThreshold ?? 5;
        setViewsThreshold(viewsThresh);
        setViewsThresholdInput(viewsThresh.toLocaleString("en-US"));
        setViolationsThreshold(violationsThresh);
        setViolationsThresholdInput(violationsThresh.toString());
      } catch (error) {
        console.error("Error loading settings:", error);
        toast({
          title: t("settings.leaguesManagement.error.failedToLoad"),
          description: t("settings.leaguesManagement.error.failedToLoad"),
          variant: "destructive",
        });
        // Use defaults if API fails
        const minutes = 15;
        const hours = minutes / 60;
        setTargetMinutes(minutes);
        setTargetHours(hours);
        setMinutesInput(minutes.toString());
        setHoursInput(hours.toFixed(2));

        // Use default thresholds
        setViewsThreshold(1000);
        setViewsThresholdInput("1000");
        setViolationsThreshold(5);
        setViolationsThresholdInput("5");
      } finally {
        setLoadingSettings(false);
      }
    };

    fetchSettings();
    fetchLeagues();
  }, [currentUser]);

  // Fetch leagues
  const fetchLeagues = async () => {
    setLoadingLeagues(true);
    try {
      const response = await fetch(`${API_URL}/leagues?includeHidden=true`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch leagues");
      }

      const data = await response.json();
      setLeagues(data || []);
    } catch (error) {
      console.error("Error fetching leagues:", error);
      toast({
        title: t("settings.leaguesManagement.error.failedToLoadLeagues"),
        description: t("settings.leaguesManagement.error.failedToLoadLeagues"),
        variant: "destructive",
      });
    } finally {
      setLoadingLeagues(false);
    }
  };

  // Reset league form
  const resetLeagueForm = () => {
    setFormSlug("");
    setFormApiUrl("");
    setFormReferer("");
    setFormArabicName("");
    setFormName("");
    setFormIsManual(false);
    setFormIsHidden(false);
    setFormCompetitionType("league");
    setFormIcon(null);
    setFormError("");
    setEditingLeague(null);
  };

  // Open edit league dialog
  const openEditLeagueDialog = (league: League) => {
    setEditingLeague(league);
    setFormSlug(league.league || "");
    setFormApiUrl(league.apiUrl || "");
    setFormReferer(league.referer || "");
    setFormArabicName(league.arabicName || "");
    setFormCompetitionType(league.competitionType || "league");
    setFormIcon(null); // Don't pre-fill icon, user needs to upload new one if they want to change
    setFormError("");
    setIsEditLeagueOpen(true);
  };

  // Add league
  const handleAddLeague = async () => {
    setFormError("");

    // Validate based on manual or regular league
    if (formIsManual) {
      // Manual league validation
      if (!formSlug.trim() || !formName.trim()) {
        setFormError(t("settings.leaguesManagement.error.slugNameRequired"));
        return;
      }
    } else {
      // Regular league validation
      if (!formSlug.trim() || !formApiUrl.trim() || !formReferer.trim()) {
        setFormError(t("settings.leaguesManagement.error.slugApiUrlRefererRequired"));
        return;
      }
      if (!formIcon) {
        setFormError(t("settings.leaguesManagement.error.iconRequired"));
        return;
      }
    }

    setAddingLeague(true);
    try {
      const formData = new FormData();
      formData.append("slug", formSlug.trim());

      if (formIsManual) {
        formData.append("isManual", "true");
        formData.append("name", formName.trim());
        formData.append("arabicName", formArabicName.trim());
        formData.append("competitionType", formCompetitionType);
        // Icon is optional for manual leagues
        if (formIcon) {
          formData.append("icon", formIcon);
        }
      } else {
        formData.append("apiUrl", formApiUrl.trim());
        formData.append("referer", formReferer.trim());
        formData.append("arabicName", formArabicName.trim());
        formData.append("competitionType", formCompetitionType);
        formData.append("icon", formIcon);
      }

      const response = await fetch(`${API_URL}/leagues`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create league");
      }

      toast({
        title: "Success",
        description: t("settings.leaguesManagement.success.leagueCreated"),
      });

      setIsAddLeagueOpen(false);
      resetLeagueForm();
      fetchLeagues();
    } catch (error) {
      console.error("Error adding league:", error);
      setFormError(
        error instanceof Error ? error.message : t("settings.leaguesManagement.error.failedToCreate")
      );
    } finally {
      setAddingLeague(false);
    }
  };

  // Update league
  const handleUpdateLeague = async () => {
    setFormError("");

    if (!formSlug.trim() || !formApiUrl.trim() || !formReferer.trim()) {
      setFormError(t("settings.leaguesManagement.error.slugApiUrlRefererRequired"));
      return;
    }

    if (!editingLeague) {
      setFormError(t("settings.leaguesManagement.error.noLeagueSelected"));
      return;
    }

    setUpdatingLeague(true);
    try {
      const formData = new FormData();
      formData.append("slug", formSlug.trim());
      formData.append("apiUrl", formApiUrl.trim());
      formData.append("referer", formReferer.trim());
      formData.append("arabicName", formArabicName.trim());
      formData.append("competitionType", formCompetitionType);
      // Only append icon if a new one was selected
      if (formIcon) {
        formData.append("icon", formIcon);
      }

      const response = await fetch(
        `${API_URL}/leagues/${editingLeague.league}`,
        {
          method: "PUT",
          credentials: "include",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update league");
      }

      toast({
        title: "Success",
        description: t("settings.leaguesManagement.success.leagueUpdated"),
      });

      setIsEditLeagueOpen(false);
      resetLeagueForm();
      fetchLeagues();
    } catch (error) {
      console.error("Error updating league:", error);
      setFormError(
        error instanceof Error ? error.message : t("settings.leaguesManagement.error.failedToUpdate")
      );
    } finally {
      setUpdatingLeague(false);
    }
  };

  // Toggle league hidden status
  const handleToggleLeague = async (league: League) => {
    try {
      const response = await fetch(
        `${API_URL}/leagues/${league.league}/toggle`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to toggle league");
      }

      toast({
        title: "Success",
        description: league.isHidden 
          ? t("settings.leaguesManagement.success.leagueShown")
          : t("settings.leaguesManagement.success.leagueHidden"),
      });

      fetchLeagues();
    } catch (error) {
      console.error("Error toggling league:", error);
      toast({
        title: t("settings.leaguesManagement.error.failedToToggle"),
        description: t("settings.leaguesManagement.error.failedToToggle"),
        variant: "destructive",
      });
    }
  };

  // Don't render if not superAdmin
  if (!currentUser || currentUser.role !== "superAdmin") {
    return null;
  }

  // Handle minutes change - auto-calculate hours (only allow numbers)
  const handleMinutesChange = (value: string) => {
    // Only allow numbers and decimal point
    const filtered = value.replace(/[^0-9.]/g, "");
    // Prevent multiple decimal points
    const parts = filtered.split(".");
    const sanitized =
      parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : filtered;

    setMinutesInput(sanitized);
    const minutes = parseFloat(sanitized);
    if (!isNaN(minutes) && minutes >= 0) {
      setTargetMinutes(minutes);
      const hours = minutes / 60;
      setTargetHours(hours);
      // Only update hours input if minutes field is focused
      if (focusedField === "minutes") {
        setHoursInput(hours.toFixed(2));
      }
    } else if (sanitized === "" || sanitized === ".") {
      // Allow empty or just decimal point while typing
      setTargetMinutes(0);
      setTargetHours(0);
      if (focusedField === "minutes") {
        setHoursInput("0");
      }
    }
  };

  // Handle hours change - auto-calculate minutes (only allow numbers)
  const handleHoursChange = (value: string) => {
    // Only allow numbers and decimal point
    const filtered = value.replace(/[^0-9.]/g, "");
    // Prevent multiple decimal points
    const parts = filtered.split(".");
    const sanitized =
      parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : filtered;

    setHoursInput(sanitized);
    const hours = parseFloat(sanitized);
    if (!isNaN(hours) && hours >= 0) {
      setTargetHours(hours);
      const minutes = hours * 60;
      setTargetMinutes(minutes);
      // Only update minutes input if hours field is focused
      if (focusedField === "hours") {
        setMinutesInput(minutes.toString());
      }
    } else if (sanitized === "" || sanitized === ".") {
      // Allow empty or just decimal point while typing
      setTargetHours(0);
      setTargetMinutes(0);
      if (focusedField === "hours") {
        setMinutesInput("0");
      }
    }
  };

  // Format hours on blur
  const handleHoursBlur = () => {
    setFocusedField(null);
    if (targetHours >= 0) {
      setHoursInput(targetHours.toFixed(2));
    }
  };

  // Format minutes on blur
  const handleMinutesBlur = () => {
    setFocusedField(null);
    if (targetMinutes >= 0) {
      setMinutesInput(targetMinutes.toString());
    }
  };

  // Handle views threshold change
  const handleViewsThresholdChange = (value: string) => {
    // Remove commas and allow only numbers
    const filtered = value.replace(/[^0-9]/g, "");
    setViewsThresholdInput(filtered);
    const num = parseInt(filtered);
    if (!isNaN(num) && num >= 0) {
      setViewsThreshold(num);
    } else if (filtered === "") {
      setViewsThreshold(0);
    }
  };

  // Handle violations threshold change
  const handleViolationsThresholdChange = (value: string) => {
    // Allow only numbers
    const filtered = value.replace(/[^0-9]/g, "");
    setViolationsThresholdInput(filtered);
    const num = parseInt(filtered);
    if (!isNaN(num) && num >= 0) {
      setViolationsThreshold(num);
    } else if (filtered === "") {
      setViolationsThreshold(0);
    }
  };

  // Format views threshold on blur
  const handleViewsThresholdBlur = () => {
    if (viewsThreshold >= 0) {
      setViewsThresholdInput(viewsThreshold.toLocaleString("en-US"));
    }
  };

  // Save target minutes to backend API
  const handleSaveTargetMinutes = async () => {
    if (targetMinutes < 1) {
      toast({
        title: t("settings.targetBlockTime.validationError"),
        description: t("settings.targetBlockTime.mustBeGreaterThanOne"),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          targetMins: targetMinutes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save settings");
      }

      const updatedSettings = await response.json();

      // Update local state with the response
      const minutes = updatedSettings.targetMins || targetMinutes;
      const hours = minutes / 60;
      setTargetMinutes(minutes);
      setTargetHours(hours);

      toast({
        title: t("settings.targetBlockTime.settingsSaved"),
        description: t("settings.targetBlockTime.targetUpdated", { 
          minutes: minutes.toString(), 
          hours: hours.toFixed(2) 
        }),
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: t("settings.leaguesManagement.error.failedToSave"),
        description:
          error instanceof Error ? error.message : t("settings.leaguesManagement.error.failedToSave"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Save thresholds to backend API
  const handleSaveThresholds = async () => {
    if (viewsThreshold < 0 || violationsThreshold < 0) {
      toast({
        title: t("settings.problematicAccountsThresholds.validationError"),
        description: t("settings.problematicAccountsThresholds.mustBeGreaterThanZero"),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          viewsThreshold: viewsThreshold,
          violationsThreshold: violationsThreshold,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save thresholds");
      }

      const updatedSettings = await response.json();

      // Update local state with the response
      const viewsThresh = updatedSettings.viewsThreshold ?? viewsThreshold;
      const violationsThresh =
        updatedSettings.violationsThreshold ?? violationsThreshold;
      setViewsThreshold(viewsThresh);
      setViewsThresholdInput(viewsThresh.toLocaleString("en-US"));
      setViolationsThreshold(violationsThresh);
      setViolationsThresholdInput(violationsThresh.toString());

      toast({
        title: t("settings.problematicAccountsThresholds.thresholdsSaved"),
        description: t("settings.problematicAccountsThresholds.thresholdsUpdated", {
          views: viewsThresh.toLocaleString("en-US"),
          violations: violationsThresh.toString()
        }),
      });
    } catch (error) {
      console.error("Error saving thresholds:", error);
      toast({
        title: t("settings.problematicAccountsThresholds.error.failedToSaveThresholds"),
        description:
          error instanceof Error ? error.message : t("settings.problematicAccountsThresholds.error.failedToSaveThresholds"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
          {t("settings.title")}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
          {t("settings.subtitle")}
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
        {/* Target Minutes Setting */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-lg sm:text-xl">
                {t("settings.targetBlockTime.title")}
              </CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              {t("settings.targetBlockTime.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            {loadingSettings ? (
              <div className="flex items-center justify-center py-6 sm:py-8">
                <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label
                      htmlFor="targetMinutes"
                      className="text-xs sm:text-sm">
                      {t("settings.targetBlockTime.minutes")}
                    </Label>
                    <Input
                      id="targetMinutes"
                      type="text"
                      value={minutesInput}
                      onChange={(e) => handleMinutesChange(e.target.value)}
                      onFocus={() => setFocusedField("minutes")}
                      onBlur={handleMinutesBlur}
                      className="w-full h-9 sm:h-10 text-sm"
                      placeholder="0"
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="targetHours" className="text-xs sm:text-sm">
                      {t("settings.targetBlockTime.hours")}
                    </Label>
                    <Input
                      id="targetHours"
                      type="text"
                      value={hoursInput}
                      onChange={(e) => handleHoursChange(e.target.value)}
                      onFocus={() => setFocusedField("hours")}
                      onBlur={handleHoursBlur}
                      className="w-full h-9 sm:h-10 text-sm"
                      placeholder="0"
                      disabled={saving}
                    />
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {t("settings.targetBlockTime.autoConvert")}
                </p>
                <Button
                  onClick={handleSaveTargetMinutes}
                  className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm touch-manipulation"
                  disabled={saving || loadingSettings}>
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                      {t("settings.targetBlockTime.saving")}
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                      {t("settings.targetBlockTime.saveTargetTime")}
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Problematic Accounts Thresholds */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-lg sm:text-xl">
                {t("settings.problematicAccountsThresholds.title")}
              </CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              {t("settings.problematicAccountsThresholds.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            {loadingSettings ? (
              <div className="flex items-center justify-center py-6 sm:py-8">
                <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label
                      htmlFor="viewsThreshold"
                      className="text-xs sm:text-sm">
                      {t("settings.problematicAccountsThresholds.viewsThreshold")}
                    </Label>
                    <Input
                      id="viewsThreshold"
                      type="text"
                      value={viewsThresholdInput}
                      onChange={(e) =>
                        handleViewsThresholdChange(e.target.value)
                      }
                      onBlur={handleViewsThresholdBlur}
                      className="w-full h-9 sm:h-10 text-sm"
                      placeholder="0"
                      disabled={saving}
                    />
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {t("settings.problematicAccountsThresholds.viewsDescription")}
                    </p>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label
                      htmlFor="violationsThreshold"
                      className="text-xs sm:text-sm">
                      {t("settings.problematicAccountsThresholds.violationsThreshold")}
                    </Label>
                    <Input
                      id="violationsThreshold"
                      type="text"
                      value={violationsThresholdInput}
                      onChange={(e) =>
                        handleViolationsThresholdChange(e.target.value)
                      }
                      className="w-full h-9 sm:h-10 text-sm"
                      placeholder="0"
                      disabled={saving}
                    />
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {t("settings.problematicAccountsThresholds.violationsDescription")}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleSaveThresholds}
                  className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm touch-manipulation"
                  disabled={saving || loadingSettings}>
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                      {t("settings.targetBlockTime.saving")}
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                      {t("settings.problematicAccountsThresholds.saveThresholds")}
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leagues Management */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-lg sm:text-xl">
                {t("settings.leaguesManagement.title")}
              </CardTitle>
            </div>
            <Dialog
              open={isAddLeagueOpen}
              onOpenChange={(open) => {
                setIsAddLeagueOpen(open);
                if (!open) {
                  resetLeagueForm();
                }
              }}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="h-8 sm:h-9 text-xs sm:text-sm touch-manipulation">
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  <span className="hidden xs:inline">{t("settings.leaguesManagement.addLeague")}</span>
                  <span className="xs:hidden">{t("settings.leaguesManagement.add")}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:w-full max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">
                    {t("settings.leaguesManagement.addLeague")}
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    {formIsManual
                      ? t("settings.leaguesManagement.manualLeagueDescription")
                      : t("settings.leaguesManagement.regularLeagueDescription")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isManual"
                      checked={formIsManual}
                      onCheckedChange={(checked) =>
                        setFormIsManual(checked === true)
                      }
                    />
                    <Label
                      htmlFor="isManual"
                      className="text-xs sm:text-sm font-normal cursor-pointer">
                      {t("settings.leaguesManagement.manualLeague")}
                    </Label>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="slug" className="text-xs sm:text-sm">
                      {t("settings.leaguesManagement.slug")} *
                    </Label>
                    <Input
                      id="slug"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value)}
                      placeholder="e.g., saudi"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>

                  {formIsManual ? (
                    <>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="name" className="text-xs sm:text-sm">
                          {t("settings.leaguesManagement.name")} *
                        </Label>
                        <Input
                          id="name"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          placeholder="e.g., Saudi League"
                          className="h-9 sm:h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label
                          htmlFor="arabicName"
                          className="text-xs sm:text-sm">
                          {t("settings.leaguesManagement.arabicName")}
                        </Label>
                        <Input
                          id="arabicName"
                          value={formArabicName}
                          onChange={(e) => setFormArabicName(e.target.value)}
                          placeholder="الدوري السعودي"
                          className="h-9 sm:h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label
                          htmlFor="competitionType"
                          className="text-xs sm:text-sm">
                          {t("settings.leaguesManagement.competitionType")} *
                        </Label>
                        <Select
                          value={formCompetitionType}
                          onValueChange={(value: "league" | "cup") =>
                            setFormCompetitionType(value)
                          }>
                          <SelectTrigger className="h-9 sm:h-10 text-sm">
                            <SelectValue placeholder={t("settings.leaguesManagement.selectType")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="league">{t("settings.leaguesManagement.league")}</SelectItem>
                            <SelectItem value="cup">{t("settings.leaguesManagement.cup")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="icon" className="text-xs sm:text-sm">
                          {t("settings.leaguesManagement.leagueIcon")}
                        </Label>
                        <Input
                          id="icon"
                          type="file"
                          accept="image/svg+xml,image/png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                setFormError(t("settings.leaguesManagement.error.fileSizeTooLarge"));
                                return;
                              }
                              setFormIcon(file);
                              setFormError("");
                            }
                          }}
                          className="h-9 sm:h-10 text-sm"
                        />
                        {formIcon && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {t("settings.leaguesManagement.selected")} {formIcon.name}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="apiUrl" className="text-xs sm:text-sm">
                          {t("settings.leaguesManagement.apiUrl")} *
                        </Label>
                        <Input
                          id="apiUrl"
                          value={formApiUrl}
                          onChange={(e) => setFormApiUrl(e.target.value)}
                          placeholder="https://api.performfeeds.com/..."
                          className="h-9 sm:h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="referer" className="text-xs sm:text-sm">
                          {t("settings.leaguesManagement.referer")} *
                        </Label>
                        <Input
                          id="referer"
                          value={formReferer}
                          onChange={(e) => setFormReferer(e.target.value)}
                          placeholder="https://optaplayerstats.statsperform.com/"
                          className="h-9 sm:h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label
                          htmlFor="arabicName"
                          className="text-xs sm:text-sm">
                          {t("settings.leaguesManagement.arabicName")}
                        </Label>
                        <Input
                          id="arabicName"
                          value={formArabicName}
                          onChange={(e) => setFormArabicName(e.target.value)}
                          placeholder="الدوري السعودي"
                          className="h-9 sm:h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label
                          htmlFor="competitionType"
                          className="text-xs sm:text-sm">
                          {t("settings.leaguesManagement.competitionType")} *
                        </Label>
                        <Select
                          value={formCompetitionType}
                          onValueChange={(value: "league" | "cup") =>
                            setFormCompetitionType(value)
                          }>
                          <SelectTrigger className="h-9 sm:h-10 text-sm">
                            <SelectValue placeholder={t("settings.leaguesManagement.selectType")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="league">{t("settings.leaguesManagement.league")}</SelectItem>
                            <SelectItem value="cup">{t("settings.leaguesManagement.cup")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label htmlFor="icon" className="text-xs sm:text-sm">
                          {t("settings.leaguesManagement.leagueIconRequired")}
                        </Label>
                        <Input
                          id="icon"
                          type="file"
                          accept="image/svg+xml,image/png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                setFormError(t("settings.leaguesManagement.error.fileSizeTooLarge"));
                                return;
                              }
                              setFormIcon(file);
                              setFormError("");
                            }
                          }}
                          className="h-9 sm:h-10 text-sm"
                        />
                        {formIcon && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {t("settings.leaguesManagement.selected")} {formIcon.name}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                  {formError && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs sm:text-sm">
                        {formError}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddLeagueOpen(false);
                      resetLeagueForm();
                    }}
                    className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                    {t("settings.leaguesManagement.cancel")}
                  </Button>
                  <Button
                    onClick={handleAddLeague}
                    disabled={addingLeague}
                    className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                    {addingLeague ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                        {t("settings.leaguesManagement.adding")}
                      </>
                    ) : (
                      t("settings.leaguesManagement.addLeague")
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <CardDescription className="text-xs sm:text-sm">
            {t("settings.leaguesManagement.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {loadingLeagues ? (
            <div className="flex items-center justify-center py-6 sm:py-8">
              <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-muted-foreground" />
            </div>
          ) : leagues.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-muted-foreground">
              <Globe className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-xs sm:text-sm">
                {t("settings.leaguesManagement.noLeaguesFound")}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Version */}
              <div className="md:hidden space-y-3">
                {leagues.map((league) => {
                  const iconUrl = league.iconUrl
                    ? league.iconUrl.startsWith("/")
                      ? `${API_URL.replace("/api", "")}${league.iconUrl}`
                      : league.iconUrl
                    : null;
                  return (
                    <Card key={league._id || league.league} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {iconUrl && (
                            <img
                              src={iconUrl}
                              alt={league.name || league.league}
                              className="h-8 w-8 sm:h-10 sm:w-10 object-contain flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold truncate">
                                {isRTL && league.arabicName
                                  ? league.arabicName
                                  : league.knownName ||
                                    league.name ||
                                    league.league}
                              </span>
                              {league.isHidden && (
                                <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                  {t("settings.leaguesManagement.status.hidden")}
                                </span>
                              )}
                            </div>
                            {league.arabicName && (
                              <p className="text-xs text-muted-foreground mb-1">
                                {league.arabicName}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground truncate">
                              {t("settings.leaguesManagement.slugLabel")} {league.league}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {t("settings.leaguesManagement.codeLabel")} {league.competitionCode || t("whitelistedAccounts.nA")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditLeagueDialog(league)}
                            className="h-7 w-7 touch-manipulation">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleLeague(league)}
                            className="h-7 w-7 touch-manipulation">
                            {league.isHidden ? (
                              <Eye className="h-3.5 w-3.5" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop Version */}
              <div className="hidden md:block rounded-md border overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="p-3 sm:p-4 text-xs sm:text-sm">
                        {t("settings.leaguesManagement.tableHeaders.icon")}
                      </TableHead>
                      <TableHead className="p-3 sm:p-4 text-xs sm:text-sm">
                        {t("settings.leaguesManagement.tableHeaders.name")}
                      </TableHead>
                      <TableHead className="p-3 sm:p-4 text-xs sm:text-sm">
                        {t("settings.leaguesManagement.tableHeaders.arabicName")}
                      </TableHead>
                      <TableHead className="p-3 sm:p-4 text-xs sm:text-sm">
                        {t("settings.leaguesManagement.tableHeaders.slug")}
                      </TableHead>
                      <TableHead className="p-3 sm:p-4 text-xs sm:text-sm">
                        {t("settings.leaguesManagement.tableHeaders.code")}
                      </TableHead>
                      <TableHead className="p-3 sm:p-4 text-xs sm:text-sm">
                        {t("settings.leaguesManagement.tableHeaders.status")}
                      </TableHead>
                      <TableHead className="p-3 sm:p-4 text-right text-xs sm:text-sm">
                        {t("settings.leaguesManagement.tableHeaders.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leagues.map((league) => {
                      const iconUrl = league.iconUrl
                        ? league.iconUrl.startsWith("/")
                          ? `${API_URL.replace("/api", "")}${league.iconUrl}`
                          : league.iconUrl
                        : null;
                      return (
                        <TableRow key={league._id || league.league}>
                          <TableCell className="p-3 sm:p-4">
                            {iconUrl ? (
                              <img
                                src={iconUrl}
                                alt={league.name || league.league}
                                className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="p-3 sm:p-4 text-xs sm:text-sm">
                            {isRTL && league.arabicName
                              ? league.arabicName
                              : league.knownName || league.name || league.league}
                          </TableCell>
                          <TableCell className="p-3 sm:p-4 text-xs sm:text-sm">
                            {league.arabicName || "-"}
                          </TableCell>
                          <TableCell className="p-3 sm:p-4 text-xs sm:text-sm font-mono">
                            {league.league}
                          </TableCell>
                          <TableCell className="p-3 sm:p-4 text-xs sm:text-sm">
                            {league.competitionCode || "-"}
                          </TableCell>
                          <TableCell className="p-3 sm:p-4 text-xs sm:text-sm">
                            {league.isHidden ? (
                              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                {t("settings.leaguesManagement.status.hidden")}
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                                {t("settings.leaguesManagement.status.visible")}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="p-3 sm:p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditLeagueDialog(league)}
                                className="h-8 w-8">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleLeague(league)}
                                className="h-8 w-8">
                                {league.isHidden ? (
                                  <Eye className="h-4 w-4" />
                                ) : (
                                  <EyeOff className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit League Dialog */}
      <Dialog open={isEditLeagueOpen} onOpenChange={setIsEditLeagueOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {t("settings.leaguesManagement.editLeague")}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t("settings.leaguesManagement.updateLeagueInfo")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="edit-slug" className="text-xs sm:text-sm">
                {t("settings.leaguesManagement.slug")} *
              </Label>
              <Input
                id="edit-slug"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                placeholder="e.g., saudi"
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="edit-apiUrl" className="text-xs sm:text-sm">
                {t("settings.leaguesManagement.apiUrl")} *
              </Label>
              <Input
                id="edit-apiUrl"
                value={formApiUrl}
                onChange={(e) => setFormApiUrl(e.target.value)}
                placeholder="https://api.performfeeds.com/..."
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="edit-referer" className="text-xs sm:text-sm">
                {t("settings.leaguesManagement.referer")} *
              </Label>
              <Input
                id="edit-referer"
                value={formReferer}
                onChange={(e) => setFormReferer(e.target.value)}
                placeholder="https://optaplayerstats.statsperform.com/"
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="edit-arabicName" className="text-xs sm:text-sm">
                {t("settings.leaguesManagement.arabicName")}
              </Label>
              <Input
                id="edit-arabicName"
                value={formArabicName}
                onChange={(e) => setFormArabicName(e.target.value)}
                placeholder="الدوري السعودي"
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label
                htmlFor="edit-competitionType"
                className="text-xs sm:text-sm">
                {t("settings.leaguesManagement.competitionType")} *
              </Label>
              <Select
                value={formCompetitionType}
                onValueChange={(value: "league" | "cup") =>
                  setFormCompetitionType(value)
                }>
                <SelectTrigger className="h-9 sm:h-10 text-sm">
                  <SelectValue placeholder={t("settings.leaguesManagement.selectType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="league">{t("settings.leaguesManagement.league")}</SelectItem>
                  <SelectItem value="cup">{t("settings.leaguesManagement.cup")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="edit-icon" className="text-xs sm:text-sm">
                {t("settings.leaguesManagement.leagueIcon")}
              </Label>
              <Input
                id="edit-icon"
                type="file"
                accept="image/svg+xml,image/png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                      setFormError(t("settings.leaguesManagement.error.fileSizeTooLarge"));
                      return;
                    }
                    setFormIcon(file);
                    setFormError("");
                  }
                }}
                className="h-9 sm:h-10 text-sm"
              />
              {formIcon && (
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {t("settings.leaguesManagement.selected")} {formIcon.name}
                </p>
              )}
              {editingLeague?.iconUrl && !formIcon && (
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {t("settings.leaguesManagement.currentIcon")} {editingLeague.iconUrl.split("/").pop()}
                </p>
              )}
            </div>
            {formError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs sm:text-sm">
                  {formError}
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditLeagueOpen(false);
                resetLeagueForm();
              }}
              className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
              {t("settings.leaguesManagement.cancel")}
            </Button>
            <Button
              onClick={handleUpdateLeague}
              disabled={updatingLeague}
              className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
              {updatingLeague ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                  {t("settings.leaguesManagement.updating")}
                </>
              ) : (
                t("settings.leaguesManagement.updateLeague")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
