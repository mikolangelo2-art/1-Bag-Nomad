// src/components/TripReadinessBar.jsx
// DS v2.1 §5d — Trip Readiness Bar with Depth 1 snapshot interaction
// Lives in Row 2 of Landing Tier 2a Hero Header

import { useEffect, useRef, useState } from 'react';

const LABEL_COLOR = 'rgba(232,220,200,0.55)';
const VALUE_COLOR = 'rgba(232,220,200,0.85)';
const TRACK_COLOR = 'rgba(255,255,255,0.08)';
const GOLD = '#C9A04C';
const GOLD_40 = 'rgba(201,160,76,0.40)';
const GOLD_18 = 'rgba(201,160,76,0.18)';
const GREEN = '#69F0AE';
const RED = '#FF6B6B';
const CREAM = '#E8DCC8';
const CREAM_40 = 'rgba(232,220,200,0.40)';
const GLASS_BG = 'rgba(23,27,32,0.65)';

// Phase 1A — hardcoded sample snapshot content.
// Phase 1B will derive these from tripData, packList, docsState.
const SNAPSHOTS = {
  pack: {
    title: 'Pack',
    openTarget: 'pack',
    rows: [
      { icon: 'check',   text: '28 of 45 items owned' },
      { icon: 'warn',    text: '3.2 lbs over target weight' },
      { icon: 'open',    text: '17 items still to acquire' },
      { icon: 'next',    text: 'Next: rain shell (25-30L)' },
    ],
  },
  travel: {
    title: 'Travel',
    openTarget: 'maps',
    rows: [
      { icon: 'check',   text: 'Tokyo arrival confirmed, Jun 1' },
      { icon: 'open',    text: '3 of 4 legs unbooked' },
      { icon: 'next',    text: 'Next: Tokyo to Kyoto shinkansen' },
    ],
  },
  stay: {
    title: 'Stay',
    openTarget: 'console',
    rows: [
      { icon: 'check',   text: '14 of 31 nights confirmed' },
      { icon: 'open',    text: '17 nights to reserve' },
      { icon: 'next',    text: 'Next: Kyoto ryokan, 3 nights' },
    ],
  },
  docs: {
    title: 'Docs',
    openTarget: 'profile',
    rows: [
      { icon: 'check',   text: 'Passport valid through 2028' },
      { icon: 'check',   text: 'Japan entry cleared' },
      { icon: 'warn',    text: 'Caribbean visa pending' },
      { icon: 'open',    text: 'Dive insurance expires Jun 15' },
    ],
  },
};

// §8b Status Icon Semantic System
const ICON = {
  check: { glyph: '✓', color: GREEN },   // done
  open:  { glyph: '○', color: CREAM_40 }, // pending
  warn:  { glyph: '⚠', color: RED },     // blocker
  next:  { glyph: '✦', color: GOLD },    // next action
};

function StatusRow({ icon, text }) {
  const i = ICON[icon] || ICON.open;
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '6px 0',
      gap: 10,
    }}>
      <span style={{
        fontSize: 14,
        color: i.color,
        lineHeight: 1,
        width: 16,
        display: 'inline-flex',
        justifyContent: 'center',
      }}>
        {i.glyph}
      </span>
      <span style={{
        fontFamily: 'Instrument Sans, sans-serif',
        fontWeight: 400,
        fontSize: 13,
        color: VALUE_COLOR,
        letterSpacing: '0.1px',
      }}>
        {text}
      </span>
    </div>
  );
}

export default function TripReadinessBar({
  packReady = 0,
  travelBooked = 0,
  stayConfirmed = 0,
  docsInOrder = 0,
  onNavigate,   // optional: (screen: string) => void — for "Open X" CTA
}) {
  const total = Math.round(
    (packReady * 0.25) +
    (travelBooked * 0.25) +
    (stayConfirmed * 0.25) +
    (docsInOrder * 0.25)
  );

  const [fillPct, setFillPct] = useState(0);
  const [openMetric, setOpenMetric] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setFillPct(total), 200);
    return () => clearTimeout(t);
  }, [total]);

  // Close snapshot on outside click
  useEffect(() => {
    if (!openMetric) return;
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenMetric(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMetric]);

  const subMetrics = [
    { key: 'pack',   label: 'Pack',   value: packReady },
    { key: 'travel', label: 'Travel', value: travelBooked },
    { key: 'stay',   label: 'Stay',   value: stayConfirmed },
    { key: 'docs',   label: 'Docs',   value: docsInOrder },
  ];

  const snap = openMetric ? SNAPSHOTS[openMetric] : null;

  return (
    <div ref={containerRef} style={{ marginTop: 16 }}>
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

      {/* Sub-metrics row — tappable */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        marginTop: 10,
        flexWrap: 'wrap',
      }}>
        {subMetrics.map((m, i) => {
          const isOpen = openMetric === m.key;
          return (
            <span key={m.key} style={{ display: 'inline-flex', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setOpenMetric(isOpen ? null : m.key)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px 0',
                  cursor: 'pointer',
                  fontFamily: 'Instrument Sans, sans-serif',
                  fontWeight: 500,
                  fontSize: 12,
                  letterSpacing: '0.3px',
                  color: isOpen ? GOLD : CREAM,
                  opacity: isOpen ? 1 : 0.85,
                  transition: 'color 0.2s ease, opacity 0.2s ease',
                }}
                onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.opacity = 1; }}
                onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.opacity = 0.85; }}
              >
                <span style={{ color: isOpen ? GOLD : LABEL_COLOR, fontWeight: 400 }}>{m.label}</span>
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
          );
        })}
      </div>

      {/* Depth 1 snapshot panel */}
      {snap && (
        <div style={{
          marginTop: 12,
          background: GLASS_BG,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${GOLD_18}`,
          borderRadius: 16,
          padding: '16px 20px',
          animation: 'trbPanelIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {snap.rows.map((row, i) => (
            <StatusRow key={i} icon={row.icon} text={row.text} />
          ))}

          {onNavigate && snap.openTarget && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: 8,
              paddingTop: 8,
              borderTop: `1px solid ${GOLD_40}`,
              borderTopStyle: 'solid',
              borderTopColor: 'rgba(201,160,76,0.12)',
            }}>
              <button
                type="button"
                onClick={() => onNavigate(snap.openTarget)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontFamily: 'Instrument Sans, sans-serif',
                  fontWeight: 500,
                  fontSize: 13,
                  color: GOLD,
                  letterSpacing: '0.2px',
                }}
              >
                Open {snap.title} →
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes trbPanelIn {
          from { opacity: 0; transform: translateY(-6px); max-height: 0; }
          to   { opacity: 1; transform: translateY(0); max-height: 400px; }
        }
      `}</style>
    </div>
  );
}
