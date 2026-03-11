import React from 'react';
import type { Alert } from '../types';
import { resolveAlert } from '../api/client';

interface AlertBannerProps {
  alerts: Alert[];
  onResolve: (id: number) => void;
}

const TYPE_LABELS: Record<string, string> = {
  engagement_drop: 'Engagement Drop',
  zero_conversions: 'Zero Conversions',
  high_spend_low_roi: 'High Spend / Low ROI',
};

export default function AlertBanner({ alerts, onResolve }: AlertBannerProps) {
  if (alerts.length === 0) return null;

  const handleResolve = async (id: number) => {
    await resolveAlert(id);
    onResolve(id);
  };

  return (
    <div style={{ padding: '12px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {alerts.map(alert => (
        <div key={alert.id} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: alert.severity === 'critical'
            ? 'rgba(239,68,68,0.1)'
            : 'rgba(245,158,11,0.1)',
          border: `1px solid ${alert.severity === 'critical' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
          borderRadius: 8,
          padding: '10px 14px',
        }}>
          <span style={{ fontSize: 16 }}>
            {alert.severity === 'critical' ? '🔴' : '🟡'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: alert.severity === 'critical' ? 'var(--red)' : 'var(--yellow)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginRight: 8,
            }}>
              {TYPE_LABELS[alert.type] ?? alert.type}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text)' }}>{alert.message}</span>
          </div>
          <button
            onClick={() => handleResolve(alert.id)}
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              padding: '3px 8px',
              border: '1px solid var(--border)',
              borderRadius: 4,
              background: 'transparent',
            }}
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
