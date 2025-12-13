import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  ExternalLink, 
  Edit, 
  Shield, 
  LayoutDashboard, 
  Clock, 
  Eye, 
  AlertTriangle,
  Link,
  ChevronLeft,
  ChevronRight,
  Radio,
  X,
  Calendar,
  RotateCcw,
  CheckCircle2
} from "lucide-react";
import { mockViolations, mockMatches, Violation } from "@/data/mockData";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// Platform configurations
const platforms = [
  { id: 'twitter', name: 'X/Twitter', icon: '𝕏', color: 'hsl(var(--platform-twitter))' },
  { id: 'youtube', name: 'YouTube', icon: '▶', color: 'hsl(var(--platform-youtube))' },
  { id: 'facebook', name: 'Facebook', icon: 'f', color: 'hsl(var(--platform-facebook))' },
  { id: 'tiktok', name: 'TikTok', icon: '♪', color: 'hsl(var(--platform-tiktok))' },
  { id: 'instagram', name: 'Instagram', icon: '◐', color: 'hsl(var(--platform-instagram))' },
  { id: 'telegram', name: 'Telegram', icon: '✈', color: 'hsl(var(--platform-telegram))' },
  { id: 'iptv', name: 'IPTV', icon: '📺', color: 'hsl(var(--platform-iptv))' },
  { id: 'website', name: 'Websites', icon: '🌐', color: 'hsl(var(--platform-website))' },
  { id: 'other', name: 'Other', icon: '•', color: 'hsl(var(--muted-foreground))' },
];

const getPlatformInfo = (platformId: string) => {
  return platforms.find(p => p.id === platformId) || platforms[platforms.length - 1];
};

const statusConfig: Record<string, { label: string; colorClass: string }> = {
  active: { label: 'Active', colorClass: 'bg-destructive text-destructive-foreground' },
  blocked: { label: 'Blocked', colorClass: 'bg-success text-success-foreground' },
  review: { label: 'Review', colorClass: 'bg-primary/10 text-primary border border-primary/30' },
  reported: { label: 'Reported', colorClass: 'bg-warning/20 text-warning-foreground border border-warning/30' },
  removed: { label: 'Removed', colorClass: 'bg-muted text-muted-foreground' },
  other: { label: 'Other', colorClass: 'bg-muted text-muted-foreground' },
};

const formatViews = (views: number): string => {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return views.toString();
};

const formatTimeAgo = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

// Sort mode tabs
const sortModes = [
  { id: 'violations', label: 'Violations', sortField: 'status' },
  { id: 'views', label: 'Views', sortField: 'views' },
  { id: 'blocked', label: 'Blocked', sortField: 'blocked' },
  { id: 'response', label: 'Response time', sortField: 'response' },
  { id: 'active', label: 'Active', sortField: 'active' },
];

// Date filter options
const dateOptions = [
  { value: 'today', label: 'Today' },
  { value: '24h', label: 'Last 24 hours' },
  { value: 'match', label: 'Match window' },
  { value: 'week', label: 'This week' },
  { value: 'custom', label: 'Custom…' },
];

const quickDatePresets = [
  { value: '2h', label: 'Last 2 hours' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '12h', label: 'Last 12 hours' },
];

