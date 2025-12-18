import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield, Eye, Clock, Activity, FileText, AlertCircle, CheckCircle2, TrendingUp, Twitter, Youtube, Facebook, Instagram, Zap, RefreshCw, MessageSquare, ExternalLink, Maximize2, Edit, ShieldCheck, MoreHorizontal, Plus, X, ChevronDown, Minimize2, Lock, Copy, FileEdit, Trash2, Link as LinkIcon, Search, BarChart3 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { MatchReport } from "@/components/MatchReport";

// Empty content split data - will be populated from real violations
const getInitialContentSplitData = () => [{
  name: "Live",
  value: 0,
  violations: 0,
  color: "hsl(var(--chart-1))"
}, {
  name: "Highlights",
  value: 0,
  violations: 0,
  color: "hsl(var(--chart-2))"
}];

// Empty activity log - will be populated from real data
const getInitialActivityLog = () => [];

// Empty platform operations - will be populated from real data
const getInitialPlatformOperations = (): PlatformData[] => [
  {
    id: "twitter",
    name: "X/Twitter",
    icon: Twitter,
    color: "hsl(203 89% 53%)",
    totalViolations: 0,
    activeViolations: 0,
    blockedRate: 0,
    blockedCount: 0,
    totalViews: "0",
    avgBlockTime: "0 min",
    blockedSuccess: "0%",
    stillActive: 0,
    violations: []
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: Youtube,
    color: "hsl(0 100% 50%)",
    totalViolations: 0,
    activeViolations: 0,
    blockedRate: 0,
    blockedCount: 0,
    totalViews: "0",
    avgBlockTime: "0 min",
    blockedSuccess: "0%",
    stillActive: 0,
    violations: []
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: Facebook,
    color: "hsl(221 44% 41%)",
    totalViolations: 0,
    activeViolations: 0,
    blockedRate: 0,
    blockedCount: 0,
    totalViews: "0",
    avgBlockTime: "0 min",
    blockedSuccess: "0%",
    stillActive: 0,
    violations: []
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: Activity,
    color: "hsl(0 0% 0%)",
    totalViolations: 0,
    activeViolations: 0,
    blockedRate: 0,
    blockedCount: 0,
    totalViews: "0",
    avgBlockTime: "0 min",
    blockedSuccess: "0%",
    stillActive: 0,
    violations: []
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: Instagram,
    color: "hsl(329 100% 50%)",
    totalViolations: 0,
    activeViolations: 0,
    blockedRate: 0,
    blockedCount: 0,
    totalViews: "0",
    avgBlockTime: "0 min",
    blockedSuccess: "0%",
    stillActive: 0,
    violations: []
  },
];

const formatViews = (views: number) => {
  if (views >= 1000) return `${Math.round(views / 1000)}K`;
  return views.toString();
};

// Calculate blocked count from violations
const calculateBlockedCount = (violations: Violation[]): number => {
  return violations.filter(v => v.status === "blocked" || v.status === "removed").length;
};

// Violation type
type StatusHistoryEntry = {
  status: "reported" | "active" | "blocked" | "removed" | "review" | "pending";
  changedAt: string;
};

type Violation = {
  id: number;
  status: "reported" | "active" | "blocked" | "removed" | "review" | "pending";
  time: string;
  type: "Live" | "Highlights" | "Other";
  views: string;
  addedAgo?: string;
  blockedIn?: string;
  statusBadge: "reported" | "active" | "blocked" | "review" | "pending";
  url: string;
  accountHandle?: string;
  timeAdded: string;
  blockedAt?: string;
  stillActive?: boolean;
  notes?: string;
  statusHistory?: StatusHistoryEntry[];
};

