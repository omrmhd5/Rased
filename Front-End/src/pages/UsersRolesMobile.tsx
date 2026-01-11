import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { API_URL } from "@/components/MatchDashboard/types";

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

interface UsersRolesMobileProps {
  users: User[];
  currentUserId?: string;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  saving: boolean;
}

export function UsersRolesMobile({
  users,
  currentUserId,
  onEdit,
  onDelete,
  saving,
}: UsersRolesMobileProps) {
  const { leagues, fetchLeagues } = useAuth();
  const { t, isRTL } = useLanguage();

  // Leagues are already fetched by AuthContext when user changes
  // No need to refetch here - AuthContext handles it

  // Get league options from AuthContext (excluding hidden leagues)
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
        label: isRTL && league.arabicName
          ? league.arabicName
          : league.name || league.arabicName || league.league,
        icon: iconUrl,
      };
    });

  return (
    <div className="space-y-3">
      {users.map((user) => {
        const isCurrentUser = (user._id || user.id) === currentUserId;

        return (
          <Card key={user._id || user.id} className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold truncate">
                  {user.username}
                </h3>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {user.email}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(user)}
                  className="h-7 w-7 touch-manipulation"
                  disabled={saving}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(user)}
                  className="h-7 w-7 text-destructive hover:text-destructive touch-manipulation"
                  disabled={saving || isCurrentUser}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Role Badge */}
            <div className="mb-3">
              <p className="text-[10px] text-muted-foreground mb-1.5">{t("usersRoles.role")}</p>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium ${
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
            </div>

            {/* Leagues */}
            {user.role === "employee" &&
              user.leagues &&
              user.leagues.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] text-muted-foreground mb-1.5">
                    {t("usersRoles.leagues")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {user.leagues.map((league) => {
                      const leagueInfo = availableLeagues.find(
                        (l) => l.value === league
                      );
                      return leagueInfo ? (
                        <div key={league} className="flex items-center gap-1">
                          {leagueInfo.icon && (
                            <img
                              src={leagueInfo.icon}
                              alt={leagueInfo.label}
                              className="h-3.5 w-3.5 object-contain flex-shrink-0"
                            />
                          )}
                          <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                            {leagueInfo.label}
                          </span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

            {/* Created Date */}
            <div className="pt-2 border-t border-border/40">
              <p className="text-[9px] text-muted-foreground">
                {t("usersRoles.tableHeaders.created")}:{" "}
                {user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("en-US")
                  : t("whitelistedAccounts.nA")}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
