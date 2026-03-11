import { Router, Request, Response } from 'express';
import { getDb } from '../db/database';

export const alertsRouter = Router();

/**
 * GET /api/alerts
 * Query params:
 *   resolved = 'true' | 'false' (default false)
 *   severity = 'warning' | 'critical'
 *   limit    = number (default 20)
 */
alertsRouter.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const {
    resolved = 'false',
    severity,
    limit = '20',
  } = req.query as Record<string, string>;

  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (resolved === 'false') {
    conditions.push('a.resolved_at IS NULL');
  } else if (resolved === 'true') {
    conditions.push('a.resolved_at IS NOT NULL');
  }

  if (severity) {
    conditions.push('a.severity = @severity');
    params.severity = severity;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const safeLimit = Math.min(parseInt(limit, 10) || 20, 100);

  try {
    const alerts = db.prepare(`
      SELECT
        a.*,
        c.display_name AS creator_name,
        c.platform,
        c.thumbnail_url,
        cam.name AS campaign_name
      FROM alerts a
      LEFT JOIN creators c ON c.id = a.creator_id
      LEFT JOIN campaigns cam ON cam.id = a.campaign_id
      ${where}
      ORDER BY a.created_at DESC
      LIMIT @limit
    `).all({ ...params, limit: safeLimit });

    res.json({ data: alerts });
  } catch (err) {
    res.status(500).json({ error: 'Query failed', detail: (err as Error).message });
  }
});

/**
 * PATCH /api/alerts/:id/resolve
 */
alertsRouter.patch('/:id/resolve', (req: Request, res: Response) => {
  const db = getDb();
  const { id } = req.params;

  const alert = db.prepare('SELECT id FROM alerts WHERE id = ?').get(id);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  db.prepare(
    "UPDATE alerts SET resolved_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(id);

  res.json({ success: true });
});
