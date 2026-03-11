import { Router, Request, Response } from 'express';
import { getDb } from '../db/database';

export const analyticsRouter = Router();

/**
 * GET /api/analytics/summary
 * Returns high-level platform summary stats.
 */
analyticsRouter.get('/summary', (_req: Request, res: Response) => {
  const db = getDb();

  try {
    const totals = db.prepare(`
      SELECT
        COUNT(DISTINCT c.id) AS total_creators,
        COUNT(DISTINCT c.platform) AS platform_count,
        SUM(s.followers) AS total_followers,
        AVG(s.engagement_rate) AS avg_engagement_rate,
        MAX(s.followers) AS max_followers,
        SUM(s.total_views) AS total_views
      FROM creators c
      JOIN creator_snapshots s ON s.id = (
        SELECT id FROM creator_snapshots WHERE creator_id = c.id ORDER BY snapshot_at DESC LIMIT 1
      )
    `).get() as Record<string, number>;

    const byPlatform = db.prepare(`
      SELECT
        c.platform,
        COUNT(c.id) AS creator_count,
        SUM(s.followers) AS total_followers,
        AVG(s.engagement_rate) AS avg_engagement_rate,
        SUM(s.total_views) AS total_views
      FROM creators c
      JOIN creator_snapshots s ON s.id = (
        SELECT id FROM creator_snapshots WHERE creator_id = c.id ORDER BY snapshot_at DESC LIMIT 1
      )
      GROUP BY c.platform
    `).all() as Array<Record<string, unknown>>;

    const campaigns = db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
        SUM(budget) AS total_budget,
        (SELECT SUM(spend) FROM campaign_creators) AS total_spend
      FROM campaigns
    `).get() as Record<string, number>;

    const liveCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM creators c
      JOIN creator_snapshots s ON s.id = (
        SELECT id FROM creator_snapshots WHERE creator_id = c.id ORDER BY snapshot_at DESC LIMIT 1
      )
      WHERE s.is_live = 1
    `).get() as { count: number };

    const lastIngest = db.prepare(
      'SELECT MAX(snapshot_at) as last_sync FROM creator_snapshots'
    ).get() as { last_sync: string | null };

    res.json({
      creators: totals,
      by_platform: byPlatform,
      campaigns,
      live_count: liveCount.count,
      last_sync: lastIngest.last_sync,
    });
  } catch (err) {
    res.status(500).json({ error: 'Analytics query failed', detail: (err as Error).message });
  }
});

/**
 * GET /api/analytics/top-performers
 * Query params:
 *   platform = 'youtube' | 'twitch'
 *   metric   = 'followers' | 'engagement_rate' | 'total_views'
 *   limit    = number (default 10)
 */
analyticsRouter.get('/top-performers', (req: Request, res: Response) => {
  const db = getDb();

  const {
    platform,
    metric = 'followers',
    limit = '10',
  } = req.query as Record<string, string>;

  const validMetrics = ['followers', 'engagement_rate', 'total_views'];
  const safeMetric = validMetrics.includes(metric) ? metric : 'followers';
  const safeLimit = Math.min(parseInt(limit, 10) || 10, 50);

  const platformFilter = platform ? 'AND c.platform = ?' : '';
  const params: string[] = platform ? [platform] : [];

  try {
    const rows = db.prepare(`
      SELECT
        c.id, c.platform, c.display_name, c.username, c.thumbnail_url, c.category, c.profile_url,
        s.followers, s.total_views, s.engagement_rate, s.is_live, s.snapshot_at
      FROM creators c
      JOIN creator_snapshots s ON s.id = (
        SELECT id FROM creator_snapshots WHERE creator_id = c.id ORDER BY snapshot_at DESC LIMIT 1
      )
      WHERE 1=1 ${platformFilter}
      ORDER BY s.${safeMetric} DESC
      LIMIT ?
    `).all(...params, safeLimit);

    res.json({ data: rows, metric: safeMetric });
  } catch (err) {
    res.status(500).json({ error: 'Query failed', detail: (err as Error).message });
  }
});

/**
 * GET /api/analytics/platform-breakdown
 * Per-platform aggregated stats with top creator per platform.
 */
analyticsRouter.get('/platform-breakdown', (_req: Request, res: Response) => {
  const db = getDb();

  try {
    const breakdown = db.prepare(`
      SELECT
        c.platform,
        COUNT(c.id) AS creator_count,
        SUM(s.followers) AS total_followers,
        AVG(s.followers) AS avg_followers,
        AVG(s.engagement_rate) AS avg_engagement_rate,
        MAX(s.engagement_rate) AS max_engagement_rate,
        SUM(s.total_views) AS total_views,
        SUM(CASE WHEN s.is_live = 1 THEN 1 ELSE 0 END) AS live_count
      FROM creators c
      JOIN creator_snapshots s ON s.id = (
        SELECT id FROM creator_snapshots WHERE creator_id = c.id ORDER BY snapshot_at DESC LIMIT 1
      )
      GROUP BY c.platform
      ORDER BY total_followers DESC
    `).all();

    res.json({ data: breakdown });
  } catch (err) {
    res.status(500).json({ error: 'Query failed', detail: (err as Error).message });
  }
});

/**
 * GET /api/analytics/trends
 * Query params:
 *   days     = number (default 30)
 *   platform = 'youtube' | 'twitch'
 * Returns daily aggregated followers and avg engagement rate.
 */
analyticsRouter.get('/trends', (req: Request, res: Response) => {
  const db = getDb();

  const { days = '30', platform } = req.query as Record<string, string>;
  const safeDays = Math.min(parseInt(days, 10) || 30, 365);

  const platformFilter = platform ? 'AND c.platform = ?' : '';
  const params: (string | number)[] = [-safeDays, ...(platform ? [platform] : [])];

  try {
    const rows = db.prepare(`
      SELECT
        DATE(s.snapshot_at) AS date,
        c.platform,
        AVG(s.followers) AS avg_followers,
        AVG(s.engagement_rate) AS avg_engagement_rate,
        COUNT(DISTINCT c.id) AS creator_count
      FROM creator_snapshots s
      JOIN creators c ON c.id = s.creator_id
      WHERE s.snapshot_at >= datetime('now', ? || ' days')
        ${platformFilter}
      GROUP BY DATE(s.snapshot_at), c.platform
      ORDER BY date ASC
    `).all(...params);

    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Query failed', detail: (err as Error).message });
  }
});
