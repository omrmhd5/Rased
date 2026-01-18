import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { ThemeProvider } from "next-themes";
import ProtectedRoute from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Matches from "./pages/Matches";
import MatchDashboard from "./pages/MatchDashboard";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import ProblematicAccounts from "./pages/ProblematicAccounts";
import WhitelistedAccounts from "./pages/WhitelistedAccounts";
import UsersRoles from "./pages/UsersRoles";
import { useUserLeaguesListener } from "@/hooks/useUserLeaguesListener";

const queryClient = new QueryClient();

// Component for routes that require authentication and sidebar
const AuthenticatedLayout = () => {
  const { isRTL } = useLanguage();

  // Listen for user leagues updates (admin changing user's leagues)
  useUserLeaguesListener();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div
          className={`flex-1 flex flex-col ${isRTL ? "mr-0" : "ml-0"}`}
          style={{ minWidth: 0 }}>
          <TopBar />
          <main
            className="flex-1 p-4 sm:p-6 bg-background overflow-x-hidden"
            style={{ width: "100%", maxWidth: "100%" }}>
            <div className="max-w-7xl mx-auto">
              <Routes>
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Home />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/matches"
                  element={
                    <ProtectedRoute>
                      <Matches />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/match/:id"
                  element={
                    <ProtectedRoute>
                      <MatchDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/problematic-accounts"
                  element={
                    <ProtectedRoute>
                      <ProblematicAccounts />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/whitelisted-accounts"
                  element={
                    <ProtectedRoute>
                      <WhitelistedAccounts />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute>
                      <UsersRoles />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />

                {/* Protected routes with sidebar */}
                <Route path="/*" element={<AuthenticatedLayout />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
