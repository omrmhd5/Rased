// Harm score calculation utilities

export const PLATFORM_WEIGHTS: Record<string, number> = {
  youtube: 1.5,
  twitter: 1.2,
  facebook: 1.0,
  instagram: 0.9,
  tiktok: 0.8,
  telegram: 0.7,
  iptv: 1.3,
  website: 1.1,
  other: 0.5,
};

export function calculateHarmScore(views: number, platform: string): number {
  const weight = PLATFORM_WEIGHTS[platform.toLowerCase()] || 1.0;
  return Math.round(views * weight);
}

export function calculateTotalHarmScore(violations: Array<{ views: number; platform: string }>): number {
  return violations.reduce((total, v) => total + calculateHarmScore(v.views, v.platform), 0);
}

export function formatHarmScore(score: number): string {
  if (score >= 1000000) {
    return (score / 1000000).toFixed(1) + 'M';
  }
  if (score >= 1000) {
    return (score / 1000).toFixed(1) + 'K';
  }
  return score.toString();
}
