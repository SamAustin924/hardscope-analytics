import fetch from 'node-fetch';
import { NormalizedCreator } from '../types';
import { safeInt } from './normalizer';
import { logger } from '../utils/logger';

const BASE_URL = 'https://api.twitch.tv/helix';
const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';

// Top Twitch streamers by username — public data, no user auth needed
const STREAMER_LOGINS = [
  'ninja',
  'shroud',
  'xqc',
  'pokimane',
  'timthetatman',
  'summit1g',
  'lirik',
  'sodapoppin',
  'hasanabi',
  'drlupo',
  'nickmercs',
  'auronplay',
  'rubius',
  'ibai',
  'tfue',
];

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAppToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret || clientId === 'your_twitch_client_id_here') {
    throw new Error('Twitch credentials not configured');
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Twitch token fetch failed: ${res.status} ${res.statusText}`);
  }

  const json = await res.json() as { access_token: string; expires_in: number };
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in - 60) * 1000, // 60s buffer
  };

  return cachedToken.token;
}

interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  description: string;
  profile_image_url: string;
  view_count: number;
  broadcaster_type: string;
}

interface TwitchStream {
  user_id: string;
  game_name: string;
  viewer_count: number;
  is_mature: boolean;
}

interface TwitchFollowerResponse {
  total: number;
}

async function fetchWithRetry<T>(
  url: string,
  headers: Record<string, string>,
  retries = 3
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('Retry-After') ?? '5', 10);
        logger.warn(`[twitch] Rate limited. Waiting ${retryAfter}s…`);
        await new Promise(r => setTimeout(r, retryAfter * 1000));
        continue;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      return (await res.json()) as T;
    } catch (err) {
      if (attempt === retries) throw err;
      logger.warn(`[twitch] Attempt ${attempt} failed: ${(err as Error).message}`);
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error('fetchWithRetry exhausted');
}

export async function fetchTwitchCreators(): Promise<NormalizedCreator[]> {
  const clientId = process.env.TWITCH_CLIENT_ID;

  if (!clientId || clientId === 'your_twitch_client_id_here') {
    logger.warn('[twitch] TWITCH_CLIENT_ID not set — skipping Twitch ingest');
    return [];
  }

  let token: string;
  try {
    token = await getAppToken();
  } catch (err) {
    logger.error(`[twitch] Auth failed: ${(err as Error).message}`);
    return [];
  }

  const headers = {
    'Client-ID': clientId,
    Authorization: `Bearer ${token}`,
  };

  // Fetch users in batches of 100 (Twitch max)
  const results: NormalizedCreator[] = [];
  const batchSize = 100;

  for (let i = 0; i < STREAMER_LOGINS.length; i += batchSize) {
    const batch = STREAMER_LOGINS.slice(i, i + batchSize);
    const params = batch.map(l => `login=${l}`).join('&');
    const url = `${BASE_URL}/users?${params}`;

    let usersData: { data: TwitchUser[] };
    try {
      usersData = await fetchWithRetry<{ data: TwitchUser[] }>(url, headers);
    } catch (err) {
      logger.error(`[twitch] Users fetch failed: ${(err as Error).message}`);
      continue;
    }

    // Fetch currently live streams for this batch
    const streamParams = batch.map(l => `user_login=${l}`).join('&');
    let streamsData: { data: TwitchStream[] } = { data: [] };
    try {
      streamsData = await fetchWithRetry<{ data: TwitchStream[] }>(
        `${BASE_URL}/streams?${streamParams}&first=100`,
        headers
      );
    } catch (err) {
      logger.warn(`[twitch] Streams fetch failed (non-fatal): ${(err as Error).message}`);
    }

    const liveMap = new Map<string, TwitchStream>(
      streamsData.data.map(s => [s.user_id, s])
    );

    for (const user of usersData.data) {
      try {
        // Fetch follower count per user (required separate endpoint in Helix)
        let followers = 0;
        try {
          const followerData = await fetchWithRetry<TwitchFollowerResponse>(
            `${BASE_URL}/channels/followers?broadcaster_id=${user.id}`,
            headers
          );
          followers = safeInt(followerData.total);
        } catch (err) {
          logger.warn(`[twitch] Follower fetch failed for ${user.login}: ${(err as Error).message}`);
        }

        const totalViews = safeInt(user.view_count);
        const liveStream = liveMap.get(user.id);
        const category = liveStream?.game_name ?? null;

        // Engagement proxy for Twitch: view_count / followers (lifetime ratio)
        const engagementRate =
          followers > 0 ? Math.min(parseFloat((totalViews / followers).toFixed(4)), 1.0) : 0;

        results.push({
          platform: 'twitch',
          external_id: user.id,
          username: user.login,
          display_name: user.display_name,
          category,
          description: user.description?.slice(0, 500) ?? null,
          thumbnail_url: user.profile_image_url ?? null,
          profile_url: `https://www.twitch.tv/${user.login}`,
          snapshot: {
            followers,
            total_views: totalViews,
            video_count: null, // Twitch doesn't expose this easily
            engagement_rate: engagementRate,
            is_live: liveMap.has(user.id),
          },
        });
      } catch (err) {
        logger.warn(`[twitch] Skipping ${user.login}: ${(err as Error).message}`);
      }
    }
  }

  logger.info(`[twitch] Fetched ${results.length} streamers`);
  return results;
}
