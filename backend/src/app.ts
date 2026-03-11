import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getDb } from './db/database';
import { creatorsRouter } from './routes/creators';
import { analyticsRouter } from './routes/analytics';
import { campaignsRouter } from './routes/campaigns';
import { alertsRouter } from './routes/alerts';
import { ingestRouter } from './routes/ingest';
import { startScheduler } from './scheduler';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/creators', creatorsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/ingest', ingestRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({ error: 'Internal server error' });
});

if (process.env.NODE_ENV !== 'test') {
  // Ensure DB is initialized before starting
  getDb();

  // Seed sample campaign data on first run
  const { seedCampaigns } = require('./db/seed');
  seedCampaigns();

  // Start recurring ingest scheduler
  startScheduler();

  app.listen(PORT, () => {
    logger.info(`HardScope API running on http://localhost:${PORT}`);
  });
}

export default app;
