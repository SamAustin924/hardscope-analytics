import React, { useState } from 'react';
import type { Creator, Platform } from '../types';

interface CreatorTableProps {
  creators: Creator[];
  total: number;
  loading: boolean;
  onSort: (sortBy: string, order: 'asc' | 'desc') => void;
  onFilter: (platform: Platform | '') => void;
  onPageChange: (offset: number) => void;
  sortBy: string;
  order: 'asc' | 'desc';
  platform: Platform | '';
  offset: number;
  limit: number;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n ?? 0);
}

function EngagementBadge({ rate }: { rate: number }) {
  const pct = (rate * 100).toFixed(2);
  const color = rate >= 0.05 ? 'var(--green)' : rate >= 0.02 ? 'var(--yellow)' : 'var(--text-muted)';
  return (
    <span style={{
      color,
      fontWeight: 600,
      fontVariantNumeric: 'tabular-nums',
    }}>
      {pct}%
    </span>
  );
}

function PlatformBadge({ platform }: { platform: Platform }) {
  const colors: Record<Platform, { bg: string; text: string }> = {
    youtube: { bg: 'rgba(255,0,0,0.15)', text: '#FF4444' },
    twitch: { bg: 'rgba(145,70,255,0.15)', text: '#9146FF' },
  };
  const c = colors[platform];
  return (
    <span style={{
      background: c.bg,
      color: c.text,
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'capitalize',
    }}>
      {platform}
    </span>
  );
}

type SortField = 'followers' | 'engagement_rate' | 'total_views' | 'display_name';

interface ColDef {
  key: SortField | 'platform' | 'creator' | 'live';
  label: string;
  sortable: boolean;
}

const COLUMNS: ColDef[] = [
  { key: 'creator', label: 'Creator', sortable: false },
  { key: 'platform', label: 'Platform', sortable: false },
  { key: 'followers', label: 'Followers', sortable: true },
  { key: 'total_views', label: 'Total Views', sortable: true },
  { key: 'engagement_rate', label: 'Engagement', sortable: true },
  { key: 'live', label: 'Live', sortable: false },
];

export default function CreatorTable({
  creators,
  total,
  loading,
  onSort,
  onFilter,
  onPageChange,
  sortBy,
  order,
  platform,
  offset,
  limit,
}: CreatorTableProps) {
  const [searchText, setSearchText] = useState('');

  const handleSort = (key: string) => {
    if (key === sortBy) {
      onSort(key, order === 'desc' ? 'asc' : 'desc');
    } else {
      onSort(key, 'desc');
    }
  };

  const displayedCreators = searchText
    ? creators.filter(c =>
        c.display_name.toLowerCase().includes(searchText.toLowerCase()) ||
        c.username.toLowerCase().includes(searchText.toLowerCase())
      )
    : creators;

  const pages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}>
        <div style={{ fontWeight: 600, fontSize: 15, flex: 1 }}>
          Creator Roster
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
            {total} total
          </span>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search creators…"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '6px 12px',
            color: 'var(--text)',
            fontSize: 13,
            width: 180,
            outline: 'none',
          }}
        />

        {/* Platform filter */}
        <select
          value={platform}
          onChange={e => onFilter(e.target.value as Platform | '')}
          style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '6px 10px',
            color: 'var(--text)',
            fontSize: 13,
            outline: 'none',
          }}
        >
          <option value="">All Platforms</option>
          <option value="youtube">YouTube</option>
          <option value="twitch">Twitch</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.label}
                  {col.sortable && sortBy === col.key && (
                    <span style={{ marginLeft: 4 }}>{order === 'desc' ? '↓' : '↑'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COLUMNS.length} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading…
                </td>
              </tr>
            ) : displayedCreators.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No creators found. Run a sync to pull data.
                </td>
              </tr>
            ) : (
              displayedCreators.map((c, idx) => (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)')}
                >
                  {/* Creator */}
                  <td style={{ padding: '10px 16px' }}>
                    <a href={c.profile_url ?? '#'} target="_blank" rel="noreferrer" style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      {c.thumbnail_url ? (
                        <img
                          src={c.thumbnail_url}
                          alt={c.display_name}
                          style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'var(--accent-dim)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700, color: 'var(--accent)',
                        }}>
                          {c.display_name[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{c.display_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{c.username}</div>
                      </div>
                    </a>
                  </td>

                  {/* Platform */}
                  <td style={{ padding: '10px 16px' }}>
                    <PlatformBadge platform={c.platform} />
                  </td>

                  {/* Followers */}
                  <td style={{ padding: '10px 16px', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                    {formatNumber(c.followers)}
                  </td>

                  {/* Total Views */}
                  <td style={{ padding: '10px 16px', fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>
                    {formatNumber(c.total_views)}
                  </td>

                  {/* Engagement */}
                  <td style={{ padding: '10px 16px' }}>
                    <EngagementBadge rate={c.engagement_rate} />
                  </td>

                  {/* Live */}
                  <td style={{ padding: '10px 16px' }}>
                    {c.is_live === 1 ? (
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        color: 'var(--green)', fontSize: 12, fontWeight: 600,
                      }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: 'var(--green)', animation: 'pulse 2s infinite',
                        }} />
                        LIVE
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderTop: '1px solid var(--border)',
          fontSize: 13,
          color: 'var(--text-muted)',
        }}>
          <span>Page {currentPage} of {pages}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => onPageChange(offset - limit)}
              disabled={offset === 0}
              style={{
                padding: '4px 12px', borderRadius: 4,
                border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)',
                opacity: offset === 0 ? 0.4 : 1,
              }}
            >← Prev</button>
            <button
              onClick={() => onPageChange(offset + limit)}
              disabled={offset + limit >= total}
              style={{
                padding: '4px 12px', borderRadius: 4,
                border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)',
                opacity: offset + limit >= total ? 0.4 : 1,
              }}
            >Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
