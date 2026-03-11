export type Platform = 'youtube' | 'twitch';
export type AlertType = 'engagement_drop' | 'zero_conversions' | 'high_spend_low_roi';
export type AlertSeverity = 'warning' | 'critical';
export type CampaignStatus = 'active' | 'completed' | 'paused';

export interface Creator {
  id: string;
  platform: Platform;
  external_id: string;
  username: string;
  display_name: string;
  category: string | null;
  description: string | null;
  thumbnail_url: string | null;
  profile_url: string | null;
  followers: number;
  total_views: number;
  video_count: number | null;
  engagement_rate: number;
  is_live: 0 | 1;
  snapshot_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatorSnapshot {
  id: number;
  creator_id: string;
  snapshot_at: string;
  followers: number;
  total_views: number;
  video_count: number | null;
  engagement_rate: number;
  is_live: 0 | 1;
}

export interface Alert {
  id: number;
  creator_id: string | null;
  campaign_id: string | null;
  type: AlertType;
  message: string;
  severity: AlertSeverity;
  created_at: string;
  resolved_at: string | null;
  creator_name: string | null;
  platform: Platform | null;
  thumbnail_url: string | null;
  campaign_name: string | null;
}

export interface Campaign {
  id: string;
  name: string;
  brand: string;
  budget: number;
  start_date: string | null;
  end_date: string | null;
  status: CampaignStatus;
  creator_count: number;
  total_spend: number;
  total_conversions: number;
  total_impressions: number;
  total_clicks: number;
}

export interface PlatformBreakdown {
  platform: Platform;
  creator_count: number;
  total_followers: number;
  avg_followers: number;
  avg_engagement_rate: number;
  max_engagement_rate: number;
  total_views: number;
  live_count: number;
}

export interface AnalyticsSummary {
  creators: {
    total_creators: number;
    platform_count: number;
    total_followers: number;
    avg_engagement_rate: number;
    max_followers: number;
    total_views: number;
  };
  by_platform: PlatformBreakdown[];
  campaigns: {
    total: number;
    active: number;
    total_budget: number;
    total_spend: number;
  };
  live_count: number;
  last_sync: string | null;
}

export interface TrendDataPoint {
  date: string;
  platform: Platform;
  avg_followers: number;
  avg_engagement_rate: number;
  creator_count: number;
}
