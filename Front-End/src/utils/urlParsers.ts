// URL parsing utilities for different platforms

export interface ParsedUrl {
  postId: string | null;
  accountId: string | null;
  platform: string | null;
}

export function parseUrl(url: string): ParsedUrl {
  const result: ParsedUrl = {
    postId: null,
    accountId: null,
    platform: null,
  };

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Twitter/X
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      result.platform = 'twitter';
      const match = url.match(/(?:twitter\.com|x\.com)\/([^\/]+)\/status\/(\d+)/);
      if (match) {
        result.accountId = '@' + match[1];
        result.postId = match[2];
      }
    }
    
    // YouTube
    else if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      result.platform = 'youtube';
      if (hostname.includes('youtu.be')) {
        const match = url.match(/youtu\.be\/([^?]+)/);
        if (match) result.postId = match[1];
      } else {
        const match = url.match(/[?&]v=([^&]+)/);
        if (match) result.postId = match[1];
      }
      const channelMatch = url.match(/youtube\.com\/(c|channel|user|@)\/([^\/\?]+)/);
      if (channelMatch) {
        result.accountId = channelMatch[2];
      }
    }
    
    // Facebook
    else if (hostname.includes('facebook.com') || hostname.includes('fb.com')) {
      result.platform = 'facebook';
      const match = url.match(/facebook\.com\/([^\/]+)\/(?:posts|videos)\/([^\/\?]+)/);
      if (match) {
        result.accountId = match[1];
        result.postId = match[2];
      }
    }
    
    // TikTok
    else if (hostname.includes('tiktok.com')) {
      result.platform = 'tiktok';
      const match = url.match(/tiktok\.com\/@([^\/]+)\/video\/(\d+)/);
      if (match) {
        result.accountId = '@' + match[1];
        result.postId = match[2];
      }
    }
    
    // Instagram
    else if (hostname.includes('instagram.com')) {
      result.platform = 'instagram';
      const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([^\/\?]+)/);
      if (match) {
        result.postId = match[1];
      }
      const accountMatch = url.match(/instagram\.com\/([^\/\?]+)/);
      if (accountMatch && !accountMatch[1].match(/^(p|reel|tv)$/)) {
        result.accountId = '@' + accountMatch[1];
      }
    }
    
    // Telegram
    else if (hostname.includes('t.me') || hostname.includes('telegram.me')) {
      result.platform = 'telegram';
      const match = url.match(/t(?:elegram)?\.me\/([^\/\?]+)(?:\/(\d+))?/);
      if (match) {
        result.accountId = match[1];
        result.postId = match[2] || null;
      }
    }

  } catch (e) {
    // Invalid URL, return nulls
  }

  return result;
}

export function getPlatformFromUrl(url: string): string {
  const parsed = parseUrl(url);
  return parsed.platform || 'other';
}
