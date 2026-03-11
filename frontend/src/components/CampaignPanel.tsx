import React from 'react';
import type { Campaign } from '../types';

interface CampaignPanelProps {
  campaigns: Campaign[];
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n ?? 0);
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    active: { bg: 'rgba(34,197,94,0.15)', text: 'var(--green)' },
    completed: { bg: 'rgba(139,143,168,0.15)', text: 'var(--text-muted)' },
    paused: { bg: 'rgba(245,158,11,0.15)', text: 'var(--yellow)' },
  };
  const c = colors[status] ?? colors.paused;
  return (
    <span style={{
      background: c.bg, color: c.text,
      padding: '2px 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
    }}>
      {status}
    </span>
  );
}

export default function CampaignPanel({ campaigns }: CampaignPanelProps) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Active Campaigns</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Brand partnership performance</div>
      </div>

      {campaigns.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
          No campaigns found
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {campaigns.map((c, idx) => {
            const budgetPct = c.budget > 0 ? Math.min((c.total_spend / c.budget) * 100, 100) : 0;
            const ctr = c.total_clicks > 0
              ? ((c.total_conversions / c.total_clicks) * 100).toFixed(1)
              : '0.0';
            const roas = c.total_spend > 0
              ? (c.total_conversions / c.total_spend).toFixed(3)
              : '—';

            return (
              <div key={c.id} style={{
                padding: '14px 20px',
                borderBottom: idx < campaigns.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {c.brand} · {c.creator_count} creators
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>

                {/* Budget progress bar */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                    <span>Budget used</span>
                    <span>{formatCurrency(c.total_spend)} / {formatCurrency(c.budget)}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2 }}>
                    <div style={{
                      height: '100%',
                      width: `${budgetPct}%`,
                      background: budgetPct > 80 ? 'var(--red)' : budgetPct > 50 ? 'var(--yellow)' : 'var(--accent)',
                      borderRadius: 2,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>

                {/* Metrics row */}
                <div style={{ display: 'flex', gap: 20, fontSize: 12 }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Impressions</div>
                    <div style={{ fontWeight: 600 }}>{formatNumber(c.total_impressions)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Clicks</div>
                    <div style={{ fontWeight: 600 }}>{formatNumber(c.total_clicks)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Conversions</div>
                    <div style={{ fontWeight: 600, color: c.total_conversions > 0 ? 'var(--green)' : 'var(--text-muted)' }}>
                      {formatNumber(c.total_conversions)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>CTR</div>
                    <div style={{ fontWeight: 600 }}>{ctr}%</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>ROAS</div>
                    <div style={{ fontWeight: 600 }}>{roas}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
