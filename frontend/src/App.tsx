import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import AlertBanner from './components/AlertBanner';
import StatsCards from './components/StatsCards';
import PlatformChart from './components/PlatformChart';
import EngagementChart from './components/EngagementChart';
import CreatorTable from './components/CreatorTable';
import CampaignPanel from './components/CampaignPanel';
import { useApi } from './hooks/useApi';
import {
  getSummary,
  getCreators,
  getAlerts,
  getCampaigns,
  getTrends,
  getPlatformBreakdown,
} from './api/client';
import type { Platform } from './types';

export default function App() {
  // Table state
  const [sortBy, setSortBy] = useState('followers');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [platform, setPlatform] = useState<Platform | ''>('');
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  // Refresh counter — incrementing forces all useApi hooks to refetch
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const summaryApi = useApi(() => getSummary(), [refreshKey]);
  const alertsApi = useApi(() => getAlerts({ resolved: 'false', limit: 5 }), [refreshKey]);
  const campaignsApi = useApi(() => getCampaigns('active'), [refreshKey]);
  const trendApi = useApi(() => getTrends({ days: 30 }), [refreshKey]);
  const breakdownApi = useApi(() => getPlatformBreakdown(), [refreshKey]);

  const creatorsApi = useApi(
    () => getCreators({ platform: platform || undefined, sortBy, order, limit: LIMIT, offset }),
    [refreshKey, platform, sortBy, order, offset]
  );

  const handleSort = (newSortBy: string, newOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setOrder(newOrder);
    setOffset(0);
  };

  const handleFilter = (p: Platform | '') => {
    setPlatform(p);
    setOffset(0);
  };

  const handleAlertResolve = (id: number) => {
    alertsApi.refetch();
  };

  const lastSync = summaryApi.data?.last_sync ?? null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header lastSync={lastSync} onRefresh={refresh} />

      {/* Alerts */}
      {alertsApi.data && alertsApi.data.data.length > 0 && (
        <AlertBanner alerts={alertsApi.data.data} onResolve={handleAlertResolve} />
      )}

      <main style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Summary Stats */}
        {summaryApi.data && <StatsCards summary={summaryApi.data} />}
        {summaryApi.loading && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '0' }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{
                height: 90, flex: '1 1 200px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', animation: 'shimmer 1.5s infinite',
                opacity: 0.6,
              }} />
            ))}
          </div>
        )}

        {/* Charts row */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {breakdownApi.data && breakdownApi.data.data.length > 0 && (
            <PlatformChart data={breakdownApi.data.data} />
          )}
          <EngagementChart data={trendApi.data?.data ?? []} />
        </div>

        {/* Creator Table */}
        <CreatorTable
          creators={creatorsApi.data?.data ?? []}
          total={creatorsApi.data?.meta.total ?? 0}
          loading={creatorsApi.loading}
          onSort={handleSort}
          onFilter={handleFilter}
          onPageChange={setOffset}
          sortBy={sortBy}
          order={order}
          platform={platform}
          offset={offset}
          limit={LIMIT}
        />

        {/* Campaign Panel */}
        {campaignsApi.data && <CampaignPanel campaigns={campaignsApi.data.data} />}

      </main>

      <style>{`
        @keyframes shimmer {
          0%,100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        @keyframes pulse {
          0%,100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
