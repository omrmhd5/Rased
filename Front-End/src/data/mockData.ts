// Centralized mock data for the Anti-Piracy Platform

export interface Violation {
  id: number;
  platform: string;
  account: string;
  postId: string;
  status: 'reported' | 'blocked' | 'active' | 'review' | 'removed';
  views: number;
  contentType: 'live' | 'highlights' | 'other';
  reportedAt: string;
  blockedAt?: string;
  minutesToBlock?: number;
  priority: 'low' | 'medium' | 'high';
  slaBreached: boolean;
  matchId?: number;
  evidence?: string[];
  notes?: string;
  url?: string;
}

export interface Match {
  id: number;
  description: string;
  date: string;
  time: string;
  week: number;
  venue: string;
  status: 'live' | 'upcoming' | 'completed';
  violations: number;
  blocked: number;
  active: number;
  totalViews: number;
  blockedPercent: number;
  league: 'saudi' | 'italian' | 'spanish';
}

export const mockViolations: Violation[] = [
  {
    id: 1,
    platform: 'twitter',
    account: '@pirate_stream',
    postId: '1234567890',
    status: 'reported',
    views: 12400,
    contentType: 'live',
    reportedAt: '2024-03-15T20:45:00',
    priority: 'high',
    slaBreached: false,
    matchId: 1,
    url: 'https://twitter.com/pirate_stream/status/1234567890',
  },
  {
    id: 2,
    platform: 'youtube',
    account: 'LiveSportsHD',
    postId: 'dQw4w9WgXcQ',
    status: 'blocked',
    views: 34200,
    contentType: 'live',
    reportedAt: '2024-03-15T20:30:00',
    blockedAt: '2024-03-15T20:42:00',
    minutesToBlock: 12,
    priority: 'high',
    slaBreached: false,
    matchId: 1,
    url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
  },
  {
    id: 3,
    platform: 'telegram',
    account: 'FreeMatchesChannel',
    postId: 't.me/freematches',
    status: 'active',
    views: 8700,
    contentType: 'highlights',
    reportedAt: '2024-03-15T21:15:00',
    priority: 'medium',
    slaBreached: true,
    matchId: 1,
    url: 'https://t.me/freematches/123',
  },
  {
    id: 4,
    platform: 'facebook',
    account: 'SportsStreams',
    postId: '987654321',
    status: 'blocked',
    views: 15600,
    contentType: 'live',
    reportedAt: '2024-03-15T20:50:00',
    blockedAt: '2024-03-15T20:58:00',
    minutesToBlock: 8,
    priority: 'high',
    slaBreached: false,
    matchId: 1,
  },
  {
    id: 5,
    platform: 'tiktok',
    account: '@livesports24',
    postId: '7123456789',
    status: 'blocked',
    views: 9200,
    contentType: 'highlights',
    reportedAt: '2024-03-15T21:00:00',
    blockedAt: '2024-03-15T21:09:00',
    minutesToBlock: 9,
    priority: 'medium',
    slaBreached: false,
    matchId: 1,
  },
  {
    id: 6,
    platform: 'twitter',
    account: '@sports_live_hd',
    postId: '9876543210',
    status: 'active',
    views: 23400,
    contentType: 'live',
    reportedAt: '2024-03-15T19:30:00',
    priority: 'high',
    slaBreached: true,
    matchId: 1,
    url: 'https://twitter.com/sports_live_hd/status/9876543210',
  },
  {
    id: 7,
    platform: 'youtube',
    account: 'SportsClipsDaily',
    postId: 'xyz123abc',
    status: 'review',
    views: 18900,
    contentType: 'highlights',
    reportedAt: '2024-03-15T20:15:00',
    priority: 'medium',
    slaBreached: false,
    matchId: 2,
    url: 'https://youtube.com/watch?v=xyz123abc',
  },
  {
    id: 8,
    platform: 'facebook',
    account: 'LiveMatchesTonight',
    postId: 'fb_12345',
    status: 'reported',
    views: 7800,
    contentType: 'live',
    reportedAt: '2024-03-15T21:30:00',
    priority: 'medium',
    slaBreached: false,
    matchId: 2,
    url: 'https://facebook.com/LiveMatchesTonight/posts/12345',
  },
  {
    id: 9,
    platform: 'instagram',
    account: '@match_highlights',
    postId: 'ig_789',
    status: 'active',
    views: 14200,
    contentType: 'highlights',
    reportedAt: '2024-03-15T19:00:00',
    priority: 'high',
    slaBreached: true,
    matchId: 3,
    url: 'https://instagram.com/p/ig_789',
  },
  {
    id: 10,
    platform: 'telegram',
    account: 'SportsChannelHD',
    postId: 't.me/sportshd',
    status: 'review',
    views: 11500,
    contentType: 'live',
    reportedAt: '2024-03-15T20:00:00',
    priority: 'high',
    slaBreached: false,
    matchId: 3,
    url: 'https://t.me/sportshd/456',
  },
];