export default function Lab() {
  const navigate = useNavigate();
  
  // Filter states
  const [matchFilter, setMatchFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("today");
  const [customDateLabel, setCustomDateLabel] = useState<string>("");
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  // Sort mode
  const [activeSortMode, setActiveSortMode] = useState<string>("violations");
  
  // Drawer states
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  
  // Quick add form states
  const [formMatch, setFormMatch] = useState<string>("");
  const [formPlatform, setFormPlatform] = useState<string>("");
  const [formUrl, setFormUrl] = useState<string>("");
  const [formContentType, setFormContentType] = useState<string>("live");
  const [formStatus, setFormStatus] = useState<string>("reported");
  const [formViews, setFormViews] = useState<string>("");
  const [formCustomCategory, setFormCustomCategory] = useState<string>("");
  const [formOtherPlatformName, setFormOtherPlatformName] = useState<string>("");
  const [formBlockTime, setFormBlockTime] = useState<string>("");
  const [formBlockTimeOption, setFormBlockTimeOption] = useState<'now' | 'custom'>('now');
  
  // Block confirmation dialog
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [blockTimeOption, setBlockTimeOption] = useState<'now' | 'custom'>('now');
  const [customBlockTime, setCustomBlockTime] = useState<string>("");
  const [pendingBlockViolationId, setPendingBlockViolationId] = useState<number | null>(null);
  
  // Violations with local state for demo
  const [violations, setViolations] = useState<Violation[]>(mockViolations);
  
  // Loading state for demo
  const [isLoading, setIsLoading] = useState(false);
  
  // Get selected match name for header
  const selectedMatch = matchFilter !== "all" && matchFilter !== "other" 
    ? mockMatches.find(m => m.id.toString() === matchFilter) 
    : null;
  
  // Stats for header
  const activeCount = violations.filter(v => v.status === 'active').length;
  const blockedCount = violations.filter(v => v.status === 'blocked').length;
  const avgBlockTime = useMemo(() => {
    const blockedViolations = violations.filter(v => v.minutesToBlock);
    if (blockedViolations.length === 0) return 0;
    return (blockedViolations.reduce((sum, v) => sum + (v.minutesToBlock || 0), 0) / blockedViolations.length).toFixed(1);
  }, [violations]);
  
  const liveMatches = mockMatches.filter(m => m.status === 'live');
  
  // Filter violations
  const filteredViolations = useMemo(() => {
    return violations.filter(v => {
      if (matchFilter !== "all") {
        if (matchFilter === "other" && v.matchId !== undefined) return false;
        if (matchFilter !== "other" && v.matchId?.toString() !== matchFilter) return false;
      }
      if (platformFilter !== "all" && v.platform !== platformFilter) return false;
      if (contentTypeFilter !== "all" && v.contentType !== contentTypeFilter) return false;
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      return true;
    });
  }, [violations, matchFilter, platformFilter, contentTypeFilter, statusFilter]);
  
  // Sort violations based on active sort mode
  const sortedViolations = useMemo(() => {
    return [...filteredViolations].sort((a, b) => {
      switch (activeSortMode) {
        case 'views':
          return b.views - a.views;
        case 'blocked':
          const aBlocked = a.status === 'blocked' ? 0 : 1;
          const bBlocked = b.status === 'blocked' ? 0 : 1;
          if (aBlocked !== bBlocked) return aBlocked - bBlocked;
          return b.views - a.views;
        case 'response':
          const aTime = a.minutesToBlock || 999;
          const bTime = b.minutesToBlock || 999;
          return aTime - bTime;
        case 'active':
          const aActive = a.status === 'active' ? 0 : 1;
          const bActive = b.status === 'active' ? 0 : 1;
          if (aActive !== bActive) return aActive - bActive;
          return b.views - a.views;
        case 'violations':
        default:
          const statusOrder: Record<string, number> = { active: 0, reported: 1, review: 2, blocked: 3, removed: 4 };
          const aOrder = statusOrder[a.status] ?? 5;
          const bOrder = statusOrder[b.status] ?? 5;
          if (aOrder !== bOrder) return aOrder - bOrder;
          if (a.views !== b.views) return b.views - a.views;
          return new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime();
      }
    });
  }, [filteredViolations, activeSortMode]);
  
  // Paginated violations
  const totalViolations = sortedViolations.length;
  const totalPages = Math.ceil(totalViolations / pageSize);
  const paginatedViolations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedViolations.slice(start, start + pageSize);
  }, [sortedViolations, currentPage, pageSize]);
  
  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [matchFilter, platformFilter, contentTypeFilter, statusFilter, activeSortMode]);
  
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  const handlePageSizeChange = (size: string) => {
    setPageSize(parseInt(size));
    setCurrentPage(1);
  };
  
  const handleCreateViolation = () => {
    if (!formUrl.trim()) {
      toast.error("Please enter a violation URL");
      return;
    }
    
    const newViolation: Violation = {
      id: Date.now(),
      platform: formPlatform || 'other',
      account: '@new_account',
      postId: `post_${Date.now()}`,
      status: formStatus as Violation['status'],
      views: parseInt(formViews) || 0,
      contentType: formContentType as Violation['contentType'],
      reportedAt: new Date().toISOString(),
      priority: 'medium',
      slaBreached: false,
      matchId: formMatch && formMatch !== 'other' ? parseInt(formMatch) : undefined,
      url: formUrl,
      blockedAt: formStatus === 'blocked' 
        ? (formBlockTimeOption === 'now' ? new Date().toISOString() : formBlockTime)
        : undefined,
      minutesToBlock: formStatus === 'blocked' ? 0 : undefined,
    };
    
    setViolations(prev => [newViolation, ...prev]);
    toast.success("Violation created successfully");
    
    // Reset form and close drawer
    resetQuickAddForm();
    setIsQuickAddOpen(false);
  };
  
  const resetQuickAddForm = () => {
    setFormUrl("");
    setFormViews("");
    setFormMatch("");
    setFormPlatform("");
    setFormContentType("live");
    setFormStatus("reported");
    setFormCustomCategory("");
    setFormOtherPlatformName("");
    setFormBlockTime("");
    setFormBlockTimeOption('now');
  };
  
  const handleRowClick = (violation: Violation) => {
    setSelectedViolation(violation);
    setIsDetailsPanelOpen(true);
  };
  
  const handleQuickBlock = (violation: Violation, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingBlockViolationId(violation.id);
    setSelectedViolation(violation);
    setIsBlockDialogOpen(true);
  };
  
  const handleStatusChange = (newStatus: string) => {
    if (!selectedViolation) return;
    
    if (newStatus === 'blocked' && selectedViolation.status !== 'blocked') {
      setIsBlockDialogOpen(true);
      return;
    }
    
    updateViolationStatus(selectedViolation.id, newStatus);
  };
  
  const updateViolationStatus = (violationId: number, newStatus: string, blockedAt?: string) => {
    setViolations(prev => prev.map(v => {
      if (v.id === violationId) {
        return {
          ...v,
          status: newStatus as Violation['status'],
          blockedAt: newStatus === 'blocked' ? (blockedAt || new Date().toISOString()) : undefined,
          minutesToBlock: newStatus === 'blocked' 
            ? Math.round((new Date(blockedAt || new Date()).getTime() - new Date(v.reportedAt).getTime()) / 60000)
            : undefined,
        };
      }
      return v;
    }));
    
    if (selectedViolation?.id === violationId) {
      setSelectedViolation(prev => prev ? {
        ...prev,
        status: newStatus as Violation['status'],
        blockedAt: newStatus === 'blocked' ? (blockedAt || new Date().toISOString()) : undefined,
      } : null);
    }
    
    toast.success(`Status updated to ${newStatus}`);
  };
  
  const confirmBlock = () => {
    const blockedAt = blockTimeOption === 'now' ? new Date().toISOString() : customBlockTime;
    const violationId = pendingBlockViolationId || selectedViolation?.id;
    if (violationId) {
      updateViolationStatus(violationId, 'blocked', blockedAt);
    }
    setIsBlockDialogOpen(false);
    setBlockTimeOption('now');
    setCustomBlockTime("");
    setPendingBlockViolationId(null);
  };
  
  const clearFilters = () => {
    setMatchFilter("all");
    setPlatformFilter("all");
    setContentTypeFilter("all");
    setStatusFilter("all");
    setDateFilter("today");
    setCustomDateLabel("");
    setCurrentPage(1);
  };
  
  const hasActiveFilters = matchFilter !== "all" || platformFilter !== "all" || contentTypeFilter !== "all" || statusFilter !== "all";

  const openQuickAdd = () => {
    if (matchFilter !== "all") setFormMatch(matchFilter);
    if (platformFilter !== "all") setFormPlatform(platformFilter);
    setIsQuickAddOpen(true);
  };
  
  const handleCustomDateSelect = (preset: string) => {
    setDateFilter('custom');
    setCustomDateLabel(`Custom: ${preset}`);
    setIsDatePopoverOpen(false);
  };
  
  const getDateFilterLabel = () => {
    if (dateFilter === 'custom' && customDateLabel) return customDateLabel;
    return dateOptions.find(d => d.value === dateFilter)?.label || 'Today';
  };
  
  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };
  
  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live Lab</h1>
          <p className="text-sm text-muted-foreground">Operational Violation Tracking</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">
              {selectedMatch ? `Live Lab · ${selectedMatch.description}` : 'Global queue · All matches'}
            </span>
            {liveMatches.length > 0 && !selectedMatch && (
              <Badge variant="secondary" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                <Radio className="h-2 w-2 mr-1 animate-pulse" />
                {liveMatches.length} live now
              </Badge>
            )}
          </div>
        </div>
        
        {/* Header Stats - Inline */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Active:</span>
            <span className="font-semibold text-destructive">{activeCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Blocked:</span>
            <span className="font-semibold text-success">{blockedCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Avg block:</span>
            <span className="font-semibold">{avgBlockTime} min</span>
          </div>
        </div>
      </div>

      {/* Filter Bar Card */}
      <Card className="p-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Match Filter */}
          <Select value={matchFilter} onValueChange={setMatchFilter}>
            <SelectTrigger className="h-8 text-xs w-[160px]">
              <SelectValue placeholder="All matches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All matches</SelectItem>
              <SelectItem value="live">🔴 Live now</SelectItem>
              <Separator className="my-1" />
              {mockMatches.map(match => (
                <SelectItem key={match.id} value={match.id.toString()}>
                  {match.status === 'live' && '🔴 '}{match.description}
                </SelectItem>
              ))}
              <Separator className="my-1" />
              <SelectItem value="other">Other / No match</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Platform Filter */}
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="h-8 text-xs w-[130px]">
              <SelectValue placeholder="All platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {platforms.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2">
                    <span style={{ color: p.color }}>{p.icon}</span>
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Content Type Filter - Segmented */}
          <div className="flex gap-0.5 bg-muted/50 p-0.5 rounded-md">
            {['all', 'live', 'highlights', 'other'].map(type => (
              <button
                key={type}
                onClick={() => setContentTypeFilter(type)}
                className={`px-2.5 py-1 text-xs rounded transition-colors capitalize ${
                  contentTypeFilter === type 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {type === 'all' ? 'All' : type}
              </button>
            ))}
          </div>
          
          {/* Status Filter - Segmented */}
          <div className="flex gap-0.5 bg-muted/50 p-0.5 rounded-md">
            {['all', 'active', 'blocked', 'review', 'reported', 'other'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 text-xs rounded transition-colors capitalize ${
                  statusFilter === status 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {status === 'all' ? 'All' : status}
              </button>
            ))}
          </div>
          
          {/* Date Filter with Popover */}
          <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <Calendar className="h-3 w-3" />
                {getDateFilterLabel()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <div className="space-y-3">
                <div className="space-y-1">
                  {dateOptions.filter(d => d.value !== 'custom').map(option => (
                    <button
                      key={option.value}
                      onClick={() => { setDateFilter(option.value); setCustomDateLabel(""); setIsDatePopoverOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
                        dateFilter === option.value && !customDateLabel
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Quick presets</p>
                  <div className="flex flex-wrap gap-1.5">
                    {quickDatePresets.map(preset => (
                      <Badge
                        key={preset.value}
                        variant="outline"
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleCustomDateSelect(preset.label)}
                      >
                        {preset.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Custom range</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">From</Label>
                      <Input type="date" className="h-8 text-xs mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">To</Label>
                      <Input type="date" className="h-8 text-xs mt-1" />
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full mt-2 h-7 text-xs"
                    onClick={() => handleCustomDateSelect('21–27 May')}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <div className="flex-1" />
          
          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={clearFilters}>
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          )}
          
          {/* Quick Add Button */}
          <Button size="sm" className="h-8" onClick={openQuickAdd}>
            <Plus className="h-3 w-3 mr-1" />
            Quick Add Violation
          </Button>
        </div>
      </Card>

      {/* Violations Table Card */}
      <Card>
        {/* Table Header with Sort Mode Tabs */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold">Violations</h3>
              <Badge variant="secondary" className="text-xs">
                {totalViolations.toLocaleString()} total
              </Badge>
            </div>
          </div>
          
          {/* Sort Mode Tabs */}
          <div className="flex gap-1">
            {sortModes.map(mode => (
              <button
                key={mode.id}
                onClick={() => setActiveSortMode(mode.id)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  activeSortMode === mode.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Table */}
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px]">Platform</TableHead>
                <TableHead className="w-[140px]">Match</TableHead>
                <TableHead className="min-w-[200px]">Account / Post</TableHead>
                <TableHead className="w-[85px]">Status</TableHead>
                <TableHead className="w-[70px]">Views</TableHead>
                <TableHead className="w-[120px]">Time / SLA</TableHead>
                <TableHead className="w-[75px]">Type</TableHead>
                <TableHead className="w-[90px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Skeleton loading state
                Array.from({ length: pageSize > 10 ? 10 : pageSize }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedViolations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    No violations found matching current filters
                  </TableCell>
                </TableRow>
              ) : (
                paginatedViolations.map((violation) => {
                  const platform = getPlatformInfo(violation.platform);
                  const match = mockMatches.find(m => m.id === violation.matchId);
                  const status = statusConfig[violation.status] || statusConfig.other;
                  
                  return (
                    <TableRow 
                      key={violation.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(violation)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span style={{ color: platform.color }} className="text-sm">
                            {platform.icon}
                          </span>
                          <span className="text-xs">{platform.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground truncate block max-w-[130px]">
                          {match ? match.description : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{violation.account}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Link className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate max-w-[180px]">
                              {violation.url ? violation.url.slice(0, 45) + '...' : violation.postId}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${status.colorClass}`}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs">
                          <Eye className="h-3 w-3 text-muted-foreground" />
                          {formatViews(violation.views)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {violation.status === 'blocked' ? (
                            <span className="text-xs text-success flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              {violation.minutesToBlock}m
                            </span>
                          ) : (
                            <>
                              <span className="text-xs text-muted-foreground">
                                {formatTimeAgo(violation.reportedAt)}
                              </span>
                              {violation.slaBreached ? (
                                <Badge variant="destructive" className="text-[9px] w-fit px-1 py-0">
                                  <AlertTriangle className="h-2 w-2 mr-0.5" />
                                  SLA
                                </Badge>
                              ) : (
                                <span className="text-[9px] text-success flex items-center gap-0.5">
                                  <CheckCircle2 className="h-2 w-2" />
                                  SLA
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {violation.contentType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-0.5 justify-end" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0"
                            onClick={() => violation.url && window.open(violation.url, '_blank')}
                            title="Open original"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                          {(violation.status === 'active' || violation.status === 'review' || violation.status === 'reported') && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 w-6 p-0 text-success hover:text-success"
                              onClick={(e) => handleQuickBlock(violation, e)}
                              title="Mark as blocked"
                            >
                              <Shield className="h-3 w-3" />
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0"
                            onClick={() => handleRowClick(violation)}
                            title="View details"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        <div className="p-3 border-t flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-xs">
              Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, totalViolations)} of {totalViolations.toLocaleString()} violations
            </span>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="h-7 w-[80px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 px-2 text-xs"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              <ChevronLeft className="h-3 w-3 mr-1" />
              Prev
            </Button>
            
            {getPageNumbers().map((page, i) => (
              page === 'ellipsis' ? (
                <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">…</span>
              ) : (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 w-7 p-0 text-xs"
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              )
            ))}
            
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 px-2 text-xs"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Next
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Quick Add Violation Drawer */}
      <Sheet open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
        <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Quick Add Violation</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-5 py-6">
            {/* Match */}
            <div>
              <Label className="text-sm font-medium">Match</Label>
              <Select value={formMatch} onValueChange={setFormMatch}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select match" />
                </SelectTrigger>
                <SelectContent>
                  {mockMatches.map(match => (
                    <SelectItem key={match.id} value={match.id.toString()}>
                      {match.status === 'live' && '🔴 '}{match.description}
                    </SelectItem>
                  ))}
                  <Separator className="my-1" />
                  <SelectItem value="other">Other / No match</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Custom category when "Other / No match" is selected */}
              {formMatch === 'other' && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">
                    Optional: create a custom tag for this violation's category
                  </p>
                  <Input 
                    placeholder="e.g., General pirate channel, Season highlights"
                    value={formCustomCategory}
                    onChange={(e) => setFormCustomCategory(e.target.value)}
                    className="text-sm"
                  />
                </div>
              )}
            </div>
            
            {/* Platform */}
            <div>
              <Label className="text-sm font-medium">Platform</Label>
              <Select value={formPlatform} onValueChange={setFormPlatform}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span style={{ color: p.color }}>{p.icon}</span>
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Other platform name input */}
              {formPlatform === 'other' && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                  <Label className="text-xs text-muted-foreground">Platform name</Label>
                  <Input 
                    placeholder="e.g., Snapchat, Unknown web player"
                    value={formOtherPlatformName}
                    onChange={(e) => setFormOtherPlatformName(e.target.value)}
                    className="mt-1.5 text-sm"
                  />
                </div>
              )}
            </div>
            
            {/* URL */}
            <div>
              <Label className="text-sm font-medium">URL <span className="text-destructive">*</span></Label>
              <Input 
                placeholder="Paste violation URL..." 
                className="mt-1.5"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Auto-parses account and post ID when possible
              </p>
            </div>
            
            {/* Content Type */}
            <div>
              <Label className="text-sm font-medium">Content Type</Label>
              <div className="flex gap-1 mt-1.5 bg-muted/50 p-1 rounded-lg">
                {['live', 'highlights', 'other'].map(type => (
                  <button
                    key={type}
                    onClick={() => setFormContentType(type)}
                    className={`flex-1 py-1.5 text-sm rounded-md transition-colors capitalize ${
                      formContentType === type 
                        ? 'bg-background text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Status */}
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reported">Reported</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Block time options when status is blocked */}
              {formStatus === 'blocked' && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2">
                  <Label className="text-xs text-muted-foreground">Block time</Label>
                  <div className="space-y-2">
                    <div 
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${formBlockTimeOption === 'now' ? 'border-primary bg-primary/5' : 'border-border'}`}
                      onClick={() => setFormBlockTimeOption('now')}
                    >
                      <input type="radio" checked={formBlockTimeOption === 'now'} onChange={() => {}} className="accent-primary" />
                      <span className="text-sm">Use current time</span>
                    </div>
                    <div 
                      className={`p-2 rounded border cursor-pointer ${formBlockTimeOption === 'custom' ? 'border-primary bg-primary/5' : 'border-border'}`}
                      onClick={() => setFormBlockTimeOption('custom')}
                    >
                      <div className="flex items-center gap-2">
                        <input type="radio" checked={formBlockTimeOption === 'custom'} onChange={() => {}} className="accent-primary" />
                        <span className="text-sm">Set custom time</span>
                      </div>
                      {formBlockTimeOption === 'custom' && (
                        <Input 
                          type="datetime-local"
                          className="mt-2 h-8 text-sm"
                          value={formBlockTime}
                          onChange={(e) => setFormBlockTime(e.target.value)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Views */}
            <div>
              <Label className="text-sm font-medium">Views <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input 
                type="number" 
                placeholder="Enter view count" 
                className="mt-1.5"
                value={formViews}
                onChange={(e) => setFormViews(e.target.value)}
              />
            </div>
          </div>
          
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => { resetQuickAddForm(); setIsQuickAddOpen(false); }}>
              Cancel
            </Button>
            <Button onClick={handleCreateViolation}>
              <Plus className="h-4 w-4 mr-2" />
              Create Violation
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Violation Details Drawer */}
      <Sheet open={isDetailsPanelOpen} onOpenChange={setIsDetailsPanelOpen}>
        <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto">
          {selectedViolation && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <span style={{ color: getPlatformInfo(selectedViolation.platform).color }} className="text-2xl">
                    {getPlatformInfo(selectedViolation.platform).icon}
                  </span>
                  <div>
                    <SheetTitle className="text-left">{selectedViolation.account}</SheetTitle>
                    <p className="text-sm text-muted-foreground">{getPlatformInfo(selectedViolation.platform).name}</p>
                  </div>
                </div>
              </SheetHeader>
              
              <ScrollArea className="h-[calc(100vh-180px)] pr-4">
                <div className="space-y-5 py-6">
                  {/* URL Section */}
                  {selectedViolation.url && (
                    <div>
                      <Label className="text-xs text-muted-foreground">URL</Label>
                      <a 
                        href={selectedViolation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1.5 mt-1"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">{selectedViolation.url.slice(0, 50)}...</span>
                      </a>
                    </div>
                  )}
                  
                  <Separator />
                  
                  {/* Match & Context */}
                  <div>
                    <h4 className="font-semibold text-sm mb-3">Match & Context</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Match</Label>
                        <p className="text-sm mt-1">
                          {mockMatches.find(m => m.id === selectedViolation.matchId)?.description || 'No match'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Content Type</Label>
                        <Badge variant="secondary" className="capitalize text-xs mt-1">
                          {selectedViolation.contentType}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Current Status</Label>
                        <Badge className={`text-xs mt-1 ${statusConfig[selectedViolation.status]?.colorClass}`}>
                          {statusConfig[selectedViolation.status]?.label}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Views</Label>
                        <p className="text-sm font-medium flex items-center gap-1 mt-1">
                          <Eye className="h-3 w-3" />
                          {selectedViolation.views.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Timing & SLA */}
                  <div>
                    <h4 className="font-semibold text-sm mb-3">Timing & SLA</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Added at:</span>
                        <span className="text-sm">
                          {new Date(selectedViolation.reportedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {selectedViolation.blockedAt && (
                        <div className="flex items-center gap-2">
                          <Shield className="h-3 w-3 text-success" />
                          <span className="text-xs text-muted-foreground">Blocked at:</span>
                          <span className="text-sm">
                            {new Date(selectedViolation.blockedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            <span className="text-success ml-1">(in {selectedViolation.minutesToBlock}m)</span>
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">SLA Status:</span>
                        <Badge variant={selectedViolation.slaBreached ? 'destructive' : 'outline'} className="text-xs">
                          {selectedViolation.slaBreached ? 'SLA breached' : 'Within target'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Actions */}
                  <div>
                    <h4 className="font-semibold text-sm mb-3">Actions</h4>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Change Status</Label>
                        <Select 
                          value={selectedViolation.status} 
                          onValueChange={handleStatusChange}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="blocked">Blocked</SelectItem>
                            <SelectItem value="review">Review</SelectItem>
                            <SelectItem value="reported">Reported</SelectItem>
                            <SelectItem value="removed">Removed</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex gap-2">
                        {selectedViolation.matchId && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => navigate(`/match/${selectedViolation.matchId}`)}
                          >
                            <LayoutDashboard className="h-3 w-3 mr-1" />
                            Match Dashboard
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => selectedViolation.url && window.open(selectedViolation.url, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Open Post
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Activity Timeline */}
                  <div>
                    <h4 className="font-semibold text-sm mb-3">Activity</h4>
                    <div className="space-y-3">
                      <div className="flex gap-3 text-xs">
                        <div className="text-muted-foreground w-12">
                          {new Date(selectedViolation.reportedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="flex-1">
                          <Badge variant="outline" className="text-[10px] mr-2">Created</Badge>
                          Violation reported
                        </div>
                      </div>
                      {selectedViolation.blockedAt && (
                        <div className="flex gap-3 text-xs">
                          <div className="text-muted-foreground w-12">
                            {new Date(selectedViolation.blockedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="flex-1">
                            <Badge className="text-[10px] mr-2 bg-success text-success-foreground">Blocked</Badge>
                            Content blocked
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Notes */}
                  <div>
                    <Label className="text-sm">Notes</Label>
                    <Textarea 
                      placeholder="Add internal notes for this violation..."
                      className="mt-2 min-h-[80px]"
                      defaultValue={selectedViolation.notes}
                    />
                    <Button size="sm" className="w-full mt-2">
                      Save Notes
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
      
      {/* Block Confirmation Dialog */}
      <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Block Time</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {selectedViolation && (
                <>Marking <strong>{selectedViolation.account}</strong> on <strong>{getPlatformInfo(selectedViolation.platform).name}</strong> as blocked.</>
              )}
            </p>
            <div className="space-y-3">
              <div 
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${blockTimeOption === 'now' ? 'border-primary bg-primary/5' : 'border-border'}`}
                onClick={() => setBlockTimeOption('now')}
              >
                <input 
                  type="radio" 
                  checked={blockTimeOption === 'now'} 
                  onChange={() => setBlockTimeOption('now')}
                  className="accent-primary"
                />
                <div>
                  <p className="text-sm font-medium">Use current time</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div 
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${blockTimeOption === 'custom' ? 'border-primary bg-primary/5' : 'border-border'}`}
                onClick={() => setBlockTimeOption('custom')}
              >
                <input 
                  type="radio" 
                  checked={blockTimeOption === 'custom'} 
                  onChange={() => setBlockTimeOption('custom')}
                  className="accent-primary"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">Set custom block time</p>
                  {blockTimeOption === 'custom' && (
                    <Input 
                      type="datetime-local"
                      className="mt-2 h-8 text-sm"
                      value={customBlockTime}
                      onChange={(e) => setCustomBlockTime(e.target.value)}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsBlockDialogOpen(false); setPendingBlockViolationId(null); }}>
              Cancel
            </Button>
            <Button onClick={confirmBlock}>
              Confirm Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
