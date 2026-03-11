import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import type { TrendDataPoint } from '../types';

interface EngagementChartProps {
  data: TrendDataPoint[];
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube: '#FF0000',
  twitch: '#9146FF',
};

export default function EngagementChart({ data }: EngagementChartProps) {
  // Pivot: { date, youtube_eng, twitch_eng }
  const byDate = data.reduce<Record<string, Record<string, number>>>((acc, row) => {
    if (!acc[row.date]) acc[row.date] = { date: row.date as unknown as number };
    acc[row.date][`${row.platform}_eng`] = parseFloat((row.avg_engagement_rate * 100).toFixed(3));
    acc[row.date][`${row.platform}_followers`] = Math.round(row.avg_followers);
    return acc;
  }, {});

  const chartData = Object.values(byDate).sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );

  const platforms = [...new Set(data.map(d => d.platform))];

  if (chartData.length === 0) {
    return (
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 24,
        flex: '1 1 400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 8,
        color: 'var(--text-muted)',
        minHeight: 300,
      }}>
        <span style={{ fontSize: 32 }}>📈</span>
        <span>No trend data yet</span>
        <span style={{ fontSize: 12 }}>Trend data builds up after multiple syncs</span>
      </div>
    );
  }

  const formatDate = (d: string) => {
    const parts = String(d).split('-');
    return `${parts[1]}/${parts[2]}`;
  };

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: 24,
      flex: '1 1 400px',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 15 }}>Engagement Trend</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
        Avg engagement rate by platform over last 30 days
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={45}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
              fontSize: 13,
            }}
            formatter={(value: number) => [`${value}%`, 'Avg Engagement']}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend
            formatter={(value) => (
              <span style={{ color: 'var(--text)', fontSize: 13, textTransform: 'capitalize' }}>
                {value.replace('_eng', '')}
              </span>
            )}
          />
          {platforms.map(platform => (
            <Line
              key={platform}
              type="monotone"
              dataKey={`${platform}_eng`}
              name={`${platform}_eng`}
              stroke={PLATFORM_COLORS[platform] ?? 'var(--accent)'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
