import {
  Menu,
  Search,
  User,
  ArrowLeft,
  ArrowRight,
  LogOut,
  Moon,
  Sun,
  Globe,
  Loader2,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "next-themes";
import { useEffect, useState, useRef, useCallback } from "react";

interface SearchMatch {
  id: string;
  description: string;
  team1: string;
  team2: string;
  date: string;
  time: string;
  week: string;
  stage: string;
  status: string;
  league: string;
}

export function TopBar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { language, setLanguage, isRTL, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Debounced search function
  const performSearch = useCallback(
    async (query: string) => {
      if (!query || query.trim().length < 2) {
        setSearchResults([]);
        setIsSearchOpen(false);
        return;
      }

      const selectedLeague = localStorage.getItem("selectedLeague");
      if (!selectedLeague) {
        setSearchResults([]);
        setIsSearchOpen(false);
        return;
      }

      setIsSearching(true);
      setIsSearchOpen(true);

      try {
        const response = await fetch(
          `${API_URL}/matches/search?query=${encodeURIComponent(
            query.trim()
          )}&league=${encodeURIComponent(selectedLeague)}`,
          {
            credentials: "include", // Use cookie-based authentication
          }
        );

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        console.error("Error searching matches:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [API_URL]
  );

  // Handle search input change with debouncing
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300); // 300ms debounce
  };

  // Handle match selection
  const handleMatchSelect = (matchId: string) => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchOpen(false);
    navigate(`/match/${matchId}`);
  };

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('[role="dialog"]')
      ) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const isDarkMode = theme === "dark";

  return (
    <header className="sticky top-0 h-14 sm:h-16 bg-card border-b border-border z-40 flex items-center px-2 sm:px-3 md:px-4 lg:px-6 gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 w-full">
      {/* Back Button & Menu Toggle */}
      <div className="flex items-center flex-shrink-0 gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 sm:h-9 sm:w-9 touch-manipulation"
          onClick={() => navigate(-1)}
          aria-label={t("topBar.goBack")}>
          {isRTL ? (
            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
          ) : (
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          )}
          <span className="sr-only">{t("topBar.goBack")}</span>
        </Button>
        <SidebarTrigger className="h-8 w-8 sm:h-9 sm:w-9 touch-manipulation">
          <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
        </SidebarTrigger>
      </div>

      {/* Logo & Brand Name - Behind the menu */}
      <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-7 h-7 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center overflow-hidden">
            <img
              src="/Logo.png"
              alt="Rased Logo"
              className="w-full h-full object-contain p-1"
            />
          </div>
          <span className="font-semibold text-sm sm:text-base lg:text-lg hidden xs:inline">
            Rased
          </span>
        </div>
      </div>

      {/* Search Bar - Responsive */}
      <div className="flex-1 max-w-none sm:max-w-xs md:max-w-md lg:max-w-xl mx-1 sm:mx-2 relative">
        <Popover
          open={
            isSearchOpen &&
            (searchResults.length > 0 ||
              (searchQuery.trim().length >= 2 && !isSearching))
          }
          onOpenChange={setIsSearchOpen}
          modal={false}>
          <PopoverTrigger asChild>
            <div
              className="relative w-full"
              onMouseDown={(e) => {
                // Prevent PopoverTrigger from stealing focus
                if (
                  e.target === searchInputRef.current ||
                  searchInputRef.current?.contains(e.target as Node)
                ) {
                  e.preventDefault();
                  searchInputRef.current?.focus();
                }
              }}>
              <Search
                className={`absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground pointer-events-none ${
                  isRTL ? "right-2.5 sm:right-3" : "left-2.5 sm:left-3"
                }`}
              />
              {isSearching && (
                <Loader2
                  className={`absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground animate-spin pointer-events-none ${
                    isRTL ? "left-2.5 sm:left-3" : "right-2.5 sm:right-3"
                  }`}
                />
              )}
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => {
                  if (
                    searchResults.length > 0 ||
                    (searchQuery.trim().length >= 2 && !isSearching)
                  ) {
                    setIsSearchOpen(true);
                  }
                }}
                placeholder={t("topBar.search")}
                className={`${isRTL ? "pr-8 sm:pr-10" : "pl-8 sm:pl-10"} ${
                  isSearching ? (isRTL ? "pl-8 sm:pl-10" : "pr-8 sm:pr-10") : ""
                } rounded-full bg-muted/50 border-muted h-8 sm:h-9 text-xs sm:text-sm w-full`}
              />
            </div>
          </PopoverTrigger>
          <PopoverContent
            className={`w-[var(--radix-popover-trigger-width)] p-0 ${
              isRTL ? "text-right" : "text-left"
            }`}
            align="start"
            side="bottom"
            sideOffset={4}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => {
              // Return focus to input when popover closes
              e.preventDefault();
              searchInputRef.current?.focus();
            }}>
            <div className="max-h-[300px] overflow-y-auto">
              {isSearching ? (
                <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                  {t("topBar.searching")}
                </div>
              ) : searchResults.length > 0 ? (
                <div className="py-1">
                  {searchResults.map((match) => (
                    <button
                      key={match.id}
                      onClick={() => handleMatchSelect(match.id)}
                      className={`w-full px-4 py-2 hover:bg-accent transition-colors ${
                        isRTL ? "text-right" : "text-left"
                      }`}>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium truncate">
                          {match.description}
                        </span>
                        <div
                          className={`flex items-center gap-2 text-xs text-muted-foreground ${
                            isRTL ? "flex-row-reverse" : ""
                          }`}>
                          {match.date && (
                            <span>
                              {new Date(match.date).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )}
                            </span>
                          )}
                          {match.time && <span>• {match.time}</span>}
                          {match.week && <span>• Week {match.week}</span>}
                          {match.stage && <span>• {match.stage}</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.trim().length >= 2 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                  {t("topBar.noResults")}
                </div>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Action Buttons - Fixed and Aligned */}
      <div
        className={`flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0 ${
          isRTL ? "mr-auto" : "ml-auto"
        }`}>
        {/* Language Selector */}
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
          <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground hidden xs:block" />
          <Select
            value={language}
            onValueChange={(value) => setLanguage(value as "en" | "ar")}>
            <SelectTrigger className="w-[65px] sm:w-[70px] md:w-[80px] h-8 sm:h-9 text-xs sm:text-sm touch-manipulation">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en" className="text-sm">
                EN
              </SelectItem>
              <SelectItem value="ar" className="text-sm">
                AR
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Dark Mode Toggle - Icon Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (mounted) {
              setTheme(isDarkMode ? "light" : "dark");
            }
          }}
          aria-label={
            mounted && isDarkMode
              ? t("topBar.switchToLightMode")
              : t("topBar.switchToDarkMode")
          }
          className="h-8 w-8 sm:h-9 sm:w-9 touch-manipulation">
          {mounted && isDarkMode ? (
            <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          ) : (
            <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-10 sm:w-10 p-0 touch-manipulation"
              aria-label={t("topBar.userMenu")}>
              <div className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 rounded-full bg-primary flex items-center justify-center">
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-primary-foreground" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align={isRTL ? "start" : "end"}
            className="w-48 sm:w-56">
            <DropdownMenuLabel>
              <div
                className={`flex flex-col space-y-1 ${
                  isRTL ? "text-right" : "text-left"
                }`}>
                <p className="text-sm font-medium leading-none truncate">
                  {user?.username || t("topBar.user")}
                </p>
                <p className="text-xs leading-none text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="cursor-pointer touch-manipulation flex items-center justify-start">
              {isRTL ? (
                <>
                  <span className="text-sm">{t("topBar.logout")}</span>
                  <LogOut className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  <span className="text-sm">{t("topBar.logout")}</span>
                  <LogOut className="mr-2 h-4 w-4" />
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
