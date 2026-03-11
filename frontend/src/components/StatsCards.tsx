import React from 'react';
import type { AnalyticsSummary } from '../types';

interface StatsCardsProps {
  summary: AnalyticsSummary;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface CardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}

function Card({ label, value, sub, accent }: CardProps) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '20px 24px',
      flex: '1 1 200px',
    }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent ?? 'var(--text)', letterSpacing: '-0.5px' }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

export default function StatsCards({ summary }: StatsCardsProps) {
  const { creators, campaigns, live_count, by_platform } = summary;

  const topPlatform = by_platform.sort((a, b) => b.creator_count - a.creator_count)[0];
  const avgEngPct = ((creators.avg_engagement_rate ?? 0) * 100).toFixed(2);
  const budgetUsed = campaigns.total_budget > 0
    ? Math.round((campaigns.total_spend / campaigns.total_budget) * 100)
    : 0;

  return (
    <div style={{
      display: 'flex',
      gap: 16,
      flexWrap: 'wrap',
      padding: '0 24px',
    }}>
      <Card
        label="Total Creators"
        value={formatNumber(creators.total_creators)}
        sub={`${formatNumber(creators.total_followers)} total followers`}
      />
      <Card
        label="Avg Engagement Rate"
        value={`${avgEngPct}%`}
        sub="views-to-follower ratio"
        accent={parseFloat(avgEngPct) > 3 ? 'var(--green)' : 'var(--text)'}
      />
      <Card
        label="Top Platform"
        value={topPlatform ? topPlatform.platform.charAt(0).toUpperCase() + topPlatform.platform.slice(1) : '—'}
        sub={topPlatform ? `${topPlatform.creator_count} creators tracked` : ''}
        accent="var(--accent)"
      />
      <Card
        label="Active Campaigns"
        value={String(campaigns.active ?? 0)}
        sub={`${budgetUsed}% budget deployed`}
      />
      <Card
        label="Live Right Now"
        value={String(live_count)}
        sub="streamers currently live"
        accent={live_count > 0 ? 'var(--green)' : 'var(--text)'}
      />
    </div>
  );
}
