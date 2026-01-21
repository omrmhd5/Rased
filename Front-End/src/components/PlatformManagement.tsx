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
import { API_URL } from "@/components/MatchDashboard/types";
import { useLanguage } from "@/contexts/LanguageContext";

interface Platform {
  _id: string;
  id: string;
  name: string;
}

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
        title: "Error",
        description: "Failed to load platforms",
        variant: "destructive",
      });
    } finally {
      setLoadingPlatforms(false);
    }
  };

  useEffect(() => {
    fetchPlatforms();
  }, []);

  // Reset form
  const resetForm = () => {
    setFormName("");
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

  // Add platform
  const handleAdd = async () => {
    setFormError("");

    if (!formName.trim()) {
      setFormError("Platform name is required");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/platforms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: formName.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create platform");
      }

      toast({
        title: "Success",
        description: "Platform created successfully",
      });

      setIsAddOpen(false);
      resetForm();
      fetchPlatforms();
    } catch (error) {
      console.error("Error adding platform:", error);
      setFormError(
        error instanceof Error ? error.message : "Failed to create platform",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Update platform
  const handleUpdate = async () => {
    setFormError("");

    if (!formName.trim()) {
      setFormError("Platform name is required");
      return;
    }

    if (!editingPlatform) {
      setFormError("No platform selected");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `${API_URL}/platforms/${editingPlatform.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: formName.trim(),
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update platform");
      }

      toast({
        title: "Success",
        description: "Platform updated successfully",
      });

      setIsEditOpen(false);
      resetForm();
      fetchPlatforms();
    } catch (error) {
      console.error("Error updating platform:", error);
      setFormError(
        error instanceof Error ? error.message : "Failed to update platform",
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
        throw new Error(errorData.error || "Failed to delete platform");
      }

      toast({
        title: "Success",
        description: "Platform deleted successfully",
      });

      setIsDeleteOpen(false);
      resetForm();
      fetchPlatforms();
    } catch (error) {
      console.error("Error deleting platform:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete platform",
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
              Platform Management
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
            Add Platform
          </Button>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          Manage platforms for violation tracking
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {loadingPlatforms ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : platforms.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No platforms found. Add your first platform to get started.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Name</TableHead>
                  <TableHead className="text-xs sm:text-sm">ID</TableHead>
                  <TableHead className="text-right text-xs sm:text-sm">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {platforms.map((platform) => (
                  <TableRow key={platform._id}>
                    <TableCell className="font-medium text-xs sm:text-sm">
                      {platform.name}
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
            <DialogTitle>Add New Platform</DialogTitle>
            <DialogDescription>
              Enter the platform name to add it to the system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="platform-name">Platform Name</Label>
              <Input
                id="platform-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., YouTube, Facebook"
                disabled={submitting}
              />
            </div>
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
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Platform"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Platform Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Platform</DialogTitle>
            <DialogDescription>Update the platform name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-platform-name">Platform Name</Label>
              <Input
                id="edit-platform-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., YouTube, Facebook"
                disabled={submitting}
              />
            </div>
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
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Platform"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Platform</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingPlatform?.name}"? This
              action cannot be undone.
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
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
