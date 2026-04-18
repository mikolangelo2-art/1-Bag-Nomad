// src/components/TripReadinessBar.jsx
// DS v2.1 §5d — Trip Readiness Bar
// Lives in Row 2 of Landing Tier 2a Hero Header

import { useEffect, useState } from 'react';

const LABEL_COLOR = 'rgba(232,220,200,0.55)';
const TRACK_COLOR = 'rgba(255,255,255,0.08)';
const GOLD = '#C9A04C';
const CREAM = '#E8DCC8';

export default function TripReadinessBar({
  packReady = 0,
  travelBooked = 0,
  stayConfirmed = 0,
  docsInOrder = 0,
  onSnapshot,   // optional: (metric: 'pack'|'travel'|'stay'|'docs') => void
}) {
  const total = Math.round(
    (packReady * 0.25) +
    (travelBooked * 0.25) +
    (stayConfirmed * 0.25) +
    (docsInOrder * 0.25)
  );

  // Animate fill on mount
  const [fillPct, setFillPct] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setFillPct(total), 200);
    return () => clearTimeout(t);
  }, [total]);

  const subMetrics = [
    { key: 'pack',   label: 'Pack',   value: packReady },
    { key: 'travel', label: 'Travel', value: travelBooked },
    { key: 'stay',   label: 'Stay',   value: stayConfirmed },
    { key: 'docs',   label: 'Docs',   value: docsInOrder },
  ];

  return (
    <div style={{ marginTop: 16 }}>
      {/* Row 1: label + percentage */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <span style={{
          fontFamily: 'Instrument Sans, sans-serif',
          fontWeight: 500,
          fontSize: 11,
          letterSpacing: '1.8px',
          textTransform: 'uppercase',
          color: LABEL_COLOR,
        }}>
          Trip Readiness
        </span>
        <span style={{
          fontFamily: 'Instrument Sans, sans-serif',
          fontWeight: 600,
          fontSize: 16,
          color: GOLD,
          letterSpacing: '-0.2px',
        }}>
          {total}%
        </span>
      </div>

      {/* Bar track + fill */}
      <div style={{
        width: '100%',
        height: 6,
        borderRadius: 3,
        background: TRACK_COLOR,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${fillPct}%`,
          height: '100%',
          background: GOLD,
          borderRadius: 3,
          transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }} />
      </div>

      {/* Sub-metrics row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        marginTop: 10,
        flexWrap: 'wrap',
      }}>
        {subMetrics.map((m, i) => (
          <span key={m.key} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => onSnapshot && onSnapshot(m.key)}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px 0',
                cursor: onSnapshot ? 'pointer' : 'default',
                fontFamily: 'Instrument Sans, sans-serif',
                fontWeight: 500,
                fontSize: 12,
                color: CREAM,
                letterSpacing: '0.3px',
                opacity: 0.85,
                transition: 'opacity 0.2s ease',
              }}
              onMouseEnter={(e) => { if (onSnapshot) e.currentTarget.style.opacity = 1; }}
              onMouseLeave={(e) => { if (onSnapshot) e.currentTarget.style.opacity = 0.85; }}
            >
              <span style={{ color: LABEL_COLOR, fontWeight: 400 }}>{m.label}</span>
              <span style={{ marginLeft: 6 }}>{m.value}%</span>
            </button>
            {i < subMetrics.length - 1 && (
              <span style={{
                color: GOLD,
                opacity: 0.4,
                margin: '0 10px',
                fontSize: 11,
              }}>
                ·
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
