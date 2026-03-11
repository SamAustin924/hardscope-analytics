import { Router, Request, Response } from 'express';
import { runIngest } from '../ingest';

export const ingestRouter = Router();

/**
 * POST /api/ingest/trigger
 * Manually trigger a data pull (useful for demos and dev).
 */
ingestRouter.post('/trigger', async (_req: Request, res: Response) => {
  try {
    const result = await runIngest();
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

/**
 * GET /api/ingest/status
 * Returns when the last ingest ran.
 */
ingestRouter.get('/status', (_req: Request, res: Response) => {
  const { getDb } = require('../db/database');
  const db = getDb();

  const row = db.prepare(
    'SELECT MAX(snapshot_at) as last_run, COUNT(*) as snapshot_count FROM creator_snapshots'
  ).get() as { last_run: string | null; snapshot_count: number };

  res.json({
    last_run: row.last_run,
    snapshot_count: row.snapshot_count,
  });
});
