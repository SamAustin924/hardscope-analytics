-- Creators: normalized across YouTube and Twitch
CREATE TABLE IF NOT EXISTS creators (
  id TEXT PRIMARY KEY,                 -- "{platform}:{external_id}"
  platform TEXT NOT NULL,              -- 'youtube' | 'twitch'
  external_id TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  thumbnail_url TEXT,
  profile_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform, external_id)
);

-- Time-series snapshots: enables trend charts + engagement drop alerts
CREATE TABLE IF NOT EXISTS creator_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id TEXT NOT NULL,
  snapshot_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  followers INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  video_count INTEGER,
  engagement_rate REAL DEFAULT 0,      -- avg_views_per_video / followers (proxy)
  is_live INTEGER DEFAULT 0,           -- 0/1 boolean (SQLite)
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE
);

-- Campaigns: ties creator data to brand context
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  budget REAL DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'active',        -- 'active' | 'completed' | 'paused'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Campaign <-> Creator join with performance metrics
CREATE TABLE IF NOT EXISTS campaign_creators (
  campaign_id TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  spend REAL DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (campaign_id, creator_id),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE
);

-- Alerts: engagement drops, zero conversions, high spend/low ROI
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id TEXT,
  campaign_id TEXT,
  type TEXT NOT NULL,                  -- 'engagement_drop' | 'zero_conversions' | 'high_spend_low_roi'
  message TEXT NOT NULL,
  severity TEXT NOT NULL,              -- 'warning' | 'critical'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE SET NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_creators_platform ON creators(platform);
CREATE INDEX IF NOT EXISTS idx_snapshots_creator_id ON creator_snapshots(creator_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_snapshot_at ON creator_snapshots(snapshot_at);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved_at);
CREATE INDEX IF NOT EXISTS idx_campaign_creators_campaign ON campaign_creators(campaign_id);
