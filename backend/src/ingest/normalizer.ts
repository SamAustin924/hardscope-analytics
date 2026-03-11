import { NormalizedCreator } from '../types';
import { getDb } from '../db/database';
import { logger } from '../utils/logger';

/**
 * Upserts a normalized creator + snapshot into the DB.
 * Returns the creator ID.
 */
export function upsertCreator(data: NormalizedCreator): string {
  const db = getDb();
  const id = `${data.platform}:${data.external_id}`;

  const upsert = db.prepare(`
    INSERT INTO creators (id, platform, external_id, username, display_name, category, description, thumbnail_url, profile_url, updated_at)
    VALUES (@id, @platform, @external_id, @username, @display_name, @category, @description, @thumbnail_url, @profile_url, CURRENT_TIMESTAMP)
    ON CONFLICT(platform, external_id) DO UPDATE SET
      username      = excluded.username,
      display_name  = excluded.display_name,
      category      = excluded.category,
      description   = excluded.description,
      thumbnail_url = excluded.thumbnail_url,
      profile_url   = excluded.profile_url,
      updated_at    = CURRENT_TIMESTAMP
  `);

  const insertSnapshot = db.prepare(`
    INSERT INTO creator_snapshots (creator_id, followers, total_views, video_count, engagement_rate, is_live)
    VALUES (@creator_id, @followers, @total_views, @video_count, @engagement_rate, @is_live)
  `);

  // node:sqlite has no db.transaction() helper — use manual BEGIN/COMMIT
  db.exec('BEGIN');
  try {
    upsert.run({
      id,
      platform: data.platform,
      external_id: data.external_id,
      username: data.username,
      display_name: data.display_name,
      category: data.category,
      description: data.description,
      thumbnail_url: data.thumbnail_url,
      profile_url: data.profile_url,
    });

    insertSnapshot.run({
      creator_id: id,
      followers: data.snapshot.followers,
      total_views: data.snapshot.total_views,
      video_count: data.snapshot.video_count,
      engagement_rate: data.snapshot.engagement_rate,
      is_live: data.snapshot.is_live ? 1 : 0,
    });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return id;
}

/**
 * Computes engagement rate as: avg_views_per_video / followers (capped at 1.0)
 * Returns 0 if followers is 0 to avoid division by zero.
 */
export function computeEngagementRate(
  totalViews: number,
  videoCount: number | null,
  followers: number
): number {
  if (!followers || followers === 0) return 0;
  if (!videoCount || videoCount === 0) return 0;
  const avgViews = totalViews / videoCount;
  const rate = avgViews / followers;
  return Math.min(parseFloat(rate.toFixed(4)), 1.0);
}

/**
 * Safely parses an integer, returning 0 for null/undefined/NaN.
 */
export function safeInt(val: unknown): number {
  const n = parseInt(String(val), 10);
  return isNaN(n) ? 0 : n;
}

export function logIngestResult(platform: string, succeeded: number, failed: number): void {
  logger.info(`[ingest:${platform}] ${succeeded} upserted, ${failed} failed`);
}