// Platform operations data type
type PlatformData = {
  id: string;
  name: string;
  icon: any;
  color: string;
  totalViolations: number;
  activeViolations: number;
  blockedRate: number;
  blockedCount: number;
  totalViews: string;
  avgBlockTime: string;
  blockedSuccess: string;
  stillActive: number;
  violations: Violation[];
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface Match {
  _id?: string;
  externalMatchId: string;
  description: string;
  team1: string;
  team2: string;
  date: string;
  time: string;
  week: string;
  competition?: string;
  stadium?: string;
  status: "upcoming" | "live" | "finished" | "cancelled" | "postponed";
  league: "saudi" | "italian" | "spanish";
  winner?: "home" | "away" | "draw" | null;
  scores?: {
    home: number;
    away: number;
  } | null;
}

export default function MatchDashboard() {
  const { id } = useParams<{ id: string }>();
  const [logFilter, setLogFilter] = useState<"all" | "violations" | "status" | "notes">("all");
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentSplitData, setContentSplitData] = useState(getInitialContentSplitData());
  const [activityLog, setActivityLog] = useState(getInitialActivityLog());
  
  // Platform operations state
  const [platformOperations, setPlatformOperations] = useState<PlatformData[]>(getInitialPlatformOperations());
  
  // Fetch match data
  useEffect(() => {
    const fetchMatch = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/matches/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch match");
        }
        const matchData = await response.json();
        
        // Format date if needed
        const formattedMatch: Match = {
          ...matchData,
          date: matchData.date
            ? typeof matchData.date === "string"
              ? matchData.date
              : new Date(matchData.date).toISOString().split("T")[0]
            : "",
        };
        
        setMatch(formattedMatch);
        
        // Fetch violations for this match
        const violationsResponse = await fetch(`${API_URL}/violations?matchId=${matchData._id}`);
        if (violationsResponse.ok) {
          const violations = await violationsResponse.json();
          // Process violations and update platform operations
          // This will be implemented to populate real data
        }
      } catch (error) {
        console.error("Error fetching match:", error);
        toast({
          title: "Error",
          description: "Failed to load match data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchMatch();
  }, [id]);
  
  // Platform slot system (max 2 platforms visible)
  const [selectedSlots, setSelectedSlots] = useState<string[]>(["twitter", "youtube"]);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");
  const [platformCardFilter, setPlatformCardFilter] = useState<{[key: string]: string}>({});
  const [platformSearchQuery, setPlatformSearchQuery] = useState<{[key: string]: string}>({});
  
  // Add/Edit violation state
  const [isAddViolationOpen, setIsAddViolationOpen] = useState(false);
  const [selectedPlatformForAdd, setSelectedPlatformForAdd] = useState<string>("");
  const [editingViolation, setEditingViolation] = useState<Violation | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Form state
  const [formUrl, setFormUrl] = useState("");
  const [formAccountHandle, setFormAccountHandle] = useState("");
  const [formContentType, setFormContentType] = useState("live");
  const [formStatus, setFormStatus] = useState<"reported" | "active" | "blocked" | "removed" | "review" | "pending">("reported");
  const [formViews, setFormViews] = useState("");
  const [formTimeAdded, setFormTimeAdded] = useState(new Date().toISOString().slice(0, 16));
  const [formBlockedAt, setFormBlockedAt] = useState("");
  const [formStillActive, setFormStillActive] = useState(false);
  const [formNotes, setFormNotes] = useState("");
  
  // Block confirmation dialog state
  const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);
  const [blockConfirmViolation, setBlockConfirmViolation] = useState<{ platformId: string; violationId: number; violation: Violation } | null>(null);
  const [blockTimeChoice, setBlockTimeChoice] = useState<"current" | "custom">("current");
  const [customBlockTime, setCustomBlockTime] = useState(new Date().toISOString().slice(0, 16));
  
  // Platform comparison state
  const [comparisonMetric, setComparisonMetric] = useState<"violations" | "views" | "blocked" | "response" | "active">("violations");
  const [comparisonSort, setComparisonSort] = useState<"violations" | "views" | "response" | "active">("violations");
  const [comparisonSortDirection, setComparisonSortDirection] = useState<"desc" | "asc">("desc");
  
  // Match report state
  const [isReportOpen, setIsReportOpen] = useState(false);
  
  const filteredLog = activityLog.filter(item => {
    if (logFilter === "all") return true;
    if (logFilter === "violations") return item.type === "violation";
    if (logFilter === "status") return item.type === "status";
    if (logFilter === "notes") return item.type === "note";
    return true;
  });

  // Helper to get icon for event type
  const getEventIcon = (type: string) => {
    switch (type) {
      case "match":
        return Zap;
      case "violation":
        return AlertTriangle;
      case "status":
        return RefreshCw;
      case "note":
        return MessageSquare;
      default:
        return Activity;
    }
  };

  // Helper to calculate block duration based on lastOpenStateAt
  const calculateBlockDuration = (violation: Violation): { duration: number; lastOpenTime: string } | null => {
    if (!violation.blockedAt) return null;
    
    const openStatuses = ['active', 'review', 'reported', 'pending'];
    
    // Find the last status change where violation was in an open state
    const lastOpenEvent = violation.statusHistory
      ?.filter(e => openStatuses.includes(e.status))
      .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime())
      .at(-1);
    
    const startTime = lastOpenEvent?.changedAt ?? violation.timeAdded;
    const durationMs = new Date(violation.blockedAt).getTime() - new Date(startTime).getTime();
    const durationMinutes = durationMs / 60000;
    
    return {
      duration: durationMinutes,
      lastOpenTime: startTime
    };
  };

  // Helper to format the blocked violation text
  const formatBlockedViolationText = (violation: Violation): string => {
    if (!violation.blockedAt) {
      return `${violation.type} • added ${violation.addedAgo}`;
    }

    const blockInfo = calculateBlockDuration(violation);
    
    if (!blockInfo) {
      // Fallback: show simple blocked in text
      return `${violation.type} • blocked in ${violation.blockedIn}`;
    }
    
    // Format times
    const addedTime = new Date(violation.timeAdded).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    const blockedTime = new Date(violation.blockedAt).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    return `${violation.type} • added at ${addedTime} • blocked at ${blockedTime} (in ${blockInfo.duration.toFixed(1)} min)`;
  };

  // Helper to get platform color
  const getPlatformColor = (platform: string | null) => {
    switch (platform) {
      case "Twitter":
        return "hsl(203 89% 53%)";
      case "YouTube":
        return "hsl(0 100% 50%)";
      case "Facebook":
        return "hsl(221 44% 41%)";
      case "TikTok":
        return "hsl(0 0% 0%)";
      case "Instagram":
        return "hsl(329 100% 50%)";
      case "Telegram":
        return "hsl(200 100% 48%)";
      default:
        return "hsl(var(--muted-foreground))";
    }
  };

  // Helper to get platform icon
  const getPlatformIcon = (platformName: string) => {
    const platform = platformOperations.find(p => p.name === platformName);
    if (!platform) return <Activity className="h-3.5 w-3.5" />;
    const IconComponent = platform.icon;
    return <IconComponent className="h-3.5 w-3.5" style={{ color: platform.color }} />;
  };

  // Add platform to slot
  const addPlatformToSlot = (platformId: string) => {
    if (selectedSlots.length < 2) {
      setSelectedSlots([...selectedSlots, platformId]);
    } else {
      // Replace the second slot
      setSelectedSlots([selectedSlots[0], platformId]);
    }
  };

  // Remove platform from slot
  const removePlatformFromSlot = (platformId: string) => {
    setSelectedSlots(selectedSlots.filter(id => id !== platformId));
  };

  // Available platforms (not in slots)
  const availablePlatforms = platformOperations.filter(
    p => !selectedSlots.includes(p.id)
  );

  // Get filtered violations for a platform card
  const getFilteredViolations = (platformId: string, violations: Violation[]) => {
    const cardFilter = platformCardFilter[platformId] || "all";
    const searchQuery = platformSearchQuery[platformId] || "";
    let filtered = violations;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(v => 
        v.url.toLowerCase().includes(query) ||
        (v.accountHandle && v.accountHandle.toLowerCase().includes(query))
      );
    }
    
    // Apply card filter (All/Active/Blocked/Review)
    if (cardFilter !== "all") {
      if (cardFilter === "active") {
        filtered = filtered.filter(v => ["reported", "active", "pending"].includes(v.statusBadge));
      } else {
        filtered = filtered.filter(v => v.statusBadge === cardFilter);
      }
    }
    
    // Apply content type filter
    if (contentTypeFilter !== "all") {
      filtered = filtered.filter(v => v.type.toLowerCase() === contentTypeFilter);
    }
    
    return filtered;
  };
  
  // Open add violation drawer
  const openAddViolationDrawer = (platformId: string) => {
    setSelectedPlatformForAdd(platformId);
    setIsEditMode(false);
    setEditingViolation(null);
    // Reset form
    setFormUrl("");
    setFormAccountHandle("");
    setFormContentType("live");
    setFormStatus("reported");
    setFormViews("");
    setFormTimeAdded(new Date().toISOString().slice(0, 16));
    setFormBlockedAt("");
    setFormStillActive(false);
    setFormNotes("");
    setIsAddViolationOpen(true);
  };
  
  // Open edit violation drawer
  const openEditViolationDrawer = (platformId: string, violation: Violation) => {
    setSelectedPlatformForAdd(platformId);
    setIsEditMode(true);
    setEditingViolation(violation);
    // Pre-fill form
    setFormUrl(violation.url);
    setFormAccountHandle(violation.accountHandle || "");
    setFormContentType(violation.type.toLowerCase());
    setFormStatus(violation.status);
    setFormViews(violation.views.replace("K", "000").replace(".", ""));
    setFormTimeAdded(violation.timeAdded);
    setFormBlockedAt(violation.blockedAt || "");
    setFormStillActive(violation.stillActive || false);
    setFormNotes(violation.notes || "");
    setIsAddViolationOpen(true);
  };
  
  // Toggle violation status (quick block/unblock)
  const toggleViolationStatus = (platformId: string, violationId: number) => {
    const platform = platformOperations.find(p => p.id === platformId);
    if (!platform) return;
    
    const violation = platform.violations.find(v => v.id === violationId);
    if (!violation) return;
    
    const isCurrentlyBlocked = violation.status === "blocked";
    
    if (!isCurrentlyBlocked) {
      // Show confirmation dialog for Active -> Blocked
      setBlockConfirmViolation({ platformId, violationId, violation });
      setBlockTimeChoice("current");
      setCustomBlockTime(new Date().toISOString().slice(0, 16));
      setIsBlockConfirmOpen(true);
    } else {
      // Directly unblock (Blocked -> Active)
      setPlatformOperations(prev => prev.map(p => {
        if (p.id !== platformId) return p;
        
        const updatedViolations = p.violations.map(v => {
          if (v.id !== violationId) return v;
          
          toast({
            title: "Status changed to Active",
            description: "Violation is now active again",
          });
          
          return {
            ...v,
            status: "active" as const,
            statusBadge: "active" as const,
            blockedAt: undefined,
            statusHistory: [
              ...(v.statusHistory || []),
              { status: "active" as const, changedAt: new Date().toISOString() }
            ]
          };
        });
        
        return { 
          ...p, 
          violations: updatedViolations,
          blockedCount: calculateBlockedCount(updatedViolations),
        };
      }));
    }
  };
  
  // Confirm block with chosen time
  const confirmBlock = () => {
    if (!blockConfirmViolation) return;
    
    const { platformId, violationId } = blockConfirmViolation;
    const blockTime = blockTimeChoice === "current" 
      ? new Date().toISOString() 
      : customBlockTime;
    
    setPlatformOperations(prev => prev.map(platform => {
      if (platform.id !== platformId) return platform;
      
      const updatedViolations = platform.violations.map(v => {
        if (v.id !== violationId) return v;
        
        return {
          ...v,
          status: "blocked" as const,
          statusBadge: "blocked" as const,
          blockedAt: blockTime,
        };
      });
      
      return {
        ...platform,
        violations: updatedViolations,
        blockedCount: calculateBlockedCount(updatedViolations),
      };
    }));
    
    toast({
      title: "Violation blocked",
      description: `Violation marked as blocked at ${new Date(blockTime).toLocaleString()}`,
    });
    
    setIsBlockConfirmOpen(false);
    setBlockConfirmViolation(null);
  };
  
  // Save violation (add or edit)
  const saveViolation = () => {
    if (!formUrl) {
      toast({
        title: "Validation Error",
        description: "Violation URL is required",
        variant: "destructive",
      });
      return;
    }
    
    const platform = platformOperations.find(p => p.id === selectedPlatformForAdd);
    if (!platform) return;
    
    if (isEditMode && editingViolation) {
      // Update existing violation
      setPlatformOperations(prev => prev.map(p => {
        if (p.id !== selectedPlatformForAdd) return p;
        
        const updatedViolations = p.violations.map(v => {
          if (v.id !== editingViolation.id) return v;
          
          return {
            ...v,
            url: formUrl,
            accountHandle: formAccountHandle || undefined,
            type: formContentType.charAt(0).toUpperCase() + formContentType.slice(1) as "Live" | "Highlights" | "Other",
            status: formStatus,
            statusBadge: formStatus === "removed" ? "blocked" : formStatus,
            views: formViews ? `${(parseInt(formViews) / 1000).toFixed(1)}K` : v.views,
            timeAdded: formTimeAdded,
            blockedAt: (formStatus === "blocked" || formStatus === "removed") ? formBlockedAt || new Date().toISOString() : undefined,
            stillActive: formStillActive,
            notes: formNotes,
          };
        });
        
        return {
          ...p,
          violations: updatedViolations,
          blockedCount: calculateBlockedCount(updatedViolations),
        };
      }));
      
      toast({
        title: "Violation updated",
        description: "Changes saved successfully",
      });
    } else {
      // Add new violation
      const newViolation: Violation = {
        id: Date.now(),
        url: formUrl,
        accountHandle: formAccountHandle || undefined,
        type: formContentType.charAt(0).toUpperCase() + formContentType.slice(1) as "Live" | "Highlights" | "Other",
        status: formStatus,
        statusBadge: formStatus === "removed" ? "blocked" : formStatus,
        views: formViews ? `${(parseInt(formViews) / 1000).toFixed(1)}K` : "0",
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        addedAgo: "just now",
        timeAdded: formTimeAdded,
        blockedAt: (formStatus === "blocked" || formStatus === "removed") ? formBlockedAt || new Date().toISOString() : undefined,
        stillActive: formStillActive,
        notes: formNotes,
      };
      
      setPlatformOperations(prev => prev.map(p => {
        if (p.id !== selectedPlatformForAdd) return p;
        
        const updatedViolations = [newViolation, ...p.violations];
        
        return {
          ...p,
          violations: updatedViolations,
          totalViolations: p.totalViolations + 1,
          blockedCount: calculateBlockedCount(updatedViolations),
        };
      }));
      
      toast({
        title: "Violation added",
        description: `New violation added to ${platform.name}`,
      });
    }
    
    setIsAddViolationOpen(false);
  };
  
  // Delete violation (UI only)
  const deleteViolation = (platformId: string, violationId: number) => {
    setPlatformOperations(prev => prev.map(p => {
      if (p.id !== platformId) return p;
      
      const updatedViolations = p.violations.filter(v => v.id !== violationId);
      
      return {
        ...p,
        violations: updatedViolations,
        totalViolations: Math.max(0, p.totalViolations - 1),
        blockedCount: calculateBlockedCount(updatedViolations),
      };
    }));
    
    toast({
      title: "Violation deleted",
      description: "Violation removed from the list",
    });
  };
  
  // Copy violation URL
  const copyViolationUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "URL copied",
      description: "Violation URL copied to clipboard",
    });
  };

  // Helper to get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
      case "reported":
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
      case "blocked":
        return <Shield className="h-4 w-4 text-muted-foreground" />;
      case "review":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };
  
  // Calculate KPIs from platform operations
  const totalViolations = platformOperations.reduce((sum, p) => sum + p.totalViolations, 0);
  const totalBlocked = platformOperations.reduce((sum, p) => sum + p.blockedCount, 0);
  const totalActive = platformOperations.reduce((sum, p) => sum + p.stillActive, 0);
  const blockedRate = totalViolations > 0 ? Math.round((totalBlocked / totalViolations) * 100) : 0;
  
  // Calculate total views
  const totalViews = platformOperations.reduce((sum, p) => {
    const viewsNum = parseInt(p.totalViews.replace(/[^0-9]/g, '')) || 0;
    return sum + viewsNum;
  }, 0);
  const formattedTotalViews = totalViews >= 1000 ? `${Math.round(totalViews / 1000)}K` : totalViews.toString();
  
  // Find top platform
  const topPlatform = platformOperations.reduce((top, p) => {
    const pViews = parseInt(p.totalViews.replace(/[^0-9]/g, '')) || 0;
    const topViews = parseInt((top?.totalViews || "0").replace(/[^0-9]/g, '')) || 0;
    return pViews > topViews ? p : top;
  }, platformOperations[0]);
  
  // Calculate average block time
  const allBlockTimes = platformOperations.flatMap(p => 
    p.violations
      .filter(v => v.blockedAt)
      .map(v => {
        const blockInfo = calculateBlockDuration(v);
        return blockInfo ? blockInfo.duration : 0;
      })
  );
  const avgBlockTime = allBlockTimes.length > 0 
    ? (allBlockTimes.reduce((sum, t) => sum + t, 0) / allBlockTimes.length).toFixed(1)
    : "0";
  
  // Format match date and time
  const formatMatchDateTime = () => {
    if (!match) return "";
    const dateStr = match.date;
    const timeStr = match.time || "";
    if (!dateStr) return "";
    
    try {
      const date = new Date(dateStr);
      const formattedDate = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      return timeStr ? `${formattedDate} – ${timeStr}` : formattedDate;
    } catch {
      return dateStr + (timeStr ? ` – ${timeStr}` : "");
    }
  };
  
  // Get competition name
  const getCompetitionName = () => {
    if (!match) return "";
    if (typeof match.competition === "object" && match.competition !== null) {
      return (match.competition as any).name || "";
    }
    return typeof match.competition === "string" ? match.competition : "";
  };
  
  // Get status badge
  const getStatusBadge = () => {
    if (!match) return null;
    const status = match.status;
    if (status === "live") {
      return <Badge variant="destructive" className="text-xs">LIVE</Badge>;
    } else if (status === "finished") {
      return <Badge variant="secondary" className="text-xs">COMPLETED</Badge>;
    } else if (status === "postponed") {
      return <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">POSTPONED</Badge>;
    } else if (status === "cancelled") {
      return <Badge variant="outline" className="text-xs">CANCELLED</Badge>;
    } else {
      return <Badge variant="outline" className="text-xs">UPCOMING</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading match data...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Match not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Match Overview - Single Unified Card */}
      <Card className="p-5">
        {/* Top Row: Title + Date/Status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold mb-1">{match.team1} vs {match.team2}</h1>
            <p className="text-xs text-muted-foreground">
              Week {match.week || "N/A"} • {getCompetitionName() || "N/A"} • {match.stadium || "N/A"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium mb-1.5">{formatMatchDateTime()}</p>
            {getStatusBadge()}
          </div>
        </div>

        {/* Middle Row: Primary KPIs */}
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-2.5 flex-1">
            <div className="p-2 rounded-full bg-chart-1/10 shrink-0">
              <AlertTriangle className="h-3.5 w-3.5 text-chart-1" />
            </div>
            <div>
              <p className="text-xl font-bold leading-none mb-1">{totalViolations}</p>
              <p className="text-xs text-muted-foreground">Total Violations</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">all platforms</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-1">
            <div className="p-2 rounded-full bg-success/10 shrink-0">
              <Shield className="h-3.5 w-3.5 text-success" />
            </div>
            <div>
              <p className="text-xl font-bold leading-none mb-1">{totalBlocked}</p>
              <p className="text-xs text-muted-foreground">Blocked Successfully</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">{blockedRate}% success rate</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-1">
            <div className="p-2 rounded-full bg-destructive/10 shrink-0">
              <Activity className="h-3.5 w-3.5 text-destructive" />
            </div>
            <div>
              <p className="text-xl font-bold leading-none mb-1">{totalActive}</p>
              <p className="text-xs text-muted-foreground">Still Active</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">needs action</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-1">
            <div className="p-2 rounded-full bg-chart-2/10 shrink-0">
              <TrendingUp className="h-3.5 w-3.5 text-chart-2" />
            </div>
            <div>
              <p className="text-xl font-bold leading-none mb-1">{topPlatform ? topPlatform.totalViews : "0"}</p>
              <p className="text-xs text-muted-foreground">Top Platform</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">{topPlatform ? `${topPlatform.name} • biggest source` : "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Bottom Row: Match-Level Performance Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Total Views Tile */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-chart-4/5 to-chart-4/10 border border-chart-4/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Total Views (This Match)</p>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{formattedTotalViews}</p>
            <p className="text-xs text-muted-foreground">Across all platforms</p>
          </div>

          {/* Average Block Time Tile */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-success/5 to-success/10 border border-success/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Avg Block Time (This Match)</p>
              <Badge className="text-xs bg-success/20 text-success border-success/30">
                {parseFloat(avgBlockTime) <= 15 ? "Within target" : "Over target"}
              </Badge>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{avgBlockTime}<span className="text-base text-muted-foreground ml-1">min</span></p>
            <p className="text-xs text-muted-foreground">Target: 15 min SLA</p>
          </div>
        </div>
      </Card>

      {/* Row 3: Content Split & Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Live Stream vs Highlights - Left Card (60-65%) */}
        <Card className="p-6 lg:col-span-3">
          <h3 className="font-semibold mb-6">Live Stream vs Highlights</h3>
          
          <div className="flex items-center justify-center mb-6">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={contentSplitData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                  {contentSplitData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                 <RechartsTooltip formatter={(value: number) => formatViews(value)} contentStyle={{
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{
                backgroundColor: contentSplitData[0].color
              }} />
                <span className="font-medium">Live</span>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{formatViews(contentSplitData[0].value)} views</p>
                <p className="text-xs text-muted-foreground">{contentSplitData[0].violations} violations</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{
                backgroundColor: contentSplitData[1].color
              }} />
                <span className="font-medium">Highlights</span>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{formatViews(contentSplitData[1].value)} views</p>
                <p className="text-xs text-muted-foreground">{contentSplitData[1].violations} violations</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Match Activity Log - Right Card (35-40%) */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold mb-4">Match Activity Log</h3>
          
          {/* Filter Tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <Badge variant={logFilter === "all" ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setLogFilter("all")}>
              All
            </Badge>
            <Badge variant={logFilter === "violations" ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setLogFilter("violations")}>
              Violations
            </Badge>
            <Badge variant={logFilter === "status" ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setLogFilter("status")}>
              Status changes
            </Badge>
            <Badge variant={logFilter === "notes" ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setLogFilter("notes")}>
              Notes
            </Badge>
          </div>

          {/* Log List */}
          <ScrollArea className="h-[320px]">
            <div className="space-y-2">
              {filteredLog.map((item, i) => {
              const EventIcon = getEventIcon(item.type);
              return <div key={i} className="flex items-start gap-2 p-2.5 rounded hover:bg-muted/50 transition-colors group">
                    {/* Icon */}
                    <div className="shrink-0 mt-0.5">
                      <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center">
                        <EventIcon className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                    
                    {/* Time & Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs text-muted-foreground font-mono">{item.time}</p>
                        <Badge variant={item.badgeVariant} className="text-xs">
                          {item.badge}
                        </Badge>
                      </div>
                      <p className="text-xs leading-relaxed">{item.description}</p>
                    </div>

                    {/* Platform Pill */}
                    {item.platform && <div className="shrink-0">
                        <Badge variant="outline" className="text-xs" style={{
                    borderColor: getPlatformColor(item.platform),
                    color: getPlatformColor(item.platform)
                  }}>
                          {item.platform}
                        </Badge>
                      </div>}
                  </div>;
            })}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Block Confirmation Dialog */}
      <Dialog open={isBlockConfirmOpen} onOpenChange={setIsBlockConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm block time</DialogTitle>
            <DialogDescription>
              You are marking this violation as blocked. Choose the exact block time to record for this post.
            </DialogDescription>
          </DialogHeader>
          
          {blockConfirmViolation && (
            <div className="py-3 px-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="text-xs">
                  {platformOperations.find(p => p.id === blockConfirmViolation.platformId)?.name}
                </Badge>
                <span className="text-muted-foreground">•</span>
                <span>{blockConfirmViolation.violation.type}</span>
                <span className="text-muted-foreground">•</span>
                <span className="font-medium">{blockConfirmViolation.violation.views} views</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">added {blockConfirmViolation.violation.addedAgo}</span>
              </div>
            </div>
          )}
          
          <div className="space-y-4 py-4">
            <RadioGroup value={blockTimeChoice} onValueChange={(value) => setBlockTimeChoice(value as "current" | "custom")}>
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setBlockTimeChoice("current")}>
                <RadioGroupItem value="current" id="current" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="current" className="font-medium cursor-pointer">
                    Use current time
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Block time = now
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setBlockTimeChoice("custom")}>
                <RadioGroupItem value="custom" id="custom" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="custom" className="font-medium cursor-pointer">
                    Set custom block time
                  </Label>
                  {blockTimeChoice === "custom" && (
                    <Input 
                      type="datetime-local" 
                      value={customBlockTime}
                      onChange={(e) => setCustomBlockTime(e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>
              </div>
            </RadioGroup>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsBlockConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmBlock}>
              Confirm block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Platform Operations Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Platform Operations (This Match)</h2>
        </div>

        {/* Platform Slot Selector + Content Type Filter */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Platform Slots (Left) */}
          <div className="flex gap-2 items-center">
            <TooltipProvider>
              {selectedSlots.map((platformId) => {
                const platform = platformOperations.find(p => p.id === platformId);
                if (!platform) return null;
                
                return (
                  <Badge 
                    key={platformId} 
                    variant="default" 
                    className="cursor-pointer px-3 py-1.5 flex items-center gap-2"
                  >
                    <platform.icon className="h-3.5 w-3.5" style={{ color: platform.color }} />
                    <span>{platform.name}</span>
                    <X 
                      className="h-3 w-3 ml-1 hover:text-destructive" 
                      onClick={(e) => {
                        e.stopPropagation();
                        removePlatformFromSlot(platformId);
                      }}
                    />
                  </Badge>
                );
              })}
            </TooltipProvider>

            {/* Add Platform Dropdown */}
            {availablePlatforms.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Add platform
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {availablePlatforms.map(platform => (
                    <DropdownMenuItem 
                      key={platform.id}
                      onClick={() => addPlatformToSlot(platform.id)}
                      className="gap-2"
                    >
                      <platform.icon className="h-4 w-4" style={{ color: platform.color }} />
                      {platform.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Content Type Filter (Right) */}
          <div className="flex gap-2">
            <Badge 
              variant={contentTypeFilter === "all" ? "default" : "outline"} 
              className="cursor-pointer text-xs" 
              onClick={() => setContentTypeFilter("all")}
            >
              All types
            </Badge>
            <Badge 
              variant={contentTypeFilter === "live" ? "default" : "outline"} 
              className="cursor-pointer text-xs" 
              onClick={() => setContentTypeFilter("live")}
            >
              Live
            </Badge>
            <Badge 
              variant={contentTypeFilter === "highlights" ? "default" : "outline"} 
              className="cursor-pointer text-xs" 
              onClick={() => setContentTypeFilter("highlights")}
            >
              Highlights
            </Badge>
            <Badge 
              variant={contentTypeFilter === "other" ? "default" : "outline"} 
              className="cursor-pointer text-xs" 
              onClick={() => setContentTypeFilter("other")}
            >
              Other
            </Badge>
          </div>
        </div>

        {/* Platform Cards Grid */}
        {expandedPlatform && (
          <Dialog open={!!expandedPlatform} onOpenChange={() => setExpandedPlatform(null)}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <div className="flex items-center justify-between gap-4">
                  <DialogTitle>
                    {platformOperations.find(p => p.id === expandedPlatform)?.name} - All Violations
                  </DialogTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search URLs or accounts..."
                      value={platformSearchQuery[expandedPlatform] || ""}
                      onChange={(e) =>
                        setPlatformSearchQuery({
                          ...platformSearchQuery,
                          [expandedPlatform]: e.target.value,
                        })
                      }
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                </div>
                <DialogDescription>
                  Viewing all violations for this platform in this match
                </DialogDescription>
              </DialogHeader>
              
              {/* Expanded view content */}
              {(() => {
                const platform = platformOperations.find(p => p.id === expandedPlatform);
                if (!platform) return null;
                
                const filteredViolations = getFilteredViolations(platform.id, platform.violations);
                
                return (
                  <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                    {/* KPI Strip */}
                    <div className="flex items-center justify-between gap-4 py-3 px-4 bg-muted/30 rounded-lg">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Total views</p>
                        <p className="text-sm font-bold">{platform.totalViews}</p>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Avg block time</p>
                        <p className="text-sm font-bold">{platform.avgBlockTime}</p>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Blocked</p>
                        <p className="text-sm font-bold">{platform.blockedCount ?? 0}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">{platform.blockedSuccess} success rate</p>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Still active</p>
                        <p className="text-sm font-bold">{platform.stillActive}</p>
                      </div>
                    </div>
                    
                    {/* Filters */}
                    <div className="flex gap-2">
                      <Badge 
                        variant={platformCardFilter[platform.id] === "all" || !platformCardFilter[platform.id] ? "default" : "outline"} 
                        className="cursor-pointer text-xs" 
                        onClick={() => setPlatformCardFilter({ ...platformCardFilter, [platform.id]: "all" })}
                      >
                        All
                      </Badge>
                      <Badge 
                        variant={platformCardFilter[platform.id] === "active" ? "default" : "outline"} 
                        className="cursor-pointer text-xs" 
                        onClick={() => setPlatformCardFilter({ ...platformCardFilter, [platform.id]: "active" })}
                      >
                        Active
                      </Badge>
                      <Badge 
                        variant={platformCardFilter[platform.id] === "blocked" ? "default" : "outline"} 
                        className="cursor-pointer text-xs" 
                        onClick={() => setPlatformCardFilter({ ...platformCardFilter, [platform.id]: "blocked" })}
                      >
                        Blocked
                      </Badge>
                      <Badge 
                        variant={platformCardFilter[platform.id] === "review" ? "default" : "outline"} 
                        className="cursor-pointer text-xs" 
                        onClick={() => setPlatformCardFilter({ ...platformCardFilter, [platform.id]: "review" })}
                      >
                        Review
                      </Badge>
                    </div>
                    
                    {/* Violations table */}
                    <ScrollArea className="flex-1">
                      <div className="space-y-2 pr-4">
                        {filteredViolations.map(violation => {
                          const truncatedUrl = violation.url.length > 45 ? violation.url.slice(0, 42) + "..." : violation.url;
                          
                          return (
                            <div 
                              key={violation.id} 
                              className="group rounded-md border bg-card p-3 hover:bg-accent/50 transition-colors"
                            >
                              {/* Line 1: Status icon + time + status pill + actions */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="text-muted-foreground">{getStatusIcon(violation.statusBadge)}</div>
                                  <span className="text-xs text-muted-foreground">{violation.time}</span>
                                  <Badge
                                    variant={violation.statusBadge === "blocked" ? "destructive" : violation.statusBadge === "active" || violation.statusBadge === "reported" ? "default" : "secondary"}
                                    className={cn(
                                      "text-xs",
                                      (violation.statusBadge === "active" || violation.statusBadge === "reported") && "bg-success text-success-foreground hover:bg-success/80"
                                    )}
                                  >
                                    {violation.statusBadge}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => window.open(violation.url, "_blank")}
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Open link</TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => openEditViolationDrawer(platform.id, violation)}
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit</TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => toggleViolationStatus(platform.id, violation.id)}
                                      >
                                        <Lock className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {violation.status === "blocked" ? "Mark as active" : "Mark as blocked"}
                                    </TooltipContent>
                                  </Tooltip>

                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7">
                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => copyViolationUrl(violation.url)}>
                                        <Copy className="mr-2 h-4 w-4" />
                                        Copy link
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openEditViolationDrawer(platform.id, violation)}>
                                        <FileEdit className="mr-2 h-4 w-4" />
                                        Add note
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => deleteViolation(platform.id, violation.id)}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                              
                              {/* Line 2: Platform icon + account handle + URL + views */}
                              <div className="flex items-center justify-between gap-2 mt-1.5">
                                <div className="flex items-center gap-2 min-w-0 flex-1 text-xs text-muted-foreground">
                                  <span className="shrink-0">{getPlatformIcon(platform.name)}</span>
                                  {violation.accountHandle && (
                                    <>
                                      <span className="font-medium shrink-0">{violation.accountHandle}</span>
                                      <span className="shrink-0">•</span>
                                    </>
                                  )}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => window.open(violation.url, "_blank")}
                                        className="flex items-center gap-1.5 min-w-0 hover:text-foreground transition-colors rounded px-1.5 py-0.5 hover:bg-accent"
                                      >
                                        <LinkIcon className="h-3 w-3 shrink-0" />
                                        <span className="truncate">{truncatedUrl}</span>
                                        <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>{violation.url}</TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                  <Eye className="h-3.5 w-3.5" />
                                  <span className="font-medium">{violation.views}</span>
                                </div>
                              </div>
                              
                              {/* Line 3: Meta text */}
                              <p className="text-xs text-muted-foreground mt-1">
                                {violation.statusBadge === "blocked" 
                                  ? formatBlockedViolationText(violation)
                                  : `${violation.type} • added ${violation.addedAgo}`
                                }
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                );
              })()}
            </DialogContent>
          </Dialog>
        )}
        
        <div className={expandedPlatform ? "hidden" : "grid grid-cols-1 lg:grid-cols-2 gap-6"}>
          {platformOperations
            .filter(platform => selectedSlots.includes(platform.id))
            .map(platform => {
              console.log(`Platform ${platform.name} blockedCount:`, platform.blockedCount);
              const cardFilter = platformCardFilter[platform.id] || "all";
              const filteredViolations = getFilteredViolations(platform.id, platform.violations);

              return (
                <Card id={`platform-card-${platform.id}`} key={platform.id} className="p-5 transition-all">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <platform.icon className="h-5 w-5" style={{ color: platform.color }} />
                        <h3 className="font-semibold">{platform.name}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {platform.totalViolations} violations • {platform.activeViolations} active • {platform.blockedCount || 0} blocked ({platform.blockedRate}% success)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => setExpandedPlatform(expandedPlatform === platform.id ? null : platform.id)}
                            >
                              <Maximize2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Expand to full width</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button 
                        size="sm" 
                        className="text-xs"
                        onClick={() => openAddViolationDrawer(platform.id)}
                      >
                        <Plus className="h-3 w-3 mr-1.5" />
                        Add violation
                      </Button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between gap-3 mb-4 py-2.5 px-3 bg-muted/30 rounded-lg">
                    <div className="text-center flex-1">
                      <p className="text-xs text-muted-foreground mb-0.5">Total views</p>
                      <p className="text-sm font-bold">{platform.totalViews}</p>
                    </div>
                    <div className="h-6 w-px bg-border" />
                    <div className="text-center flex-1">
                      <p className="text-xs text-muted-foreground mb-0.5">Avg block time</p>
                      <p className="text-sm font-bold">{platform.avgBlockTime}</p>
                    </div>
                    <div className="h-6 w-px bg-border" />
                    <div className="text-center flex-1">
                      <p className="text-xs text-muted-foreground mb-0.5">Blocked</p>
                      <p className="text-sm font-bold">{platform.blockedCount ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">{platform.blockedSuccess} success rate</p>
                    </div>
                    <div className="h-6 w-px bg-border" />
                    <div className="text-center flex-1">
                      <p className="text-xs text-muted-foreground mb-0.5">Still active</p>
                      <p className="text-sm font-bold">{platform.stillActive}</p>
                    </div>
                  </div>

                  {/* Filters and Search */}
                  <div className="space-y-2 mb-3">
                    <div className="flex gap-1">
                      <Badge 
                        variant={cardFilter === "all" ? "default" : "outline"} 
                        className="cursor-pointer text-xs" 
                        onClick={() => setPlatformCardFilter({ ...platformCardFilter, [platform.id]: "all" })}
                      >
                        All
                      </Badge>
                      <Badge 
                        variant={cardFilter === "active" ? "default" : "outline"} 
                        className="cursor-pointer text-xs" 
                        onClick={() => setPlatformCardFilter({ ...platformCardFilter, [platform.id]: "active" })}
                      >
                        Active
                      </Badge>
                      <Badge 
                        variant={cardFilter === "blocked" ? "default" : "outline"} 
                        className="cursor-pointer text-xs" 
                        onClick={() => setPlatformCardFilter({ ...platformCardFilter, [platform.id]: "blocked" })}
                      >
                        Blocked
                      </Badge>
                      <Badge 
                        variant={cardFilter === "review" ? "default" : "outline"} 
                        className="cursor-pointer text-xs" 
                        onClick={() => setPlatformCardFilter({ ...platformCardFilter, [platform.id]: "review" })}
                      >
                        Review
                      </Badge>
                    </div>
                    
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search URLs or accounts..."
                        value={platformSearchQuery[platform.id] || ""}
                        onChange={(e) =>
                          setPlatformSearchQuery({
                            ...platformSearchQuery,
                            [platform.id]: e.target.value,
                          })
                        }
                        className="h-8 pl-8 text-xs"
                      />
                    </div>
                  </div>

                  {/* Violation List */}
                  <ScrollArea className="h-[280px]">
                    {filteredViolations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground mb-4">
                          No violations found matching your filters.
                        </p>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openAddViolationDrawer(platform.id)}
                        >
                          <Plus className="h-3 w-3 mr-1.5" />
                          Add violation
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredViolations.map(violation => {
                          const truncatedUrl = violation.url.length > 45 ? violation.url.slice(0, 42) + "..." : violation.url;
                          
                          return (
                            <div 
                              key={violation.id} 
                              className="group rounded-md border bg-card p-2.5 hover:bg-accent/50 transition-colors"
                            >
                              {/* Line 1: Status icon + time + status pill + actions */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="text-muted-foreground">{getStatusIcon(violation.statusBadge)}</div>
                                  <span className="text-xs text-muted-foreground">{violation.time}</span>
                                  <Badge
                                    variant={violation.statusBadge === "blocked" ? "destructive" : violation.statusBadge === "active" || violation.statusBadge === "reported" ? "default" : "secondary"}
                                    className={cn(
                                      "text-xs",
                                      (violation.statusBadge === "active" || violation.statusBadge === "reported") && "bg-success text-success-foreground hover:bg-success/80"
                                    )}
                                  >
                                    {violation.statusBadge}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => window.open(violation.url, "_blank")}
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Open link</TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => openEditViolationDrawer(platform.id, violation)}
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit</TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => toggleViolationStatus(platform.id, violation.id)}
                                      >
                                        <Lock className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {violation.status === "blocked" ? "Mark as active" : "Mark as blocked"}
                                    </TooltipContent>
                                  </Tooltip>

                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7">
                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => copyViolationUrl(violation.url)}>
                                        <Copy className="mr-2 h-4 w-4" />
                                        Copy link
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openEditViolationDrawer(platform.id, violation)}>
                                        <FileEdit className="mr-2 h-4 w-4" />
                                        Add note
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => deleteViolation(platform.id, violation.id)}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                              
                              {/* Line 2: Platform icon + account handle + URL + views */}
                              <div className="flex items-center justify-between gap-2 mt-1.5">
                                <div className="flex items-center gap-2 min-w-0 flex-1 text-xs text-muted-foreground">
                                  <span className="shrink-0">{getPlatformIcon(platform.name)}</span>
                                  {violation.accountHandle && (
                                    <>
                                      <span className="font-medium shrink-0">{violation.accountHandle}</span>
                                      <span className="shrink-0">•</span>
                                    </>
                                  )}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => window.open(violation.url, "_blank")}
                                        className="flex items-center gap-1.5 min-w-0 hover:text-foreground transition-colors rounded px-1.5 py-0.5 hover:bg-accent"
                                      >
                                        <LinkIcon className="h-3 w-3 shrink-0" />
                                        <span className="truncate">{truncatedUrl}</span>
                                        <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>{violation.url}</TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                  <Eye className="h-3.5 w-3.5" />
                                  <span className="font-medium">{violation.views}</span>
                                </div>
                              </div>
                              
                              {/* Line 3: Meta text */}
                              <p className="text-xs text-muted-foreground mt-1">
                                {violation.statusBadge === "blocked" 
                                  ? formatBlockedViolationText(violation)
                                  : `${violation.type} • added ${violation.addedAgo}`
                                }
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </Card>
              );
            })}
        </div>
      </div>

      {/* Platform Comparison (This Match) */}
      <div className="mt-6">
        <Card className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Platform Comparison (This Match)</h3>
              <p className="text-sm text-muted-foreground">Compare platforms for this match</p>
              <p className="text-xs text-muted-foreground/70 mt-2">
                Metrics respect the current content filter ({contentTypeFilter === "all" ? "All types" : contentTypeFilter === "live" ? "Live" : contentTypeFilter === "highlights" ? "Highlights" : "Other"})
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Report Button */}
              <Button 
                onClick={() => setIsReportOpen(true)} 
                size="sm" 
                variant="default"
                className="gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                تقرير المباراة
              </Button>
              
              {/* Sort dropdown */}
              <Select 
                value={comparisonSort}
                onValueChange={(v: any) => {
                  setComparisonSort(v);
                  // Sync metric tab with sort selection
                  if (v === "violations") setComparisonMetric("violations");
                  else if (v === "views") setComparisonMetric("views");
                  else if (v === "response") setComparisonMetric("response");
                  else if (v === "active") setComparisonMetric("active");
                  setComparisonSortDirection("desc");
                }}
              >
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="violations">Most violations</SelectItem>
                  <SelectItem value="views">Highest views</SelectItem>
                  <SelectItem value="response">Slowest response</SelectItem>
                  <SelectItem value="active">Most active</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="mt-6 border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/30 border-b">
                <tr>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Platform</th>
                  <th 
                    onClick={() => {
                      if (comparisonMetric === "violations") {
                        setComparisonSortDirection(comparisonSortDirection === "desc" ? "asc" : "desc");
                      } else {
                        setComparisonMetric("violations");
                        setComparisonSort("violations");
                        setComparisonSortDirection("desc");
                      }
                    }}
                    className={cn(
                      "text-left text-xs px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none",
                      comparisonMetric === "violations" 
                        ? "font-semibold text-foreground border-b-2 border-primary" 
                        : "font-medium text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      Violations
                      {comparisonMetric === "violations" && (
                        <span className="text-[10px]">{comparisonSortDirection === "desc" ? "↓" : "↑"}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => {
                      if (comparisonMetric === "blocked") {
                        setComparisonSortDirection(comparisonSortDirection === "desc" ? "asc" : "desc");
                      } else {
                        setComparisonMetric("blocked");
                        setComparisonSort("violations");
                        setComparisonSortDirection("desc");
                      }
                    }}
                    className={cn(
                      "text-left text-xs px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none",
                      comparisonMetric === "blocked" 
                        ? "font-semibold text-foreground border-b-2 border-primary" 
                        : "font-medium text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      Blocked
                      {comparisonMetric === "blocked" && (
                        <span className="text-[10px]">{comparisonSortDirection === "desc" ? "↓" : "↑"}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => {
                      if (comparisonMetric === "views") {
                        setComparisonSortDirection(comparisonSortDirection === "desc" ? "asc" : "desc");
                      } else {
                        setComparisonMetric("views");
                        setComparisonSort("views");
                        setComparisonSortDirection("desc");
                      }
                    }}
                    className={cn(
                      "text-left text-xs px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none",
                      comparisonMetric === "views" 
                        ? "font-semibold text-foreground border-b-2 border-primary" 
                        : "font-medium text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      Views
                      {comparisonMetric === "views" && (
                        <span className="text-[10px]">{comparisonSortDirection === "desc" ? "↓" : "↑"}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => {
                      if (comparisonMetric === "active") {
                        setComparisonSortDirection(comparisonSortDirection === "desc" ? "asc" : "desc");
                      } else {
                        setComparisonMetric("active");
                        setComparisonSort("active");
                        setComparisonSortDirection("desc");
                      }
                    }}
                    className={cn(
                      "text-left text-xs px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none",
                      comparisonMetric === "active" 
                        ? "font-semibold text-foreground border-b-2 border-primary" 
                        : "font-medium text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      Still active
                      {comparisonMetric === "active" && (
                        <span className="text-[10px]">{comparisonSortDirection === "desc" ? "↓" : "↑"}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => {
                      if (comparisonMetric === "response") {
                        setComparisonSortDirection(comparisonSortDirection === "desc" ? "asc" : "desc");
                      } else {
                        setComparisonMetric("response");
                        setComparisonSort("response");
                        setComparisonSortDirection("desc");
                      }
                    }}
                    className={cn(
                      "text-left text-xs px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none",
                      comparisonMetric === "response" 
                        ? "font-semibold text-foreground border-b-2 border-primary" 
                        : "font-medium text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      Avg block time
                      {comparisonMetric === "response" && (
                        <span className="text-[10px]">{comparisonSortDirection === "desc" ? "↓" : "↑"}</span>
                      )}
                    </div>
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Calculate metrics per platform respecting contentTypeFilter
                  const platformMetrics = platformOperations.map(platform => {
                    const filteredViolations = contentTypeFilter === "all" 
                      ? platform.violations 
                      : platform.violations.filter(v => v.type.toLowerCase() === contentTypeFilter);
                    
                    const totalViolations = filteredViolations.length;
                    const blockedViolations = filteredViolations.filter(v => v.status === "blocked" || v.status === "removed");
                    const blockedCount = blockedViolations.length;
                    const blockedPercent = totalViolations > 0 ? Math.round((blockedCount / totalViolations) * 100) : 0;
                    
                    const totalViews = filteredViolations.reduce((sum, v) => {
                      const views = parseFloat(v.views.replace('K', '')) * 1000;
                      return sum + views;
                    }, 0);
                    
                    const activeCount = filteredViolations.filter(v => 
                      ["reported", "active", "pending", "review"].includes(v.status)
                    ).length;
                    
                    // Calculate avg block time
                    const avgBlockTimeMinutes = blockedViolations.length > 0
                      ? blockedViolations.reduce((sum, v) => {
                          const blockInfo = calculateBlockDuration(v);
                          return sum + (blockInfo?.duration ?? 0);
                        }, 0) / blockedViolations.length
                      : 0;
                    
                    return {
                      platform,
                      totalViolations,
                      blockedCount,
                      blockedPercent,
                      totalViews,
                      activeCount,
                      avgBlockTimeMinutes,
                    };
                  });

                  // Get max values for progress bars
                  const maxViolations = Math.max(...platformMetrics.map(p => p.totalViolations), 1);
                  const maxViews = Math.max(...platformMetrics.map(p => p.totalViews), 1);
                  const maxBlocked = Math.max(...platformMetrics.map(p => p.blockedCount), 1);
                  const maxResponse = Math.max(...platformMetrics.map(p => p.avgBlockTimeMinutes), 1);
                  const maxActive = Math.max(...platformMetrics.map(p => p.activeCount), 1);

                  // Sort platforms
                  const sortedMetrics = [...platformMetrics].sort((a, b) => {
                    let compareResult = 0;
                    switch (comparisonSort) {
                      case "violations":
                        compareResult = b.totalViolations - a.totalViolations;
                        break;
                      case "views":
                        compareResult = b.totalViews - a.totalViews;
                        break;
                      case "response":
                        compareResult = b.avgBlockTimeMinutes - a.avgBlockTimeMinutes;
                        break;
                      case "active":
                        compareResult = b.activeCount - a.activeCount;
                        break;
                      default:
                        compareResult = 0;
                    }
                    return comparisonSortDirection === "desc" ? compareResult : -compareResult;
                  });

                  // SLA threshold (example: 10 min)
                  const slaThreshold = 10;

                  return sortedMetrics.map((metrics, index) => {
                    const { platform } = metrics;
                    const IconComponent = platform.icon;
                    
                    // Calculate progress percentages
                    const violationsProgress = (metrics.totalViolations / maxViolations) * 100;
                    const viewsProgress = (metrics.totalViews / maxViews) * 100;
                    const blockedProgress = (metrics.blockedCount / maxBlocked) * 100;
                    const responseProgress = (metrics.avgBlockTimeMinutes / maxResponse) * 100;
                    const activeProgress = (metrics.activeCount / maxActive) * 100;

                    // Status pill
                    let statusVariant: "default" | "secondary" | "destructive" = "default";
                    let statusText = "Within target";
                    if (metrics.avgBlockTimeMinutes > slaThreshold * 1.5) {
                      statusVariant = "destructive";
                      statusText = "Slow";
                    } else if (metrics.avgBlockTimeMinutes > slaThreshold) {
                      statusVariant = "secondary";
                      statusText = "Slightly slow";
                    }

                    return (
                      <tr 
                        key={platform.id}
                        onClick={() => {
                          // Update P2 platform selection
                          if (selectedSlots.includes(platform.id)) {
                            // Platform is already visible, just highlight it
                            const element = document.getElementById(`platform-card-${platform.id}`);
                            if (element) {
                              element.scrollIntoView({ behavior: "smooth", block: "center" });
                              element.classList.add("ring-2", "ring-primary", "ring-offset-2");
                              setTimeout(() => {
                                element.classList.remove("ring-2", "ring-primary", "ring-offset-2");
                              }, 2000);
                            }
                          } else {
                            // Platform is not visible: keep left card, replace right card
                            if (selectedSlots.length === 0) {
                              // No platforms visible, add as first
                              setSelectedSlots([platform.id]);
                            } else if (selectedSlots.length === 1) {
                              // One platform visible, add as second
                              setSelectedSlots([selectedSlots[0], platform.id]);
                            } else {
                              // Two platforms visible, replace the right one
                              setSelectedSlots([selectedSlots[0], platform.id]);
                            }
                            
                            // Scroll to the platform operations section
                            setTimeout(() => {
                              const element = document.getElementById(`platform-card-${platform.id}`);
                              if (element) {
                                element.scrollIntoView({ behavior: "smooth", block: "center" });
                                element.classList.add("ring-2", "ring-primary", "ring-offset-2");
                                setTimeout(() => {
                                  element.classList.remove("ring-2", "ring-primary", "ring-offset-2");
                                }, 2000);
                              }
                            }, 100);
                          }
                        }}
                        className="border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        {/* Platform */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4" style={{ color: platform.color }} />
                            <span className="text-sm font-medium">{platform.name}</span>
                          </div>
                        </td>

                        {/* Violations */}
                        <td className="px-4 py-3">
                          <span className={cn(
                            "text-sm",
                            comparisonMetric === "violations" ? "font-semibold" : "font-medium"
                          )}>
                            {metrics.totalViolations}
                          </span>
                        </td>

                        {/* Blocked */}
                        <td className="px-4 py-3">
                          <div>
                            <p className={cn(
                              "text-sm",
                              comparisonMetric === "blocked" ? "font-semibold" : "font-medium"
                            )}>
                              {metrics.blockedCount} blocked
                            </p>
                            <p className="text-xs text-muted-foreground">{metrics.blockedPercent}% success</p>
                          </div>
                        </td>

                        {/* Views */}
                        <td className="px-4 py-3">
                          <span className={cn(
                            "text-sm",
                            comparisonMetric === "views" ? "font-semibold" : "font-medium"
                          )}>
                            {formatViews(metrics.totalViews)}
                          </span>
                        </td>

                        {/* Still active */}
                        <td className="px-4 py-3">
                          <span className={cn(
                            "text-sm",
                            comparisonMetric === "active" ? "font-semibold" : "font-medium"
                          )}>
                            {metrics.activeCount}
                          </span>
                        </td>

                        {/* Avg block time */}
                        <td className="px-4 py-3">
                          <span className={cn(
                            "text-sm",
                            comparisonMetric === "response" ? "font-semibold" : "font-medium"
                          )}>
                            {metrics.avgBlockTimeMinutes.toFixed(1)} min
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <Badge variant={statusVariant} className="text-xs">
                            {statusText}
                          </Badge>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Add/Edit Violation Drawer */}
      <Sheet open={isAddViolationOpen} onOpenChange={setIsAddViolationOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isEditMode ? "Edit Violation" : "Add Violation"}</SheetTitle>
            <SheetDescription>
              {isEditMode ? "Update violation details" : "Add a new violation for this match and platform"}
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-6 py-6">
            {/* Match (Read-only) */}
            <div className="space-y-2">
              <Label>Match</Label>
              <Input value={match ? `${match.team1} vs ${match.team2}` : ""} disabled />
            </div>

            {/* Platform (Read-only) */}
            <div className="space-y-2">
              <Label>Platform</Label>
              <Input 
                value={platformOperations.find(p => p.id === selectedPlatformForAdd)?.name || ""} 
                disabled 
              />
            </div>

            {/* Violation URL */}
            <div className="space-y-2">
              <Label htmlFor="violation-url">Violation URL *</Label>
              <Input 
                id="violation-url" 
                placeholder="https://twitter.com/..." 
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
              />
            </div>

            {/* Account / Channel */}
            <div className="space-y-2">
              <Label htmlFor="account-handle">Account / Channel (optional)</Label>
              <Input 
                id="account-handle" 
                placeholder="@username or channel name" 
                value={formAccountHandle}
                onChange={(e) => setFormAccountHandle(e.target.value)}
              />
            </div>

            {/* Content Type */}
            <div className="space-y-2">
              <Label htmlFor="content-type">Content Type *</Label>
              <Select value={formContentType} onValueChange={setFormContentType}>
                <SelectTrigger id="content-type">
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="highlights">Highlights</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={formStatus} onValueChange={(value: any) => {
                setFormStatus(value);
                // Auto-prefill blockedAt when status changes to blocked/removed
                if ((value === "blocked" || value === "removed") && !formBlockedAt) {
                  setFormBlockedAt(new Date().toISOString().slice(0, 16));
                }
              }}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reported">Reported</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="removed">Removed</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Views (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="views">Views (optional)</Label>
              <Input 
                id="views" 
                type="number" 
                placeholder="0" 
                value={formViews}
                onChange={(e) => setFormViews(e.target.value)}
              />
            </div>

            {/* Time Added */}
            <div className="space-y-2">
              <Label htmlFor="time-added">Time Added *</Label>
              <Input 
                id="time-added" 
                type="datetime-local"
                value={formTimeAdded}
                onChange={(e) => setFormTimeAdded(e.target.value)}
              />
            </div>

            {/* Blocked at (conditional) */}
            {(formStatus === "blocked" || formStatus === "removed") && (
              <div className="space-y-2">
                <Label htmlFor="blocked-at">Blocked at (optional)</Label>
                <Input 
                  id="blocked-at" 
                  type="datetime-local"
                  value={formBlockedAt}
                  onChange={(e) => setFormBlockedAt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty or adjust the auto-filled time
                </p>
              </div>
            )}

            {/* Still active? (conditional) */}
            {formStatus !== "blocked" && formStatus !== "removed" && (
              <div className="flex items-center justify-between space-y-2">
                <div className="space-y-0.5">
                  <Label htmlFor="still-active">Still active?</Label>
                  <p className="text-xs text-muted-foreground">
                    Mark if this violation is currently active
                  </p>
                </div>
                <Switch 
                  id="still-active"
                  checked={formStillActive}
                  onCheckedChange={setFormStillActive}
                />
              </div>
            )}

            {/* Notes (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea 
                id="notes" 
                placeholder="Add operator comments or notes..."
                rows={4}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setIsAddViolationOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveViolation}>
              {isEditMode ? "Save changes" : "Save Violation"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      
      {/* Match Report */}
      <MatchReport
        open={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        matchName={match ? `${match.team1} vs ${match.team2}` : ""}
        week={match ? `Week ${match.week || "N/A"}` : "N/A"}
        competition={match ? getCompetitionName() : "N/A"}
        stadium="Prince Mohammed bin Fahd Stadium"
        date="21 مايو 2026"
        time="20:30"
        status="live"
        matchId={id || "match-1"}
        liveMetrics={platformOperations.map(platform => {
          const liveViolations = platform.violations.filter(v => v.type.toLowerCase() === "live");
          const blockedLive = liveViolations.filter(v => v.status === "blocked" || v.status === "removed");
          const totalViews = liveViolations.reduce((sum, v) => {
            const views = parseFloat(v.views.replace('K', '')) * 1000;
            return sum + views;
          }, 0);
          const avgBlockTime = blockedLive.length > 0
            ? blockedLive.reduce((sum, v) => {
                const blockInfo = calculateBlockDuration(v);
                return sum + (blockInfo?.duration ?? 0);
              }, 0) / blockedLive.length
            : 0;
          
          const platformArabicNames: {[key: string]: string} = {
            "X/Twitter": "تويتر",
            "YouTube": "يوتيوب",
            "Facebook": "فيسبوك",
            "TikTok": "تيك توك",
            "Instagram": "إنستغرام",
            "Telegram": "تيليجرام",
            "IPTV": "IPTV",
            "Websites": "مواقع",
          };
          
          const IconComponent = platform.icon;
          
          return {
            platform: platform.name,
            platformArabic: platformArabicNames[platform.name] || platform.name,
            icon: <IconComponent className="h-4 w-4" style={{ color: platform.color }} />,
            detected: liveViolations.length,
            blocked: blockedLive.length,
            successRate: liveViolations.length > 0 
              ? Math.round((blockedLive.length / liveViolations.length) * 100)
              : 0,
            avgBlockTime,
            views: totalViews,
          };
        })}
        highlightsMetrics={platformOperations.map(platform => {
          const highlightsViolations = platform.violations.filter(v => v.type.toLowerCase() === "highlights");
          const blockedHighlights = highlightsViolations.filter(v => v.status === "blocked" || v.status === "removed");
          const totalViews = highlightsViolations.reduce((sum, v) => {
            const views = parseFloat(v.views.replace('K', '')) * 1000;
            return sum + views;
          }, 0);
          const avgBlockTime = blockedHighlights.length > 0
            ? blockedHighlights.reduce((sum, v) => {
                const blockInfo = calculateBlockDuration(v);
                return sum + (blockInfo?.duration ?? 0);
              }, 0) / blockedHighlights.length
            : 0;
          
          const platformArabicNames: {[key: string]: string} = {
            "X/Twitter": "تويتر",
            "YouTube": "يوتيوب",
            "Facebook": "فيسبوك",
            "TikTok": "تيك توك",
            "Instagram": "إنستغرام",
            "Telegram": "تيليجرام",
            "IPTV": "IPTV",
            "Websites": "مواقع",
          };
          
          const IconComponent = platform.icon;
          
          return {
            platform: platform.name,
            platformArabic: platformArabicNames[platform.name] || platform.name,
            icon: <IconComponent className="h-4 w-4" style={{ color: platform.color }} />,
            detected: highlightsViolations.length,
            blocked: blockedHighlights.length,
            successRate: highlightsViolations.length > 0 
              ? Math.round((blockedHighlights.length / highlightsViolations.length) * 100)
              : 0,
            avgBlockTime,
            views: totalViews,
          };
        })}
      />
    </div>
  );
}
