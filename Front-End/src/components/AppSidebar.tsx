import { Home, Calendar, Users, Settings, BarChart3, AlertTriangle, Shield } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { state } = useSidebar();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const isCollapsed = state === "collapsed";

  const analyticsItems = [
    { titleKey: "sidebar.home", url: "/", icon: Home },
    { titleKey: "sidebar.dashboard", url: "/dashboard", icon: BarChart3 },
    { titleKey: "sidebar.problematicAccounts", url: "/problematic-accounts", icon: AlertTriangle },
    { titleKey: "sidebar.whitelistedAccounts", url: "/whitelisted-accounts", icon: Shield },
  ];

  const operationsItems = [
    { titleKey: "sidebar.matches", url: "/matches", icon: Calendar },
  ];

  const managementItems = [
    ...(user?.role === "superAdmin" 
      ? [
          { titleKey: "sidebar.usersRoles", url: "/users", icon: Users },
          { titleKey: "sidebar.settings", url: "/settings", icon: Settings },
        ]
      : []),
  ];

  return (
    <Sidebar side={isRTL ? "right" : "left"} className={`${isRTL ? "border-l" : "border-r"} border-sidebar-border z-50`}>
      <SidebarContent className={`pt-4 ${isRTL ? "text-right" : "text-left"}`}>
        <SidebarGroup>
          <SidebarGroupLabel className={`text-xs font-semibold text-muted-foreground px-3 mb-2 ${isRTL ? "text-right" : "text-left"}`}>
            {t("sidebar.analytics")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticsItems.map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={`flex items-center ${isRTL ? "justify-end" : "justify-start"} gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors w-full`}
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      {isRTL ? (
                        <>
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          {!isCollapsed && <span className="text-right flex-1">{t(item.titleKey)}</span>}
                        </>
                      ) : (
                        <>
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          {!isCollapsed && <span className="text-left">{t(item.titleKey)}</span>}
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className={`text-xs font-semibold text-muted-foreground px-3 mb-2 ${isRTL ? "text-right" : "text-left"}`}>
            {t("sidebar.operations")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationsItems.map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={`flex items-center ${isRTL ? "justify-end" : "justify-start"} gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors w-full`}
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      {isRTL ? (
                        <>
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          {!isCollapsed && <span className="text-right flex-1">{t(item.titleKey)}</span>}
                        </>
                      ) : (
                        <>
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          {!isCollapsed && <span className="text-left">{t(item.titleKey)}</span>}
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {managementItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className={`text-xs font-semibold text-muted-foreground px-3 mb-2 ${isRTL ? "text-right" : "text-left"}`}>
              {t("sidebar.management")}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementItems.map((item) => (
                  <SidebarMenuItem key={item.titleKey}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={`flex items-center ${isRTL ? "justify-end" : "justify-start"} gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors w-full`}
                        activeClassName="bg-primary/10 text-primary font-medium"
                      >
                        {isRTL ? (
                          <>
                            <item.icon className="h-5 w-5 flex-shrink-0" />
                            {!isCollapsed && <span className="text-right flex-1">{t(item.titleKey)}</span>}
                          </>
                        ) : (
                          <>
                            <item.icon className="h-5 w-5 flex-shrink-0" />
                            {!isCollapsed && <span className="text-left">{t(item.titleKey)}</span>}
                          </>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
