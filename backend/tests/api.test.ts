import 'dotenv/config';
import request from 'supertest';
import app from '../src/app';
import { getDb, closeDb } from '../src/db/database';
import { upsertCreator } from '../src/ingest/normalizer';

// Use an in-memory-equivalent: override DB_PATH to a temp file
process.env.DB_PATH = './data/test-hardscope.db';
process.env.NODE_ENV = 'test';

beforeAll(() => {
  const db = getDb();

  // Insert seed creator
  upsertCreator({
    platform: 'youtube',
    external_id: 'UC_test_001',
    username: 'testcreator',
    display_name: 'Test Creator',
    category: 'Tech',
    description: 'A test creator',
    thumbnail_url: null,
    profile_url: 'https://youtube.com/channel/UC_test_001',
    snapshot: {
      followers: 500000,
      total_views: 25000000,
      video_count: 200,
      engagement_rate: 0.05,
      is_live: false,
    },
  });

  upsertCreator({
    platform: 'twitch',
    external_id: 'tw_test_001',
    username: 'twitchtest',
    display_name: 'Twitch Tester',
    category: 'Gaming',
    description: 'A twitch test streamer',
    thumbnail_url: null,
    profile_url: 'https://twitch.tv/twitchtest',
    snapshot: {
      followers: 200000,
      total_views: 5000000,
      video_count: null,
      engagement_rate: 0.03,
      is_live: true,
    },
  });
});

afterAll(() => {
  closeDb();
  // Clean up test DB
  const fs = require('fs');
  const path = require('path');
  const dbPath = path.resolve('./data/test-hardscope.db');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');
  if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
});

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('GET /api/creators', () => {
  it('returns paginated creator list', async () => {
    const res = await request(app).get('/api/creators');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
  });

  it('filters by platform=youtube', async () => {
    const res = await request(app).get('/api/creators?platform=youtube');
    expect(res.status).toBe(200);
    expect(res.body.data.every((c: { platform: string }) => c.platform === 'youtube')).toBe(true);
  });

  it('filters by platform=twitch', async () => {
    const res = await request(app).get('/api/creators?platform=twitch');
    expect(res.status).toBe(200);
    expect(res.body.data.every((c: { platform: string }) => c.platform === 'twitch')).toBe(true);
  });

  it('filters by minFollowers', async () => {
    const res = await request(app).get('/api/creators?minFollowers=300000');
    expect(res.status).toBe(200);
    expect(res.body.data.every((c: { followers: number }) => c.followers >= 300000)).toBe(true);
  });

  it('respects limit param', async () => {
    const res = await request(app).get('/api/creators?limit=1');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(1);
  });

  it('caps limit at 200', async () => {
    const res = await request(app).get('/api/creators?limit=9999');
    expect(res.status).toBe(200);
    expect(res.body.meta.limit).toBe(200);
  });
});

describe('GET /api/creators/:id', () => {
  it('returns a single creator', async () => {
    const res = await request(app).get('/api/creators/youtube:UC_test_001');
    expect(res.status).toBe(200);
    expect(res.body.display_name).toBe('Test Creator');
  });

  it('returns 404 for unknown creator', async () => {
    const res = await request(app).get('/api/creators/youtube:does_not_exist');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/creators/:id/snapshots', () => {
  it('returns snapshot history', async () => {
    const res = await request(app).get('/api/creators/youtube:UC_test_001/snapshots');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/analytics/summary', () => {
  it('returns summary stats', async () => {
    const res = await request(app).get('/api/analytics/summary');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('creators');
    expect(res.body.creators.total_creators).toBeGreaterThanOrEqual(2);
    expect(res.body).toHaveProperty('by_platform');
    expect(res.body).toHaveProperty('campaigns');
  });
});

describe('GET /api/analytics/top-performers', () => {
  it('returns top performers sorted by followers', async () => {
    const res = await request(app).get('/api/analytics/top-performers?metric=followers&limit=5');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    // Should be sorted desc by followers
    const followers = res.body.data.map((c: { followers: number }) => c.followers);
    for (let i = 1; i < followers.length; i++) {
      expect(followers[i - 1]).toBeGreaterThanOrEqual(followers[i]);
    }
  });
});

describe('GET /api/analytics/platform-breakdown', () => {
  it('returns platform breakdown', async () => {
    const res = await request(app).get('/api/analytics/platform-breakdown');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/campaigns', () => {
  it('returns campaigns array', async () => {
    const res = await request(app).get('/api/campaigns');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('GET /api/alerts', () => {
  it('returns alerts array', async () => {
    const res = await request(app).get('/api/alerts');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('404 handling', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/unknown-route');
    expect(res.status).toBe(404);
  });
});
