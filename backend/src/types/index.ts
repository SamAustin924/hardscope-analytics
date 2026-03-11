export type Platform = 'youtube' | 'twitch';

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
  is_live: number; // 0 | 1
}

export interface CreatorWithLatestSnapshot extends Creator {
  followers: number;
  total_views: number;
  video_count: number | null;
  engagement_rate: number;
  is_live: number;
  snapshot_at: string | null;
}

export interface Campaign {
  id: string;
  name: string;
  brand: string;
  budget: number;
  start_date: string | null;
  end_date: string | null;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
}

export interface CampaignCreator {
  campaign_id: string;
  creator_id: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  assigned_at: string;
}

export type AlertType = 'engagement_drop' | 'zero_conversions' | 'high_spend_low_roi';
export type AlertSeverity = 'warning' | 'critical';

export interface Alert {
  id: number;
  creator_id: string | null;
  campaign_id: string | null;
  type: AlertType;
  message: string;
  severity: AlertSeverity;
  created_at: string;
  resolved_at: string | null;
}

// Normalized ingestion payload — what ingest modules return
export interface NormalizedCreator {
  platform: Platform;
  external_id: string;
  username: string;
  display_name: string;
  category: string | null;
  description: string | null;
  thumbnail_url: string | null;
  profile_url: string | null;
  snapshot: {
    followers: number;
    total_views: number;
    video_count: number | null;
    engagement_rate: number;
    is_live: boolean;
  };
}
