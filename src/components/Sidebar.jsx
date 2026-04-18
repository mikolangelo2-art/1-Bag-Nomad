// src/components/Sidebar.jsx
// 1 Bag Nomad — Desktop Left Sidebar
// DS v2.1 §7d — 72px icon-only with hover tooltips (Sprint Day 20)

import { SIDEBAR_WIDTH } from '../constants/layout';

export const NAV_ITEMS = [
  { id: 'trip',     label: 'Trip',     icon: '✈',  screen: 'landing'  },
  { id: 'pack',     label: 'Pack',     icon: '◻',  screen: 'pack'     },
  { id: 'maps',     label: 'Maps',     icon: '◎',  screen: 'maps'     },
  { id: 'calendar', label: 'Calendar', icon: '▦',  screen: 'calendar' },
  { id: 'profile',  label: 'Profile',  icon: '◯',  screen: 'profile'  },
];

export default function Sidebar({ activeScreen, onNavigate }) {
  return (
    <aside style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: SIDEBAR_WIDTH,
      height: '100vh',
      background: '#0A0705',
      borderRight: '1px solid rgba(201,160,76,0.15)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 32,
      paddingBottom: 32,
      zIndex: 1000,
      backgroundImage: `
        radial-gradient(circle, rgba(201,160,76,0.06) 1px, transparent 1px),
        linear-gradient(#0A0705, #0A0705)
      `,
      backgroundSize: '20px 20px, 100% 100%',
    }}>
      {/* Logo mark top — 32px padding above handled by paddingTop */}
      <div
        aria-label="1 Bag Nomad"
        style={{
          width: 32, height: 32, marginBottom: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, color: '#C9A04C',
        }}
      >
        ✈
      </div>

      {/* Nav items — icon-only, 28px gap per §7d */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, flex: 1, width: '100%', alignItems: 'center' }}>
        {NAV_ITEMS.map(item => {
          const isActive = activeScreen === item.screen
            || (item.screen === 'landing' && activeScreen === 'console');
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.screen)}
              title={item.label}
              aria-label={item.label}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                width: 44, height: 44,
                background: 'none', border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute', left: -14,
                  top: '50%', transform: 'translateY(-50%)',
                  width: 3, height: 44,
                  borderRadius: '0 2px 2px 0',
                  background: '#C9A04C',
                }} />
              )}
              <span style={{
                fontSize: 22, lineHeight: 1,
                color: isActive ? '#C9A04C' : 'rgba(232,220,200,0.5)',
                transition: 'color 0.2s ease',
              }}>
                {item.icon}
              </span>
            </button>
          );
        })}
      </div>

      {/* Profile avatar anchored bottom — 32px from bottom handled by paddingBottom */}
      <button
        onClick={() => onNavigate('profile')}
        title="Profile"
        aria-label="Profile"
        style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(201,160,76,0.15)',
          border: `1px solid ${activeScreen === 'profile' ? '#C9A04C' : 'rgba(201,160,76,0.3)'}`,
          cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          transition: 'border-color 0.2s ease',
          padding: 0,
        }}
      >
        <span style={{ color: '#C9A04C', fontSize: 13 }}>◯</span>
      </button>
    </aside>
  );
}
