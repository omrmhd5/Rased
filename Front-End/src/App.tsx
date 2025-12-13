import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import Dashboard from "./pages/Dashboard";
import Matches from "./pages/Matches";
import MatchDashboard from "./pages/MatchDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <div className="flex-1 flex flex-col">
              <TopBar />
              <main className="flex-1 p-4 sm:p-6 bg-background overflow-x-hidden">
                <div className="max-w-7xl mx-auto">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/matches" element={<Matches />} />
                    <Route path="/match/:id" element={<MatchDashboard />} />
                    <Route path="/reports" element={<Dashboard />} />
                    <Route path="/users" element={<Dashboard />} />
                    <Route path="/settings" element={<Dashboard />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </div>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
