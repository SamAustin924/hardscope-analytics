import cron from 'node-cron';
import { runIngest } from './ingest';
import { logger } from './utils/logger';

let isRunning = false;

export function startScheduler(): void {
  // Run every 6 hours — respects YouTube's 10,000 unit/day free quota
  // Cron: minute hour day month weekday
  const schedule = process.env.INGEST_CRON ?? '0 */6 * * *';

  cron.schedule(schedule, async () => {
    if (isRunning) {
      logger.warn('[scheduler] Previous ingest still running — skipping this tick');
      return;
    }
    isRunning = true;
    try {
      await runIngest();
    } catch (err) {
      logger.error(`[scheduler] Ingest error: ${(err as Error).message}`);
    } finally {
      isRunning = false;
    }
  });

  logger.info(`[scheduler] Ingest scheduled: "${schedule}"`);

  // Run immediately on startup so the dashboard has data right away
  setTimeout(async () => {
    isRunning = true;
    try {
      await runIngest();
    } catch (err) {
      logger.error(`[scheduler] Initial ingest error: ${(err as Error).message}`);
    } finally {
      isRunning = false;
    }
  }, 2000); // 2s delay to let Express fully start
}
