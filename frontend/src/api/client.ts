import type {
  Creator,
  CreatorSnapshot,
  Alert,
  Campaign,
  AnalyticsSummary,
  PlatformBreakdown,
  TrendDataPoint,
  Platform,
} from '../types';

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

async function get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// Creators
export async function getCreators(params?: {
  platform?: Platform;
  minFollowers?: number;
  maxFollowers?: number;
  minEngagement?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}): Promise<{ data: Creator[]; meta: { total: number; limit: number; offset: number } }> {
  return get('/creators', params as Record<string, string | number | undefined>);
}

export async function getCreator(id: string): Promise<Creator> {
  return get(`/creators/${encodeURIComponent(id)}`);
}

export async function getCreatorSnapshots(
  id: string,
  days = 30
): Promise<{ data: CreatorSnapshot[] }> {
  return get(`/creators/${encodeURIComponent(id)}/snapshots`, { days });
}

// Analytics
export async function getSummary(): Promise<AnalyticsSummary> {
  return get('/analytics/summary');
}

export async function getTopPerformers(params?: {
  platform?: Platform;
  metric?: string;
  limit?: number;
}): Promise<{ data: Creator[]; metric: string }> {
  return get('/analytics/top-performers', params as Record<string, string | number | undefined>);
}

export async function getPlatformBreakdown(): Promise<{ data: PlatformBreakdown[] }> {
  return get('/analytics/platform-breakdown');
}

export async function getTrends(params?: {
  days?: number;
  platform?: Platform;
}): Promise<{ data: TrendDataPoint[] }> {
  return get('/analytics/trends', params as Record<string, string | number | undefined>);
}

// Alerts
export async function getAlerts(params?: {
  resolved?: 'true' | 'false';
  severity?: 'warning' | 'critical';
  limit?: number;
}): Promise<{ data: Alert[] }> {
  return get('/alerts', params as Record<string, string | number | undefined>);
}

export async function resolveAlert(id: number): Promise<{ success: boolean }> {
  const url = `${BASE}/alerts/${id}/resolve`;
  const res = await fetch(url, { method: 'PATCH' });
  return res.json();
}

// Campaigns
export async function getCampaigns(status?: string): Promise<{ data: Campaign[] }> {
  return get('/campaigns', status ? { status } : undefined);
}

// Ingest
export async function triggerIngest(): Promise<{ success: boolean; result: unknown }> {
  const res = await fetch(`${BASE}/ingest/trigger`, { method: 'POST' });
  return res.json();
}
