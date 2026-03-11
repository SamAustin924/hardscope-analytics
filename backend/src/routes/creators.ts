import { Router, Request, Response } from 'express';
import { getDb } from '../db/database';

export const creatorsRouter = Router();

/**
 * GET /api/creators
 * Query params:
 *   platform       = 'youtube' | 'twitch'
 *   minFollowers   = number
 *   maxFollowers   = number
 *   minEngagement  = number (0–1)
 *   category       = string
 *   sortBy         = 'followers' | 'engagement_rate' | 'total_views' | 'display_name'
 *   order          = 'asc' | 'desc'
 *   limit          = number (default 50, max 200)
 *   offset         = number (default 0)
 */
creatorsRouter.get('/', (req: Request, res: Response) => {
  const db = getDb();

  const {
    platform,
    minFollowers,
    maxFollowers,
    minEngagement,
    category,
    sortBy = 'followers',
    order = 'desc',
    limit = '50',
    offset = '0',
  } = req.query as Record<string, string>;

  const validSortBy = ['followers', 'engagement_rate', 'total_views', 'display_name'];
  const validOrder = ['asc', 'desc'];

  const safeSortBy = validSortBy.includes(sortBy) ? sortBy : 'followers';
  const safeOrder = validOrder.includes(order) ? order : 'desc';
  const safeLimit = Math.min(parseInt(limit, 10) || 50, 200);
  const safeOffset = parseInt(offset, 10) || 0;

  const conditions: string[] = [];
  const params: Record<string, string | number | null> = {};

  if (platform) {
    conditions.push('c.platform = @platform');
    params.platform = platform;
  }
  if (minFollowers) {
    conditions.push('s.followers >= @minFollowers');
    params.minFollowers = parseInt(minFollowers, 10);
  }
  if (maxFollowers) {
    conditions.push('s.followers <= @maxFollowers');
    params.maxFollowers = parseInt(maxFollowers, 10);
  }
  if (minEngagement) {
    conditions.push('s.engagement_rate >= @minEngagement');
    params.minEngagement = parseFloat(minEngagement);
  }
  if (category) {
    conditions.push('c.category LIKE @category');
    params.category = `%${category}%`;
  }

  const where = conditions.length ? `AND ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      c.*,
      s.followers,
      s.total_views,
      s.video_count,
      s.engagement_rate,
      s.is_live,
      s.snapshot_at
    FROM creators c
    JOIN creator_snapshots s ON s.id = (
      SELECT id FROM creator_snapshots
      WHERE creator_id = c.id
      ORDER BY snapshot_at DESC
      LIMIT 1
    )
    WHERE 1=1 ${where}
    ORDER BY s.${safeSortBy} ${safeOrder}
    LIMIT @limit OFFSET @offset
  `;

  const countQuery = `
    SELECT COUNT(*) as total
    FROM creators c
    JOIN creator_snapshots s ON s.id = (
      SELECT id FROM creator_snapshots
      WHERE creator_id = c.id
      ORDER BY snapshot_at DESC
      LIMIT 1
    )
    WHERE 1=1 ${where}
  `;

  try {
    const data = db.prepare(query).all({ ...params, limit: safeLimit, offset: safeOffset });
    const { total } = db.prepare(countQuery).get(params) as { total: number };

    res.json({
      data,
      meta: { total, limit: safeLimit, offset: safeOffset },
    });
  } catch (err) {
    res.status(500).json({ error: 'Query failed', detail: (err as Error).message });
  }
});

/**
 * GET /api/creators/:id
 */
creatorsRouter.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const { id } = req.params;

  const creator = db.prepare(`
    SELECT c.*, s.followers, s.total_views, s.video_count, s.engagement_rate, s.is_live, s.snapshot_at
    FROM creators c
    JOIN creator_snapshots s ON s.id = (
      SELECT id FROM creator_snapshots WHERE creator_id = c.id ORDER BY snapshot_at DESC LIMIT 1
    )
    WHERE c.id = ?
  `).get(id);

  if (!creator) {
    return res.status(404).json({ error: 'Creator not found' });
  }

  res.json(creator);
});

/**
 * GET /api/creators/:id/snapshots
 * Query params: days = number (default 30)
 */
creatorsRouter.get('/:id/snapshots', (req: Request, res: Response) => {
  const db = getDb();
  const { id } = req.params;
  const days = parseInt(req.query.days as string, 10) || 30;

  const creator = db.prepare('SELECT id FROM creators WHERE id = ?').get(id);
  if (!creator) {
    return res.status(404).json({ error: 'Creator not found' });
  }

  const snapshots = db.prepare(`
    SELECT * FROM creator_snapshots
    WHERE creator_id = ?
      AND snapshot_at >= datetime('now', ? || ' days')
    ORDER BY snapshot_at ASC
  `).all(id, -days);

  res.json({ data: snapshots });
});
