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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Save,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { API_URL } from "@/components/MatchDashboard/types";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { UsersRolesMobile } from "./UsersRolesMobile";

type League = string;

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
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Leagues are already fetched by AuthContext when user changes
  // No need to refetch here - AuthContext handles it

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
  const [formRole, setFormRole] = useState<
    "superAdmin" | "viewer" | "employee"
  >("employee");
  const [formLeagues, setFormLeagues] = useState<League[]>([]);
  const [formError, setFormError] = useState("");

  // Get league options from AuthContext
  const availableLeagues: { value: League; label: string; icon: string }[] = (
    leagues || []
  )
    .filter((l) => !l.isHidden)
    .map((league) => {
      const iconUrl = league.iconUrl
        ? league.iconUrl.startsWith("/")
          ? `${API_URL.replace("/api", "")}${league.iconUrl}`
          : league.iconUrl
        : "";
      return {
        value: league.league as League,
        label:
          isRTL && league.arabicName
            ? league.arabicName
            : league.name || league.arabicName || league.league,
        icon: iconUrl,
      };
    });

  // Check if user is superAdmin
  useEffect(() => {
    if (!currentUser || currentUser.role !== "superAdmin") {
      toast({
        title: t("usersRoles.accessDenied"),
        description: t("usersRoles.onlySuperAdmin"),
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
        title: t("usersRoles.error.failedToLoad"),
        description:
          error instanceof Error
            ? error.message
            : t("usersRoles.error.failedToLoad"),
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

    if (
      !formUsername.trim() ||
      !formEmail.trim() ||
      !formPassword.trim() ||
      !formConfirmPassword.trim()
    ) {
      setFormError(t("usersRoles.error.allFieldsRequired"));
      return;
    }

    if (formUsername.length < 3) {
      setFormError(t("usersRoles.error.usernameMinLength"));
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(formEmail)) {
      setFormError(t("usersRoles.error.invalidEmail"));
      return;
    }

    if (formPassword.length < 6) {
      setFormError(t("usersRoles.error.passwordMinLength"));
      return;
    }

    if (formPassword !== formConfirmPassword) {
      setFormError(t("usersRoles.error.passwordsNotMatch"));
      return;
    }

    // Validate leagues for employees
    if (formRole === "employee") {
      if (formLeagues.length === 0) {
        setFormError(t("usersRoles.error.employeesNeedLeague"));
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
        title: t("usersRoles.success.title"),
        description: t("usersRoles.success.userAdded", {
          username: formUsername.trim(),
        }),
      });
    } catch (error) {
      console.error("Error adding user:", error);
      setFormError(
        error instanceof Error ? error.message : "Failed to add user"
      );
      toast({
        title: t("usersRoles.error.failedToAdd"),
        description:
          error instanceof Error
            ? error.message
            : t("usersRoles.error.failedToAdd"),
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
      setFormError(t("usersRoles.error.usernameEmailRequired"));
      return;
    }

    if (formUsername.length < 3) {
      setFormError(t("usersRoles.error.usernameMinLength"));
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(formEmail)) {
      setFormError(t("usersRoles.error.invalidEmail"));
      return;
    }

    // Validate leagues for employees
    if (formRole === "employee") {
      if (formLeagues.length === 0) {
        setFormError(t("usersRoles.error.employeesNeedLeague"));
        return;
      }
    }

    // If password is provided, require old password
    if (formPassword) {
      if (!formOldPassword) {
        setFormError(t("usersRoles.error.oldPasswordRequired"));
        return;
      }
      if (formPassword.length < 6) {
        setFormError(t("usersRoles.error.passwordMinLength"));
        return;
      }
      if (formPassword !== formConfirmPassword) {
        setFormError(t("usersRoles.error.passwordsNotMatch"));
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
        title: t("usersRoles.success.title"),
        description: t("usersRoles.success.userUpdated", {
          username: formUsername.trim(),
        }),
      });
    } catch (error) {
      console.error("Error updating user:", error);
      setFormError(
        error instanceof Error ? error.message : "Failed to update user"
      );
      toast({
        title: t("usersRoles.error.failedToUpdate"),
        description:
          error instanceof Error
            ? error.message
            : t("usersRoles.error.failedToUpdate"),
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
        title: t("usersRoles.success.title"),
        description: t("usersRoles.success.userDeleted", {
          username: deletingUser.username,
        }),
        variant: "destructive",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: t("usersRoles.error.failedToDelete"),
        description:
          error instanceof Error
            ? error.message
            : t("usersRoles.error.failedToDelete"),
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
          {t("usersRoles.title")}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
          {t("usersRoles.subtitle")}
        </p>
      </div>

      {/* User Management Card */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-lg sm:text-xl">
                {t("usersRoles.userManagement")}
              </CardTitle>
            </div>
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  onClick={() => resetForm()}
                  className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  <span className="hidden xs:inline">
                    {t("usersRoles.addUser")}
                  </span>
                  <span className="xs:hidden">{t("usersRoles.add")}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">
                    {t("usersRoles.addNewUser")}
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    {t("usersRoles.createNewUser")}
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
                      htmlFor="add-username"
                      className="text-xs sm:text-sm">
                      {t("usersRoles.username")}
                    </Label>
                    <Input
                      id="add-username"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      placeholder={t("usersRoles.enterUsername")}
                      disabled={saving}
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-email" className="text-xs sm:text-sm">
                      {t("usersRoles.email")}
                    </Label>
                    <Input
                      id="add-email"
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder={t("usersRoles.enterEmail")}
                      disabled={saving}
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="add-password"
                      className="text-xs sm:text-sm">
                      {t("usersRoles.password")}
                    </Label>
                    <Input
                      id="add-password"
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder={t("usersRoles.enterPassword")}
                      disabled={saving}
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="add-confirm-password"
                      className="text-xs sm:text-sm">
                      {t("usersRoles.confirmPassword")}
                    </Label>
                    <Input
                      id="add-confirm-password"
                      type="password"
                      value={formConfirmPassword}
                      onChange={(e) => setFormConfirmPassword(e.target.value)}
                      placeholder={t("usersRoles.confirmPasswordPlaceholder")}
                      disabled={saving}
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-role" className="text-xs sm:text-sm">
                      {t("usersRoles.role")}
                    </Label>
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
                        <SelectValue placeholder={t("usersRoles.selectRole")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value="viewer"
                          className="text-xs sm:text-sm">
                          {t("usersRoles.roles.viewer")}
                        </SelectItem>
                        <SelectItem
                          value="employee"
                          className="text-xs sm:text-sm">
                          {t("usersRoles.roles.employee")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {t("usersRoles.superAdminCannotAssign")}
                    </p>
                  </div>
                  {formRole === "employee" && (
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">
                        {t("usersRoles.selectAtLeastOne")}
                      </Label>
                      <div className="space-y-2 sm:space-y-3 border rounded-md p-3 sm:p-4">
                        {availableLeagues.map((league) => (
                          <div
                            key={league.value}
                            className="flex items-center space-x-2 sm:space-x-3">
                            <Checkbox
                              id={`add-league-${league.value}`}
                              checked={formLeagues.includes(league.value)}
                              onCheckedChange={() =>
                                handleLeagueToggle(league.value)
                              }
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
                              <span className="font-medium">
                                {league.label}
                              </span>
                            </label>
                          </div>
                        ))}
                      </div>
                      {formLeagues.length === 0 && (
                        <p className="text-[10px] sm:text-xs text-destructive">
                          {t("usersRoles.atLeastOneLeague")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddUserOpen(false);
                      resetForm();
                    }}
                    disabled={saving}
                    className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                    {t("usersRoles.cancel")}
                  </Button>
                  <Button
                    onClick={handleAddUser}
                    disabled={saving}
                    className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                    {saving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                        {t("usersRoles.adding")}
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        {t("usersRoles.addUser")}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <CardDescription className="text-xs sm:text-sm">
            {t("usersRoles.manageAccounts")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-muted-foreground mr-2" />
              <span className="text-xs sm:text-sm text-muted-foreground">
                {t("usersRoles.loadingUsers")}
              </span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-muted-foreground">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-xs sm:text-sm">
                {t("usersRoles.noUsersFound")}
              </p>
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
                      <TableHead>
                        {t("usersRoles.tableHeaders.username")}
                      </TableHead>
                      <TableHead>
                        {t("usersRoles.tableHeaders.email")}
                      </TableHead>
                      <TableHead>{t("usersRoles.tableHeaders.role")}</TableHead>
                      <TableHead>
                        {t("usersRoles.tableHeaders.leagues")}
                      </TableHead>
                      <TableHead>
                        {t("usersRoles.tableHeaders.created")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("usersRoles.tableHeaders.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user._id || user.id}>
                        <TableCell className="font-medium">
                          {user.username}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              user.role === "superAdmin"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                : user.role === "viewer"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                            }`}>
                            {user.role === "superAdmin"
                              ? t("usersRoles.roles.superAdmin")
                              : user.role === "viewer"
                              ? t("usersRoles.roles.viewer")
                              : t("usersRoles.roles.employee")}
                          </span>
                        </TableCell>
                        <TableCell>
                          {user.role === "employee" &&
                          user.leagues &&
                          user.leagues.length > 0 ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              {user.leagues.map((league) => {
                                const leagueInfo = availableLeagues.find(
                                  (l) => l.value === league
                                );
                                return leagueInfo ? (
                                  <div
                                    key={league}
                                    className="flex items-center gap-1">
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
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString(
                                "en-US"
                              )
                            : t("whitelistedAccounts.nA")}
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
                              disabled={
                                saving ||
                                (user._id || user.id) === currentUser?.id
                              }>
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
            <DialogTitle className="text-lg sm:text-xl">
              {t("usersRoles.editUser")}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t("usersRoles.updateUserInfo")}{" "}
              {editingUser?.role === "superAdmin" &&
                t("usersRoles.superAdminCannotChange")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-username" className="text-xs sm:text-sm">
                {t("usersRoles.username")}
              </Label>
              <Input
                id="edit-username"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                placeholder={t("usersRoles.enterUsername")}
                disabled={saving}
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email" className="text-xs sm:text-sm">
                {t("usersRoles.email")}
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder={t("usersRoles.enterEmail")}
                disabled={saving}
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password" className="text-xs sm:text-sm">
                {t("usersRoles.newPassword")}
              </Label>
              <Input
                id="edit-password"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder={t("usersRoles.leaveEmptyPassword")}
                disabled={saving}
                className="h-9 sm:h-10 text-sm"
              />
            </div>
            {formPassword && (
              <>
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-old-password"
                    className="text-xs sm:text-sm">
                    {t("usersRoles.oldPassword")} *
                  </Label>
                  <Input
                    id="edit-old-password"
                    type="password"
                    value={formOldPassword}
                    onChange={(e) => setFormOldPassword(e.target.value)}
                    placeholder={t("usersRoles.enterOldPassword")}
                    disabled={saving}
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-confirm-password"
                    className="text-xs sm:text-sm">
                    {t("usersRoles.confirmNewPassword")} *
                  </Label>
                  <Input
                    id="edit-confirm-password"
                    type="password"
                    value={formConfirmPassword}
                    onChange={(e) => setFormConfirmPassword(e.target.value)}
                    placeholder={t("usersRoles.confirmNewPassword")}
                    disabled={saving}
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-role" className="text-xs sm:text-sm">
                {t("usersRoles.role")}
              </Label>
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
                  <SelectValue placeholder={t("usersRoles.selectRole")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer" className="text-xs sm:text-sm">
                    {t("usersRoles.roles.viewer")}
                  </SelectItem>
                  <SelectItem value="employee" className="text-xs sm:text-sm">
                    {t("usersRoles.roles.employee")}
                  </SelectItem>
                </SelectContent>
              </Select>
              {editingUser?.role === "superAdmin" && (
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {t("usersRoles.superAdminCannotChangeEdit")}
                </p>
              )}
              {editingUser?.role !== "superAdmin" && (
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {t("usersRoles.superAdminCannotAssignEdit")}
                </p>
              )}
            </div>
            {formRole === "employee" && (
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">
                  {t("usersRoles.selectAtLeastOne")}
                </Label>
                <div className="space-y-2 sm:space-y-3 border rounded-md p-3 sm:p-4">
                  {availableLeagues.map((league) => (
                    <div
                      key={league.value}
                      className="flex items-center space-x-2 sm:space-x-3">
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
                    {t("usersRoles.atLeastOneLeague")}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditUserOpen(false);
                resetForm();
                setEditingUser(null);
              }}
              disabled={saving}
              className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
              {t("usersRoles.cancel")}
            </Button>
            <Button
              onClick={handleEditUser}
              disabled={saving}
              className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                  {t("usersRoles.saving")}
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  {t("usersRoles.saveChanges")}
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
            <DialogTitle className="text-lg sm:text-xl">
              {t("usersRoles.deleteUser")}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t("usersRoles.deleteConfirm")}
            </DialogDescription>
          </DialogHeader>
          {deletingUser && (
            <div className="py-3 sm:py-4">
              <Alert variant="destructive">
                <AlertDescription className="text-xs sm:text-sm">
                  {t("usersRoles.willBeDeleted", {
                    username: deletingUser.username,
                    email: deletingUser.email,
                  })}
                </AlertDescription>
              </Alert>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteUserOpen(false);
                setDeletingUser(null);
              }}
              disabled={saving}
              className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
              {t("usersRoles.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={saving}
              className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                  {t("usersRoles.deleting")}
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  {t("usersRoles.deleteUser")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