export const mockMatches: Match[] = [
  // Saudi League Matches
  {
    id: 1,
    description: 'NEOM vs Al Ettifaq',
    date: '2024-03-15',
    time: '20:00',
    week: 12,
    venue: 'Prince Mohammed bin Fahd Stadium',
    status: 'live',
    violations: 89,
    blocked: 82,
    active: 7,
    totalViews: 234000,
    blockedPercent: 92,
    league: 'saudi',
  },
  {
    id: 2,
    description: 'Al Hilal vs Al Nassr',
    date: '2024-03-16',
    time: '21:00',
    week: 12,
    venue: 'King Fahd International Stadium',
    status: 'upcoming',
    violations: 0,
    blocked: 0,
    active: 0,
    totalViews: 0,
    blockedPercent: 0,
    league: 'saudi',
  },
  {
    id: 3,
    description: 'Al Ittihad vs Al Ahli',
    date: '2024-03-16',
    time: '18:30',
    week: 12,
    venue: 'King Abdullah Sports City',
    status: 'upcoming',
    violations: 0,
    blocked: 0,
    active: 0,
    totalViews: 0,
    blockedPercent: 0,
    league: 'saudi',
  },
  {
    id: 4,
    description: 'Al Taawoun vs Damac',
    date: '2024-03-14',
    time: '19:00',
    week: 12,
    venue: 'King Abdullah Sport City Stadium',
    status: 'completed',
    violations: 67,
    blocked: 61,
    active: 0,
    totalViews: 156000,
    blockedPercent: 91,
    league: 'saudi',
  },
  {
    id: 5,
    description: 'Al Shabab vs Al Fateh',
    date: '2024-03-14',
    time: '17:00',
    week: 12,
    venue: 'Prince Faisal bin Fahd Stadium',
    status: 'completed',
    violations: 45,
    blocked: 42,
    active: 0,
    totalViews: 98000,
    blockedPercent: 93,
    league: 'saudi',
  },
  // Italian League Matches
  {
    id: 6,
    description: 'Juventus vs AC Milan',
    date: '2024-03-15',
    time: '20:45',
    week: 12,
    venue: 'Allianz Stadium',
    status: 'live',
    violations: 76,
    blocked: 70,
    active: 6,
    totalViews: 198000,
    blockedPercent: 92,
    league: 'italian',
  },
  {
    id: 7,
    description: 'Inter Milan vs AS Roma',
    date: '2024-03-16',
    time: '18:00',
    week: 12,
    venue: 'San Siro',
    status: 'upcoming',
    violations: 0,
    blocked: 0,
    active: 0,
    totalViews: 0,
    blockedPercent: 0,
    league: 'italian',
  },
  {
    id: 8,
    description: 'Napoli vs Lazio',
    date: '2024-03-14',
    time: '20:00',
    week: 12,
    venue: 'Diego Armando Maradona Stadium',
    status: 'completed',
    violations: 58,
    blocked: 54,
    active: 0,
    totalViews: 142000,
    blockedPercent: 93,
    league: 'italian',
  },
  // Spanish League Matches
  {
    id: 9,
    description: 'Real Madrid vs Barcelona',
    date: '2024-03-15',
    time: '21:00',
    week: 12,
    venue: 'Santiago Bernabéu',
    status: 'live',
    violations: 112,
    blocked: 105,
    active: 7,
    totalViews: 456000,
    blockedPercent: 94,
    league: 'spanish',
  },
  {
    id: 10,
    description: 'Atletico Madrid vs Sevilla',
    date: '2024-03-16',
    time: '19:30',
    week: 12,
    venue: 'Wanda Metropolitano',
    status: 'upcoming',
    violations: 0,
    blocked: 0,
    active: 0,
    totalViews: 0,
    blockedPercent: 0,
    league: 'spanish',
  },
  {
    id: 11,
    description: 'Valencia vs Villarreal',
    date: '2024-03-14',
    time: '18:00',
    week: 12,
    venue: 'Mestalla Stadium',
    status: 'completed',
    violations: 52,
    blocked: 48,
    active: 0,
    totalViews: 125000,
    blockedPercent: 92,
    league: 'spanish',
  },
];

export const platformData = [
  { name: 'Twitter', live: 45, highlights: 23, blocked: 62, active: 6, avgBlockTime: 11.2, medianBlockTime: 9.5, slaPercent: 92 },
  { name: 'YouTube', live: 38, highlights: 31, blocked: 61, active: 8, avgBlockTime: 13.8, medianBlockTime: 11.2, slaPercent: 88 },
  { name: 'Facebook', live: 29, highlights: 18, blocked: 40, active: 7, avgBlockTime: 10.5, medianBlockTime: 8.9, slaPercent: 85 },
  { name: 'TikTok', live: 26, highlights: 22, blocked: 44, active: 4, avgBlockTime: 9.8, medianBlockTime: 8.2, slaPercent: 94 },
  { name: 'Instagram', live: 19, highlights: 15, blocked: 31, active: 3, avgBlockTime: 12.1, medianBlockTime: 10.3, slaPercent: 91 },
  { name: 'Telegram', live: 15, highlights: 12, blocked: 20, active: 7, avgBlockTime: 16.4, medianBlockTime: 14.8, slaPercent: 73 },
];

export const blockTimeDistribution = [
  { range: '0-5 min', count: 24, color: 'hsl(var(--success))' },
  { range: '5-10 min', count: 38, color: 'hsl(var(--success))' },
  { range: '10-15 min', count: 19, color: 'hsl(var(--chart-1))' },
  { range: '15-20 min', count: 6, color: 'hsl(var(--warning))' },
  { range: '20+ min', count: 2, color: 'hsl(var(--destructive))' },
];

export const topOffendingAccounts = [
  { platform: 'youtube', account: 'LiveSportsHD', violations: 12, views: 145000, status: 'monitored' },
  { platform: 'twitter', account: '@pirate_stream', violations: 9, views: 87000, status: 'active' },
  { platform: 'telegram', account: 'FreeMatches', violations: 8, views: 52000, status: 'active' },
  { platform: 'facebook', account: 'SportsStreams', violations: 7, views: 64000, status: 'blocked' },
  { platform: 'tiktok', account: '@livesports24', violations: 6, views: 38000, status: 'monitored' },
];
