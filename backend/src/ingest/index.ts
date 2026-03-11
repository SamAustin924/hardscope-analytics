import { fetchYouTubeCreators } from './youtube';
import { fetchTwitchCreators } from './twitch';
import { upsertCreator, logIngestResult } from './normalizer';
import { generateAlerts } from '../alerts';
import { logger } from '../utils/logger';

export async function runIngest(): Promise<{ youtube: number; twitch: number; errors: number }> {
  logger.info('[ingest] Starting data pull…');

  let youtubeCount = 0;
  let twitchCount = 0;
  let errors = 0;

  // Run both sources in parallel
  const [youtubeCreators, twitchCreators] = await Promise.all([
    fetchYouTubeCreators().catch(err => {
      logger.error(`[ingest] YouTube fatal: ${err.message}`);
      return [];
    }),
    fetchTwitchCreators().catch(err => {
      logger.error(`[ingest] Twitch fatal: ${err.message}`);
      return [];
    }),
  ]);

  // Upsert YouTube
  for (const creator of youtubeCreators) {
    try {
      upsertCreator(creator);
      youtubeCount++;
    } catch (err) {
      logger.warn(`[ingest] YouTube upsert failed for ${creator.username}: ${(err as Error).message}`);
      errors++;
    }
  }

  // Upsert Twitch
  for (const creator of twitchCreators) {
    try {
      upsertCreator(creator);
      twitchCount++;
    } catch (err) {
      logger.warn(`[ingest] Twitch upsert failed for ${creator.username}: ${(err as Error).message}`);
      errors++;
    }
  }

  logIngestResult('youtube', youtubeCount, 0);
  logIngestResult('twitch', twitchCount, 0);

  // Generate alerts based on new data
  try {
    generateAlerts();
  } catch (err) {
    logger.error(`[ingest] Alert generation failed: ${(err as Error).message}`);
  }

  logger.info(`[ingest] Done. YouTube: ${youtubeCount}, Twitch: ${twitchCount}, Errors: ${errors}`);
  return { youtube: youtubeCount, twitch: twitchCount, errors };
}
