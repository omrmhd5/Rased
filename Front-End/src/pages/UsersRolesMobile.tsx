import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";

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

interface UsersRolesMobileProps {
  users: User[];
  currentUserId?: string;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  saving: boolean;
}

const availableLeagues: { value: League; label: string; icon: string }[] = [
  { value: "saudi", label: "Saudi Pro League", icon: "/icons/Saudi_League.svg" },
  { value: "saudi-super-cup", label: "Saudi Super Cup", icon: "/icons/Saudi_Cup.png" },
  { value: "spanish-super-cup", label: "Spanish Super Cup", icon: "/icons/Spanish_Cup.svg" },
];

export function UsersRolesMobile({
  users,
  currentUserId,
  onEdit,
  onDelete,
  saving,
}: UsersRolesMobileProps) {
  return (
    <div className="space-y-3">
      {users.map((user) => {
        const isCurrentUser = (user._id || user.id) === currentUserId;

        return (
          <Card key={user._id || user.id} className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold truncate">{user.username}</h3>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
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
              <p className="text-[10px] text-muted-foreground mb-1.5">Role</p>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium ${
                  user.role === "superAdmin"
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                    : user.role === "viewer"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                }`}>
                {user.role === "superAdmin" ? "Super Admin" : user.role === "viewer" ? "Viewer" : "Employee"}
              </span>
            </div>

            {/* Leagues */}
            {user.role === "employee" && user.leagues && user.leagues.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] text-muted-foreground mb-1.5">Leagues</p>
                <div className="flex flex-wrap gap-1.5">
                  {user.leagues.map((league) => {
                    const leagueInfo = availableLeagues.find((l) => l.value === league);
                    return leagueInfo ? (
                      <div key={league} className="flex items-center gap-1">
                        <img
                          src={leagueInfo.icon}
                          alt={leagueInfo.label}
                          className="h-3.5 w-3.5 object-contain flex-shrink-0"
                        />
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
                Created: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

