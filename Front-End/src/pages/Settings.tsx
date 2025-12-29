import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Clock, Users, Plus, Edit2, Trash2, Save, X, Loader2 } from "lucide-react";
import { API_URL } from "@/components/MatchDashboard/types";

interface User {
  id: string;
  username: string;
  email: string;
  createdAt?: string;
}

const STORAGE_KEYS = {
  TARGET_MINUTES: "rased_target_minutes",
  USERS: "rased_users",
};

export default function Settings() {
  const [targetMinutes, setTargetMinutes] = useState<number>(15);
  const [targetHours, setTargetHours] = useState<number>(15 / 60);
  const [minutesInput, setMinutesInput] = useState<string>("15");
  const [hoursInput, setHoursInput] = useState<string>("0.25");
  const [focusedField, setFocusedField] = useState<"minutes" | "hours" | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  
  // Dialog states
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDeleteUserOpen, setIsDeleteUserOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  
  // Form states
  const [formUsername, setFormUsername] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formError, setFormError] = useState("");

  // Load settings from backend API on mount
  useEffect(() => {
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
      } finally {
        setLoadingSettings(false);
      }
    };

    fetchSettings();

    // Load users from localStorage (still frontend-only for now)
    const savedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
    if (savedUsers) {
      try {
        setUsers(JSON.parse(savedUsers));
      } catch (error) {
        console.error("Error loading users:", error);
      }
    }
  }, []);

  // Handle minutes change - auto-calculate hours (only allow numbers)
  const handleMinutesChange = (value: string) => {
    // Only allow numbers and decimal point
    const filtered = value.replace(/[^0-9.]/g, "");
    // Prevent multiple decimal points
    const parts = filtered.split(".");
    const sanitized = parts.length > 2 
      ? parts[0] + "." + parts.slice(1).join("")
      : filtered;
    
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
    const sanitized = parts.length > 2 
      ? parts[0] + "." + parts.slice(1).join("")
      : filtered;
    
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
        description: `Target block time updated to ${minutes} minutes (${hours.toFixed(2)} hours).`,
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormUsername("");
    setFormEmail("");
    setFormPassword("");
    setFormError("");
  };

  // Add user
  const handleAddUser = () => {
    setFormError("");
    
    if (!formUsername.trim() || !formEmail.trim() || !formPassword.trim()) {
      setFormError("All fields are required.");
      return;
    }

    if (formUsername.length < 3) {
      setFormError("Username must be at least 3 characters.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(formEmail)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    if (formPassword.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }

    // Check if email or username already exists
    if (users.some(u => u.email.toLowerCase() === formEmail.toLowerCase())) {
      setFormError("A user with this email already exists.");
      return;
    }

    if (users.some(u => u.username.toLowerCase() === formUsername.toLowerCase())) {
      setFormError("A user with this username already exists.");
      return;
    }

    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: formUsername.trim(),
      email: formEmail.trim().toLowerCase(),
      createdAt: new Date().toISOString(),
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    
    resetForm();
    setIsAddUserOpen(false);
    toast({
      title: "User Added",
      description: `User "${newUser.username}" has been added successfully.`,
    });
  };

  // Edit user
  const handleEditUser = () => {
    if (!editingUser) return;

    setFormError("");
    
    if (!formUsername.trim() || !formEmail.trim()) {
      setFormError("Username and email are required.");
      return;
    }

    if (formUsername.length < 3) {
      setFormError("Username must be at least 3 characters.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(formEmail)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    // Check if email or username already exists (excluding current user)
    if (users.some(u => u.id !== editingUser.id && u.email.toLowerCase() === formEmail.toLowerCase())) {
      setFormError("A user with this email already exists.");
      return;
    }

    if (users.some(u => u.id !== editingUser.id && u.username.toLowerCase() === formUsername.toLowerCase())) {
      setFormError("A user with this username already exists.");
      return;
    }

    const updatedUsers = users.map(u =>
      u.id === editingUser.id
        ? { ...u, username: formUsername.trim(), email: formEmail.trim().toLowerCase() }
        : u
    );

    setUsers(updatedUsers);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    
    resetForm();
    setIsEditUserOpen(false);
    setEditingUser(null);
    toast({
      title: "User Updated",
      description: `User "${formUsername.trim()}" has been updated successfully.`,
    });
  };

  // Delete user
  const handleDeleteUser = () => {
    if (!deletingUser) return;

    const updatedUsers = users.filter(u => u.id !== deletingUser.id);
    setUsers(updatedUsers);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    
    setIsDeleteUserOpen(false);
    setDeletingUser(null);
    toast({
      title: "User Deleted",
      description: `User "${deletingUser.username}" has been deleted.`,
      variant: "destructive",
    });
  };

  // Open edit dialog
  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormUsername(user.username);
    setFormEmail(user.email);
    setFormPassword("");
    setIsEditUserOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (user: User) => {
    setDeletingUser(user);
    setIsDeleteUserOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage application settings and users
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Target Minutes Setting */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle>Target Block Time</CardTitle>
            </div>
            <CardDescription>
              Set the target time (in minutes) for blocking violations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingSettings ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="targetMinutes">Minutes</Label>
                    <Input
                      id="targetMinutes"
                      type="text"
                      value={minutesInput}
                      onChange={(e) => handleMinutesChange(e.target.value)}
                      onFocus={() => setFocusedField("minutes")}
                      onBlur={handleMinutesBlur}
                      className="w-full"
                      placeholder="0"
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetHours">Hours</Label>
                    <Input
                      id="targetHours"
                      type="text"
                      value={hoursInput}
                      onChange={(e) => handleHoursChange(e.target.value)}
                      onFocus={() => setFocusedField("hours")}
                      onBlur={handleHoursBlur}
                      className="w-full"
                      placeholder="0"
                      disabled={saving}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter time in either minutes or hours - values will auto-convert
                </p>
                <Button 
                  onClick={handleSaveTargetMinutes} 
                  className="w-full sm:w-auto"
                  disabled={saving || loadingSettings}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Target Time
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* User Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>User Management</CardTitle>
              </div>
              <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => resetForm()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>
                      Create a new user account. Password is required for new users.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {formError && (
                      <Alert variant="destructive">
                        <AlertDescription>{formError}</AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="add-username">Username</Label>
                      <Input
                        id="add-username"
                        value={formUsername}
                        onChange={(e) => setFormUsername(e.target.value)}
                        placeholder="Enter username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="add-email">Email</Label>
                      <Input
                        id="add-email"
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="Enter email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="add-password">Password</Label>
                      <Input
                        id="add-password"
                        type="password"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder="Enter password (min 6 characters)"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setIsAddUserOpen(false); resetForm(); }}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddUser}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <CardDescription>
              Manage user accounts and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found. Add your first user to get started.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(user)}
                              className="h-8 w-8">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(user)}
                              className="h-8 w-8 text-destructive hover:text-destructive">
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
        </Card>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. Leave password empty to keep current password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="Enter email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">New Password (Optional)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="Leave empty to keep current password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditUserOpen(false); resetForm(); setEditingUser(null); }}>
              Cancel
            </Button>
            <Button onClick={handleEditUser}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={isDeleteUserOpen} onOpenChange={setIsDeleteUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingUser && (
            <div className="py-4">
              <Alert variant="destructive">
                <AlertDescription>
                  <strong>{deletingUser.username}</strong> ({deletingUser.email}) will be permanently deleted.
                </AlertDescription>
              </Alert>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDeleteUserOpen(false); setDeletingUser(null); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

