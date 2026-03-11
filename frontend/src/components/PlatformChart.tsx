import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { PlatformBreakdown } from '../types';

interface PlatformChartProps {
  data: PlatformBreakdown[];
}

const COLORS: Record<string, string> = {
  youtube: '#FF0000',
  twitch: '#9146FF',
};

const FALLBACK_COLORS = ['#6c63ff', '#22c55e', '#f59e0b', '#06b6d4'];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function PlatformChart({ data }: PlatformChartProps) {
  const chartData = data.map(d => ({
    name: d.platform.charAt(0).toUpperCase() + d.platform.slice(1),
    value: d.creator_count,
    followers: d.total_followers,
    engagement: (d.avg_engagement_rate * 100).toFixed(2),
    platform: d.platform,
  }));

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: 24,
      flex: '1 1 300px',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 15 }}>Platform Breakdown</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Creators by platform</div>

      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={4}
            dataKey="value"
          >
            {chartData.map((entry, idx) => (
              <Cell
                key={entry.name}
                fill={COLORS[entry.platform] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
              fontSize: 13,
            }}
            formatter={(value: number, _name: string, props: { payload?: { followers?: number; engagement?: string } }) => [
              `${value} creators`,
              `Followers: ${formatNumber(props.payload?.followers ?? 0)} · Avg Eng: ${props.payload?.engagement ?? 0}%`,
            ]}
          />
          <Legend
            formatter={(value) => (
              <span style={{ color: 'var(--text)', fontSize: 13 }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Stats table below chart */}
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((d, idx) => (
          <div key={d.platform} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px',
            background: 'var(--surface2)',
            borderRadius: 6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: COLORS[d.platform] ?? FALLBACK_COLORS[idx],
              }} />
              <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{d.platform}</span>
            </div>
            <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--text-muted)' }}>
              <span>{formatNumber(d.total_followers)} followers</span>
              <span>{(d.avg_engagement_rate * 100).toFixed(2)}% avg eng</span>
              {d.live_count > 0 && (
                <span style={{ color: 'var(--green)' }}>● {d.live_count} live</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
