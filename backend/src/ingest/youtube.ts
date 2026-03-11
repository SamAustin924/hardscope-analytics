import fetch from 'node-fetch';
import { NormalizedCreator } from '../types';
import { computeEngagementRate, safeInt } from './normalizer';
import { logger } from '../utils/logger';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Curated list of well-known creator channel IDs across categories.
// Free YouTube Data API v3 — no OAuth required for public channel data.
const CHANNEL_IDS = [
  'UCX6OQ3DkcsbYNE6H8uQQuVA', // MrBeast
  'UCbmNph6atAoGfqLoCL_duAg', // Technoblade
  'UCVhQ2NnY5Rskt6UjCUkJ_DA', // MKBHD (Marques Brownlee)
  'UCo8bcnLyZH8tBIH9V1mLgqQ', // Linus Tech Tips
  'UCBJycsmduvYEL83-oeldSFg', // MKBHD (fallback)
  'UC295-Dw4tzbRmc_7QZGGooA', // Smarter Every Day
  'UCnUYZLuoy1rq1aVMwx4aTzw', // Graham Stephan
  'UCEIwxahdLz7bap-VDs9h35A', // Steve Ramsey
  'UCaXkIU1QidjPwiAYu6GcHjg', // Mythpat
  'UCq-Fj5jknLsUf-MWSy4_brA', // T-Series
  'UC2DjFE7Xf11URZqWBigcVOQ', // HowToBasic
  'UCY30JRSgfhYXA6i6xX1erWg', // Nikkie Tutorials
];

interface YouTubeChannelItem {
  id: string;
  snippet?: {
    title?: string;
    customUrl?: string;
    description?: string;
    thumbnails?: { high?: { url?: string }; default?: { url?: string } };
    country?: string;
  };
  statistics?: {
    subscriberCount?: string;
    viewCount?: string;
    videoCount?: string;
    hiddenSubscriberCount?: boolean;
  };
  brandingSettings?: {
    channel?: { keywords?: string };
  };
}

interface YouTubeApiResponse {
  items?: YouTubeChannelItem[];
  error?: { message: string; code: number };
}

async function fetchWithRetry(url: string, retries = 3, delayMs = 1000): Promise<YouTubeApiResponse> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

      if (res.status === 429) {
        logger.warn(`[youtube] Rate limited. Attempt ${attempt}/${retries}. Waiting ${delayMs}ms…`);
        await new Promise(r => setTimeout(r, delayMs * attempt));
        continue;
      }

      const json = await res.json() as YouTubeApiResponse;

      if (json.error) {
        throw new Error(`YouTube API error ${json.error.code}: ${json.error.message}`);
      }

      return json;
    } catch (err) {
      if (attempt === retries) throw err;
      logger.warn(`[youtube] Fetch attempt ${attempt} failed: ${(err as Error).message}`);
      await new Promise(r => setTimeout(r, delayMs * attempt));
    }
  }
  return {};
}

export async function fetchYouTubeCreators(): Promise<NormalizedCreator[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey || apiKey === 'your_youtube_api_key_here') {
    logger.warn('[youtube] YOUTUBE_API_KEY not set — skipping YouTube ingest');
    return [];
  }

  const results: NormalizedCreator[] = [];

  // YouTube allows up to 50 IDs per request — batch them
  const batchSize = 50;
  for (let i = 0; i < CHANNEL_IDS.length; i += batchSize) {
    const batch = CHANNEL_IDS.slice(i, i + batchSize).join(',');
    const url = `${BASE_URL}/channels?part=snippet,statistics,brandingSettings&id=${batch}&key=${apiKey}`;

    let data: YouTubeApiResponse;
    try {
      data = await fetchWithRetry(url);
    } catch (err) {
      logger.error(`[youtube] Failed to fetch batch: ${(err as Error).message}`);
      continue;
    }

    for (const item of data.items ?? []) {
      try {
        const stats = item.statistics ?? {};
        const snippet = item.snippet ?? {};

        if (stats.hiddenSubscriberCount) {
          logger.warn(`[youtube] Channel ${item.id} has hidden subscriber count — skipping`);
          continue;
        }

        const followers = safeInt(stats.subscriberCount);
        const totalViews = safeInt(stats.viewCount);
        const videoCount = safeInt(stats.videoCount);
        const engagementRate = computeEngagementRate(totalViews, videoCount, followers);

        results.push({
          platform: 'youtube',
          external_id: item.id,
          username: snippet.customUrl?.replace('@', '') ?? item.id,
          display_name: snippet.title ?? item.id,
          category: snippet.country ?? null,
          description: snippet.description?.slice(0, 500) ?? null,
          thumbnail_url:
            snippet.thumbnails?.high?.url ?? snippet.thumbnails?.default?.url ?? null,
          profile_url: `https://www.youtube.com/channel/${item.id}`,
          snapshot: {
            followers,
            total_views: totalViews,
            video_count: videoCount || null,
            engagement_rate: engagementRate,
            is_live: false,
          },
        });
      } catch (err) {
        logger.warn(`[youtube] Skipping malformed channel ${item.id}: ${(err as Error).message}`);
      }
    }
  }

  logger.info(`[youtube] Fetched ${results.length} channels`);
  return results;
}
