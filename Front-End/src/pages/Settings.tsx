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
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import {
  Settings as SettingsIcon,
  Clock,
  Save,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { API_URL } from "@/components/MatchDashboard/types";
import { useAuth } from "@/contexts/AuthContext";

export default function Settings() {
  const { user: currentUser } = useAuth();
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

  // Check if user is superAdmin
  useEffect(() => {
    if (!currentUser || currentUser.role !== "superAdmin") {
      toast({
        title: "Access Denied",
        description: "Only superAdmin can access this page.",
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
          title: "Error",
          description: "Failed to load settings. Using default values.",
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
  }, [currentUser]);

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
        title: "Validation Error",
        description: "Target minutes must be greater than or equal to 1.",
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
        title: "Settings Saved",
        description: `Target block time updated to ${minutes} minutes (${hours.toFixed(
          2
        )} hours).`,
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save settings",
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
        title: "Validation Error",
        description: "Thresholds must be greater than or equal to 0.",
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
        title: "Thresholds Saved",
        description: `Views threshold: ${viewsThresh.toLocaleString(
          "en-US"
        )}, Violations threshold: ${violationsThresh}`,
      });
    } catch (error) {
      console.error("Error saving thresholds:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save thresholds",
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
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
          Manage application settings
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
        {/* Target Minutes Setting */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-lg sm:text-xl">Target Block Time</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Set the target time (in minutes) for blocking violations
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
                    <Label htmlFor="targetMinutes" className="text-xs sm:text-sm">Minutes</Label>
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
                    <Label htmlFor="targetHours" className="text-xs sm:text-sm">Hours</Label>
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
                  Enter time in either minutes or hours - values will
                  auto-convert
                </p>
                <Button
                  onClick={handleSaveTargetMinutes}
                  className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm touch-manipulation"
                  disabled={saving || loadingSettings}>
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                      Save Target Time
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
              <CardTitle className="text-lg sm:text-xl">Problematic Accounts Thresholds</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Set thresholds for views and violations. Accounts above these
              thresholds are considered problematic.
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
                    <Label htmlFor="viewsThreshold" className="text-xs sm:text-sm">Views Threshold</Label>
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
                      Accounts with views above this number are considered
                      problematic
                    </p>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="violationsThreshold" className="text-xs sm:text-sm">
                      Violations Threshold
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
                      Accounts with violations above this number are considered
                      problematic
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
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                      Save Thresholds
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
