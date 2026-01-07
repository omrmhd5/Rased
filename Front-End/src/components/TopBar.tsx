import { Menu, Search, User, ArrowLeft, LogOut, Moon, Sun, Globe } from "lucide-react";
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
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

export function TopBar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState("en");

  return <header className="sticky top-0 h-14 sm:h-16 bg-card border-b border-border z-40 flex items-center px-2 sm:px-3 md:px-4 lg:px-6 gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 w-full">
      {/* Back Button & Menu Toggle */}
      <div className="flex items-center flex-shrink-0 gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 touch-manipulation"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="sr-only">Go back</span>
          </Button>
          <SidebarTrigger className="h-8 w-8 sm:h-9 sm:w-9 touch-manipulation">
            <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
          </SidebarTrigger>
        </div>

      {/* Logo & Brand Name - Behind the menu */}
      <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm sm:text-base lg:text-lg">R</span>
          </div>
          <span className="font-semibold text-sm sm:text-base lg:text-lg hidden xs:inline">Rased</span>
        </div>
      </div>

      {/* Search Bar - Responsive */}
      <div className="flex-1 max-w-none sm:max-w-xs md:max-w-md lg:max-w-xl mx-1 sm:mx-2">
        <div className="relative">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground pointer-events-none" />
          <Input 
            placeholder="Search..." 
            className="pl-8 sm:pl-10 pr-3 rounded-full bg-muted/50 border-muted h-8 sm:h-9 text-xs sm:text-sm w-full" 
          />
        </div>
      </div>

      {/* Action Buttons - Fixed and Aligned */}
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0 ml-auto">
        {/* Language Selector */}
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
          <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground hidden xs:block" />
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-[65px] sm:w-[70px] md:w-[80px] h-8 sm:h-9 text-xs sm:text-sm touch-manipulation">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en" className="text-sm">EN</SelectItem>
              <SelectItem value="ar" className="text-sm">AR</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Dark Mode Toggle - Icon Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDarkMode(!darkMode)}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          className="h-8 w-8 sm:h-9 sm:w-9 touch-manipulation"
        >
          {darkMode ? (
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
          aria-label="User menu"
        >
          <div className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 rounded-full bg-primary flex items-center justify-center">
            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-primary-foreground" />
          </div>
        </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 sm:w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none truncate">{user?.username || "User"}</p>
                <p className="text-xs leading-none text-muted-foreground truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="cursor-pointer touch-manipulation">
              <LogOut className="mr-2 h-4 w-4" />
              <span className="text-sm">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>;
}