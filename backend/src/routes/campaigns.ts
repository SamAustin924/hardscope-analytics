import { Router, Request, Response } from 'express';
import { getDb } from '../db/database';

export const campaignsRouter = Router();

/**
 * GET /api/campaigns
 * Query params: status = 'active' | 'completed' | 'paused'
 */
campaignsRouter.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { status } = req.query as Record<string, string>;

  const where = status ? 'WHERE status = ?' : '';
  const params = status ? [status] : [];

  try {
    const campaigns = db.prepare(`
      SELECT
        c.*,
        (SELECT COUNT(*) FROM campaign_creators cc WHERE cc.campaign_id = c.id) AS creator_count,
        (SELECT COALESCE(SUM(spend), 0) FROM campaign_creators cc WHERE cc.campaign_id = c.id) AS total_spend,
        (SELECT COALESCE(SUM(conversions), 0) FROM campaign_creators cc WHERE cc.campaign_id = c.id) AS total_conversions,
        (SELECT COALESCE(SUM(impressions), 0) FROM campaign_creators cc WHERE cc.campaign_id = c.id) AS total_impressions,
        (SELECT COALESCE(SUM(clicks), 0) FROM campaign_creators cc WHERE cc.campaign_id = c.id) AS total_clicks
      FROM campaigns c
      ${where}
      ORDER BY c.start_date DESC
    `).all(...params);

    res.json({ data: campaigns });
  } catch (err) {
    res.status(500).json({ error: 'Query failed', detail: (err as Error).message });
  }
});

/**
 * GET /api/campaigns/:id
 * Returns campaign + all assigned creators with their metrics
 */
campaignsRouter.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const { id } = req.params;

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const creators = db.prepare(`
    SELECT
      cr.id, cr.platform, cr.display_name, cr.username, cr.thumbnail_url, cr.profile_url,
      cc.spend, cc.impressions, cc.clicks, cc.conversions,
      CASE WHEN cc.clicks > 0 THEN ROUND(CAST(cc.conversions AS REAL) / cc.clicks * 100, 2) ELSE 0 END AS ctr,
      CASE WHEN cc.spend > 0 THEN ROUND(CAST(cc.conversions AS REAL) / cc.spend, 4) ELSE 0 END AS roas
    FROM campaign_creators cc
    JOIN creators cr ON cr.id = cc.creator_id
    WHERE cc.campaign_id = ?
    ORDER BY cc.spend DESC
  `).all(id);

  res.json({ data: { ...campaign as object, creators } });
});
