import { useState, useEffect } from "react";
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
import { toast } from "@/hooks/use-toast";
import { Globe, Plus, Edit, Trash2, Loader2 } from "lucide-react";
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
} from "@/components/ui/dialog";
import { API_URL, BASE_URL } from "@/components/MatchDashboard/types";
import {
  PLATFORM_ICONS,
  PLATFORM_COLORS,
} from "@/components/MatchDashboard/constants";
import { useLanguage } from "@/contexts/LanguageContext";

interface Platform {
  _id: string;
  id: string;
  name: string;
  iconUrl?: string;
}

const KNOWN_PLATFORM_IDS = [
  "twitter",
  "youtube",
  "facebook",
  "tiktok",
  "instagram",
];

export default function PlatformManagement() {
  const { t } = useLanguage();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
  const [deletingPlatform, setDeletingPlatform] = useState<Platform | null>(
    null,
  );
  const [formName, setFormName] = useState("");
  const [formIcon, setFormIcon] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch platforms
  const fetchPlatforms = async () => {
    setLoadingPlatforms(true);
    try {
      const response = await fetch(`${API_URL}/platforms`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch platforms");
      }

      const data = await response.json();
      setPlatforms(data || []);
    } catch (error) {
      console.error("Error fetching platforms:", error);
      toast({
        title: t("dashboard.error"),
        description: t("platformManagement.error.loadFailed"),
        variant: "destructive",
      });
    } finally {
      setLoadingPlatforms(false);
    }
  };

  useEffect(() => {
    fetchPlatforms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset form
  const resetForm = () => {
    setFormName("");
    setFormIcon(null);
    setFormError("");
    setEditingPlatform(null);
    setDeletingPlatform(null);
  };

  // Open edit dialog
  const openEditDialog = (platform: Platform) => {
    setEditingPlatform(platform);
    setFormName(platform.name);
    setFormError("");
    setIsEditOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (platform: Platform) => {
    setDeletingPlatform(platform);
    setIsDeleteOpen(true);
  };

  // Helper to convert file to Base64
  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  // Add platform
  const handleAdd = async () => {
    setFormError("");

    if (!formName.trim()) {
      setFormError(t("platformManagement.validation.nameRequired"));
      return;
    }

    setSubmitting(true);
    try {
      let iconBase64 = null;
      if (formIcon) {
        try {
          iconBase64 = await toBase64(formIcon);
        } catch (e) {
          console.error("Error converting file to base64", e);
        }
      }

      const body: any = {
        name: formName.trim(),
      };

      if (iconBase64) {
        body.icon = iconBase64;
        // Also send as iconUrl for flexibility if backend expects that
        body.iconUrl = iconBase64;
      }

      const response = await fetch(`${API_URL}/platforms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || t("platformManagement.error.createFailed"),
        );
      }

      toast({
        title: t("platformManagement.success.created"),
        description: t("platformManagement.success.created"),
      });

      setIsAddOpen(false);
      resetForm();
      fetchPlatforms();
    } catch (error) {
      console.error("Error adding platform:", error);
      setFormError(
        error instanceof Error
          ? error.message
          : t("platformManagement.error.createFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Update platform
  const handleUpdate = async () => {
    setFormError("");

    if (!formName.trim()) {
      setFormError(t("platformManagement.validation.nameRequired"));
      return;
    }

    if (!editingPlatform) {
      setFormError(t("platformManagement.validation.noPlatformSelected"));
      return;
    }

    setSubmitting(true);
    try {
      let iconBase64 = null;
      if (formIcon) {
        try {
          iconBase64 = await toBase64(formIcon);
        } catch (e) {
          console.error("Error converting file to base64", e);
        }
      }

      const body: any = {
        name: formName.trim(),
      };

      if (iconBase64) {
        body.icon = iconBase64;
        body.iconUrl = iconBase64;
      }

      const response = await fetch(
        `${API_URL}/platforms/${editingPlatform.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || t("platformManagement.error.updateFailed"),
        );
      }

      toast({
        title: t("platformManagement.success.updated"),
        description: t("platformManagement.success.updated"),
      });

      setIsEditOpen(false);
      resetForm();
      fetchPlatforms();
    } catch (error) {
      console.error("Error updating platform:", error);
      setFormError(
        error instanceof Error
          ? error.message
          : t("platformManagement.error.updateFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete platform
  const handleDelete = async () => {
    if (!deletingPlatform) return;

    setSubmitting(true);
    try {
      const response = await fetch(
        `${API_URL}/platforms/${deletingPlatform.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || t("platformManagement.error.deleteFailed"),
        );
      }

      toast({
        title: t("platformManagement.success.deleted"),
        description: t("platformManagement.success.deleted"),
      });

      setIsDeleteOpen(false);
      resetForm();
      fetchPlatforms();
    } catch (error) {
      console.error("Error deleting platform:", error);

      let errorMessage = t("platformManagement.error.deleteFailed");
      if (error instanceof Error) {
        // Check for specific backend error: "Cannot delete platform with X associated violations"
        const match = error.message.match(
          /Cannot delete platform with (\d+) associated violations/,
        );
        if (match) {
          errorMessage = t(
            "platformManagement.validation.cannotDeleteWithViolations",
            { count: match[1] },
          );
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: t("dashboard.error"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <CardTitle className="text-lg sm:text-xl">
              {t("platformManagement.title")}
            </CardTitle>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsAddOpen(true);
            }}
            size="sm"
            className="h-8 sm:h-9 text-xs sm:text-sm">
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
            {t("platformManagement.addPlatform")}
          </Button>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          {t("platformManagement.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {loadingPlatforms ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : platforms.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t("platformManagement.noPlatforms")}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">
                    {t("platformManagement.list.name")}
                  </TableHead>
                  <TableHead className="text-xs sm:text-sm">
                    {t("platformManagement.list.id")}
                  </TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">
                    {t("platformManagement.list.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {platforms.map((platform) => (
                  <TableRow key={platform._id}>
                    <TableCell className="font-medium text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        {(() => {
                          // 1. Check for hardcoded brand icons first (matches user request)
                          const normalizedId = platform.id.toLowerCase();
                          const BrandIcon = PLATFORM_ICONS[normalizedId];

                          if (BrandIcon) {
                            return (
                              <BrandIcon
                                className="h-4 w-4"
                                style={{
                                  color:
                                    PLATFORM_COLORS[normalizedId] ||
                                    "currentColor",
                                }}
                              />
                            );
                          }

                          // 2. Check for uploaded custom icon
                          if (platform.iconUrl) {
                            return (
                              <img
                                src={
                                  platform.iconUrl.startsWith("http")
                                    ? platform.iconUrl
                                    : `${BASE_URL}${platform.iconUrl}`
                                }
                                alt={platform.name}
                                className="h-4 w-4 object-contain"
                              />
                            );
                          }

                          // 3. Fallback to Globe
                          return (
                            <Globe className="h-4 w-4 text-muted-foreground" />
                          );
                        })()}
                        {platform.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm text-muted-foreground">
                      {platform.id}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(platform)}
                          className="h-8 w-8 p-0">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(platform)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Add Platform Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("platformManagement.addDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("platformManagement.addDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="platform-name">
                {t("platformManagement.addDialog.nameLabel")}
              </Label>
              <Input
                id="platform-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("platformManagement.addDialog.namePlaceholder")}
                disabled={submitting}
              />
            </div>
            {!KNOWN_PLATFORM_IDS.includes(formName.trim().toLowerCase()) &&
              formName.trim().length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="add-platform-icon">
                    {t("platformManagement.form.iconOptional")}
                  </Label>
                  <div className="flex flex-col gap-2">
                    <Input
                      id="add-platform-icon"
                      type="file"
                      accept="image/png, image/jpeg, image/svg+xml"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setFormIcon(file);
                      }}
                      disabled={submitting}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {t("platformManagement.form.supportedFormats")}
                    </p>
                  </div>
                </div>
              )}
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddOpen(false);
                resetForm();
              }}
              disabled={submitting}>
              {t("platformManagement.addDialog.cancel")}
            </Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("platformManagement.addDialog.adding")}
                </>
              ) : (
                t("platformManagement.addDialog.add")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Platform Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("platformManagement.editDialog.title")}
            </DialogTitle>
            <DialogDescription>
              {t("platformManagement.editDialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-platform-name">
                {t("platformManagement.editDialog.nameLabel")}
              </Label>
              <Input
                id="edit-platform-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("platformManagement.editDialog.namePlaceholder")}
                disabled={submitting}
              />
            </div>
            {!KNOWN_PLATFORM_IDS.includes(formName.trim().toLowerCase()) &&
              formName.trim().length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="edit-platform-icon">
                    {t("platformManagement.form.iconOptional")}
                  </Label>
                  <div className="flex flex-col gap-2">
                    <Input
                      id="edit-platform-icon"
                      type="file"
                      accept="image/png, image/jpeg, image/svg+xml"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setFormIcon(file);
                      }}
                      disabled={submitting}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {t("platformManagement.form.supportedFormats")}
                    </p>
                  </div>
                </div>
              )}
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                resetForm();
              }}
              disabled={submitting}>
              {t("platformManagement.editDialog.cancel")}
            </Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("platformManagement.editDialog.updating")}
                </>
              ) : (
                t("platformManagement.editDialog.update")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("platformManagement.deleteDialog.title")}
            </DialogTitle>
            <DialogDescription>
              {t("platformManagement.deleteDialog.description", {
                name: deletingPlatform?.name || "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteOpen(false);
                resetForm();
              }}
              disabled={submitting}>
              {t("platformManagement.deleteDialog.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("platformManagement.deleteDialog.deleting")}
                </>
              ) : (
                t("platformManagement.deleteDialog.delete")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
