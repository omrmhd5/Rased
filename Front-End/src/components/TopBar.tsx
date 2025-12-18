import { Menu, Search, CheckSquare, Grid3x3, Bell, ShoppingCart, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
export function TopBar() {
  return <header className="sticky top-0 h-16 bg-card border-b border-border z-40 flex items-center px-3 sm:px-4 lg:px-6 gap-2 sm:gap-4 w-full">
      {/* Menu Toggle - First, always visible */}
      <div className="flex items-center flex-shrink-0">
        <SidebarTrigger>
          <Menu className="h-5 w-5" />
        </SidebarTrigger>
      </div>

      {/* Logo & Brand Name - Behind the menu */}
      <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">R</span>
          </div>
          <span className="font-semibold text-base sm:text-lg hidden sm:inline">Rased</span>
        </div>
      </div>

      {/* Search Bar - Responsive */}
      <div className="flex-1 max-w-xs sm:max-w-md lg:max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-10 rounded-full bg-muted/50 border-muted h-9 text-sm w-full" />
        </div>
      </div>

      {/* Action Buttons - Fixed and Aligned */}
      <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
        <Button variant="ghost" size="icon" className="relative hidden md:inline-flex h-10 w-10">
          <CheckSquare className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="hidden md:inline-flex h-10 w-10">
          <Grid3x3 className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="relative h-10 w-10">
          <Bell className="h-5 w-5" />
          <Badge className="absolute top-0 right-0 h-5 w-5 flex items-center justify-center p-0 bg-destructive text-destructive-foreground text-[10px] font-semibold border-2 border-card">
            3
          </Badge>
        </Button>
        
        <Button variant="ghost" size="icon" className="h-10 w-10 p-0">
          <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
            <User className="h-5 w-5 text-primary-foreground" />
          </div>
        </Button>
      </div>
    </header>;
}