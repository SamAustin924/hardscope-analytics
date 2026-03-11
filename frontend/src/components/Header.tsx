import React, { useState } from 'react';
import { triggerIngest } from '../api/client';

interface HeaderProps {
  lastSync: string | null;
  onRefresh: () => void;
}

export default function Header({ lastSync, onRefresh }: HeaderProps) {
  const [ingesting, setIngesting] = useState(false);

  const handleSync = async () => {
    setIngesting(true);
    try {
      await triggerIngest();
      setTimeout(onRefresh, 1500); // give DB a moment to write
    } catch {
      // silent — status visible in UI
    } finally {
      setIngesting(false);
    }
  };

  const syncLabel = lastSync
    ? `Last sync: ${new Date(lastSync).toLocaleTimeString()}`
    : 'No sync yet';

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 24px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 32, height: 32,
          background: 'var(--accent)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color: '#fff',
        }}>H</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>HardScope Analytics</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Creator Campaign Intelligence</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{syncLabel}</span>
        <button
          onClick={handleSync}
          disabled={ingesting}
          style={{
            background: ingesting ? 'var(--surface2)' : 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '6px 14px',
            fontSize: 13,
            fontWeight: 600,
            opacity: ingesting ? 0.7 : 1,
            transition: 'all 0.2s',
          }}
        >
          {ingesting ? 'Syncing…' : '↻ Sync Now'}
        </button>
      </div>
    </header>
  );
}
