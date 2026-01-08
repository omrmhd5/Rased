import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Users, Plus, Edit2, Trash2, Save, Loader2, AlertTriangle } from "lucide-react";
import { API_URL } from "@/components/MatchDashboard/types";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { UsersRolesMobile } from "./UsersRolesMobile";

type League = "saudi" | "saudi-super-cup" | "spanish-super-cup";

interface User {
  id: string;
  _id?: string;
  username: string;
  email: string;
  role: "superAdmin" | "viewer" | "employee";
  leagues?: League[];
  createdAt?: string;
  updatedAt?: string;
}

export default function UsersRoles() {
  const { user: currentUser, leagues, fetchLeagues } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Refetch leagues when component mounts
  useEffect(() => {
    if (currentUser?.role === "superAdmin") {
      fetchLeagues();
    }
  }, [currentUser, fetchLeagues]);
  
  // Dialog states
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isDeleteUserOpen, setIsDeleteUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  
  // Form states
  const [formUsername, setFormUsername] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formOldPassword, setFormOldPassword] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formConfirmPassword, setFormConfirmPassword] = useState("");
  const [formRole, setFormRole] = useState<"superAdmin" | "viewer" | "employee">("employee");
  const [formLeagues, setFormLeagues] = useState<League[]>([]);
  const [formError, setFormError] = useState("");

  // Get league options from AuthContext
  const availableLeagues: { value: League; label: string; icon: string }[] = (leagues || [])
    .filter((l) => !l.isHidden)
    .map((league) => {
      const iconUrl = league.iconUrl
        ? league.iconUrl.startsWith("/")
          ? `${API_URL.replace("/api", "")}${league.iconUrl}`
          : league.iconUrl
        : "";
      return {
        value: league.league as League,
        label: league.name || league.arabicName || league.league,
        icon: iconUrl,
      };
    });

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

  // Fetch users
  useEffect(() => {
    if (currentUser?.role === "superAdmin") {
      fetchUsers();
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/users`, {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Access denied. SuperAdmin only.");
        }
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load users.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormUsername("");
    setFormEmail("");
    setFormOldPassword("");
    setFormPassword("");
    setFormConfirmPassword("");
    setFormRole("employee");
    setFormLeagues([]);
    setFormError("");
  };

  // Add user
  const handleAddUser = async () => {
    setFormError("");
    
    if (!formUsername.trim() || !formEmail.trim() || !formPassword.trim() || !formConfirmPassword.trim()) {
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

    if (formPassword !== formConfirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    // Validate leagues for employees
    if (formRole === "employee") {
      if (formLeagues.length === 0) {
        setFormError("Employees must have at least one league assigned.");
        return;
      }
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: formUsername.trim(),
          email: formEmail.trim(),
          password: formPassword,
          confirmPassword: formConfirmPassword,
          role: formRole,
          leagues: formRole === "employee" ? formLeagues : [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to add user");
      }

      await fetchUsers();
      resetForm();
      setIsAddUserOpen(false);
      toast({
        title: "Success",
        description: `User "${formUsername.trim()}" has been added successfully.`,
      });
    } catch (error) {
      console.error("Error adding user:", error);
      setFormError(error instanceof Error ? error.message : "Failed to add user");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add user",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Edit user
  const handleEditUser = async () => {
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

    // Validate leagues for employees
    if (formRole === "employee") {
      if (formLeagues.length === 0) {
        setFormError("Employees must have at least one league assigned.");
        return;
      }
    }

    // If password is provided, require old password
    if (formPassword) {
      if (!formOldPassword) {
        setFormError("Old password is required to change password.");
        return;
      }
      if (formPassword.length < 6) {
        setFormError("Password must be at least 6 characters.");
        return;
      }
      if (formPassword !== formConfirmPassword) {
        setFormError("Passwords do not match.");
        return;
      }
    }

    setSaving(true);
    try {
      const userId = editingUser._id || editingUser.id;
      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: formUsername.trim(),
          email: formEmail.trim(),
          oldPassword: formPassword ? formOldPassword : undefined,
          password: formPassword || undefined,
          confirmPassword: formPassword ? formConfirmPassword : undefined,
          role: editingUser?.role === "superAdmin" ? "superAdmin" : formRole,
          leagues: formRole === "employee" ? formLeagues : [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update user");
      }

      await fetchUsers();
      resetForm();
      setIsEditUserOpen(false);
      setEditingUser(null);
      toast({
        title: "Success",
        description: `User "${formUsername.trim()}" has been updated successfully.`,
      });
    } catch (error) {
      console.error("Error updating user:", error);
      setFormError(error instanceof Error ? error.message : "Failed to update user");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    setSaving(true);
    try {
      const userId = deletingUser._id || deletingUser.id;
      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete user");
      }

      await fetchUsers();
      setIsDeleteUserOpen(false);
      setDeletingUser(null);
      toast({
        title: "Success",
        description: `User "${deletingUser.username}" has been deleted.`,
        variant: "destructive",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormUsername(user.username);
    setFormEmail(user.email);
    setFormOldPassword("");
    setFormPassword("");
    setFormConfirmPassword("");
    setFormRole(user.role);
    setFormLeagues(user.leagues || []);
    setFormError("");
    setIsEditUserOpen(true);
  };

  // Handle league toggle
  const handleLeagueToggle = (league: League) => {
    if (formLeagues.includes(league)) {
      setFormLeagues(formLeagues.filter((l) => l !== league));
    } else {
      setFormLeagues([...formLeagues, league]);
    }
  };

  // Open delete dialog
  const openDeleteDialog = (user: User) => {
    setDeletingUser(user);
    setIsDeleteUserOpen(true);
  };

  // Don't render if not superAdmin
  if (!currentUser || currentUser.role !== "superAdmin") {
    return null;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
          Users & Roles
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
          Manage user accounts and roles (SuperAdmin only)
        </p>
      </div>

      {/* User Management Card */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-lg sm:text-xl">User Management</CardTitle>
            </div>
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => resetForm()} className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  <span className="hidden xs:inline">Add User</span>
                  <span className="xs:hidden">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">Add New User</DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    Create a new user account. All fields are required.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
                  {formError && (
                    <Alert variant="destructive">
                      <AlertDescription>{formError}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="add-username" className="text-xs sm:text-sm">Username</Label>
                    <Input
                      id="add-username"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      placeholder="Enter username"
                      disabled={saving}
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-email" className="text-xs sm:text-sm">Email</Label>
                    <Input
                      id="add-email"
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="Enter email"
                      disabled={saving}
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-password" className="text-xs sm:text-sm">Password</Label>
                    <Input
                      id="add-password"
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Enter password (min 6 characters)"
                      disabled={saving}
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-confirm-password" className="text-xs sm:text-sm">Confirm Password</Label>
                    <Input
                      id="add-confirm-password"
                      type="password"
                      value={formConfirmPassword}
                      onChange={(e) => setFormConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      disabled={saving}
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-role" className="text-xs sm:text-sm">Role</Label>
                    <Select
                      value={formRole}
                      onValueChange={(value: "viewer" | "employee") => {
                        setFormRole(value as "viewer" | "employee");
                        if (value !== "employee") {
                          setFormLeagues([]);
                        }
                      }}
                      disabled={saving}>
                      <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer" className="text-xs sm:text-sm">Viewer</SelectItem>
                        <SelectItem value="employee" className="text-xs sm:text-sm">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      SuperAdmin role cannot be assigned to new users
                    </p>
                  </div>
                  {formRole === "employee" && (
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Leagues (Select at least one)</Label>
                      <div className="space-y-2 sm:space-y-3 border rounded-md p-3 sm:p-4">
                        {availableLeagues.map((league) => (
                          <div key={league.value} className="flex items-center space-x-2 sm:space-x-3">
                            <Checkbox
                              id={`add-league-${league.value}`}
                              checked={formLeagues.includes(league.value)}
                              onCheckedChange={() => handleLeagueToggle(league.value)}
                              disabled={saving}
                              className="touch-manipulation"
                            />
                            <label
                              htmlFor={`add-league-${league.value}`}
                              className="flex items-center gap-2 cursor-pointer flex-1 text-xs sm:text-sm">
                              <img
                                src={league.icon}
                                alt={league.label}
                                className="h-4 w-4 sm:h-5 sm:w-5 object-contain flex-shrink-0"
                              />
                              <span className="font-medium">{league.label}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                      {formLeagues.length === 0 && (
                        <p className="text-[10px] sm:text-xs text-destructive">
                          At least one league must be selected for employees
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => { setIsAddUserOpen(false); resetForm(); }} disabled={saving} className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                    Cancel
                  </Button>
                  <Button onClick={handleAddUser} disabled={saving} className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                    {saving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        Add User
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <CardDescription className="text-xs sm:text-sm">
            Manage user accounts and assign roles
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-muted-foreground mr-2" />
              <span className="text-xs sm:text-sm text-muted-foreground">
                Loading users...
              </span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-muted-foreground">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-xs sm:text-sm">No users found. Add your first user to get started.</p>
            </div>
          ) : (
            <>
              {/* Mobile Version */}
              <div className="md:hidden">
                <UsersRolesMobile
                  users={users}
                  currentUserId={currentUser?.id}
                  onEdit={openEditDialog}
                  onDelete={openDeleteDialog}
                  saving={saving}
                />
              </div>

              {/* Desktop Version */}
              <div className="hidden md:block rounded-md border overflow-x-auto">
                <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Leagues</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user._id || user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === "superAdmin"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                            : user.role === "viewer"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                        }`}>
                          {user.role === "superAdmin" ? "Super Admin" : user.role === "viewer" ? "Viewer" : "Employee"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.role === "employee" && user.leagues && user.leagues.length > 0 ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            {user.leagues.map((league) => {
                              const leagueInfo = availableLeagues.find((l) => l.value === league);
                              return leagueInfo ? (
                                <div key={league} className="flex items-center gap-1">
                                  <img
                                    src={leagueInfo.icon}
                                    alt={leagueInfo.label}
                                    className="h-4 w-4 object-contain"
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {leagueInfo.label}
                                  </span>
                                </div>
                              ) : null;
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(user)}
                            className="h-8 w-8"
                            disabled={saving}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(user)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            disabled={saving || (user._id || user.id) === currentUser?.id}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Edit User</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Update user information. To change password, enter old password first. {editingUser?.role === "superAdmin" && "SuperAdmin role cannot be changed."}
              </DialogDescription>
            </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-username" className="text-xs sm:text-sm">Username</Label>
              <Input
                id="edit-username"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                placeholder="Enter username"
                disabled={saving}
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email" className="text-xs sm:text-sm">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="Enter email"
                disabled={saving}
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password" className="text-xs sm:text-sm">New Password (Optional)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="Leave empty to keep current password"
                disabled={saving}
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            {formPassword && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-old-password" className="text-xs sm:text-sm">Old Password *</Label>
                  <Input
                    id="edit-old-password"
                    type="password"
                    value={formOldPassword}
                    onChange={(e) => setFormOldPassword(e.target.value)}
                    placeholder="Enter old password"
                    disabled={saving}
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-confirm-password" className="text-xs sm:text-sm">Confirm New Password *</Label>
                  <Input
                    id="edit-confirm-password"
                    type="password"
                    value={formConfirmPassword}
                    onChange={(e) => setFormConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    disabled={saving}
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-role" className="text-xs sm:text-sm">Role</Label>
              <Select
                value={formRole}
                onValueChange={(value: "viewer" | "employee") => {
                  setFormRole(value as "viewer" | "employee");
                  if (value !== "employee") {
                    setFormLeagues([]);
                  }
                }}
                disabled={saving || editingUser?.role === "superAdmin"}>
                <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer" className="text-xs sm:text-sm">Viewer</SelectItem>
                  <SelectItem value="employee" className="text-xs sm:text-sm">Employee</SelectItem>
                </SelectContent>
              </Select>
              {editingUser?.role === "superAdmin" && (
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  SuperAdmin role cannot be changed
                </p>
              )}
              {editingUser?.role !== "superAdmin" && (
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  SuperAdmin role cannot be assigned
                </p>
              )}
            </div>
            {formRole === "employee" && (
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Leagues (Select at least one)</Label>
                <div className="space-y-2 sm:space-y-3 border rounded-md p-3 sm:p-4">
                  {availableLeagues.map((league) => (
                    <div key={league.value} className="flex items-center space-x-2 sm:space-x-3">
                      <Checkbox
                        id={`edit-league-${league.value}`}
                        checked={formLeagues.includes(league.value)}
                        onCheckedChange={() => handleLeagueToggle(league.value)}
                        disabled={saving}
                        className="touch-manipulation"
                      />
                      <label
                        htmlFor={`edit-league-${league.value}`}
                        className="flex items-center gap-2 cursor-pointer flex-1 text-xs sm:text-sm">
                        <img
                          src={league.icon}
                          alt={league.label}
                          className="h-4 w-4 sm:h-5 sm:w-5 object-contain flex-shrink-0"
                        />
                        <span className="font-medium">{league.label}</span>
                      </label>
                    </div>
                  ))}
                </div>
                {formLeagues.length === 0 && (
                  <p className="text-[10px] sm:text-xs text-destructive">
                    At least one league must be selected for employees
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setIsEditUserOpen(false); resetForm(); setEditingUser(null); }} disabled={saving} className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
              Cancel
            </Button>
            <Button onClick={handleEditUser} disabled={saving} className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
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

      {/* Delete User Dialog */}
      <Dialog open={isDeleteUserOpen} onOpenChange={setIsDeleteUserOpen}>
        <DialogContent className="w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Delete User</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingUser && (
            <div className="py-3 sm:py-4">
              <Alert variant="destructive">
                <AlertDescription className="text-xs sm:text-sm">
                  <strong>{deletingUser.username}</strong> ({deletingUser.email}) will be permanently deleted.
                </AlertDescription>
              </Alert>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setIsDeleteUserOpen(false); setDeletingUser(null); }} disabled={saving} className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={saving} className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  Delete User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

