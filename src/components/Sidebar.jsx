// src/components/Sidebar.jsx
// 1 Bag Nomad — Desktop Left Sidebar
// Design System v2 — LOCKED April 15 2026

export const NAV_ITEMS = [
  { id: 'trip',     label: 'TRIP',     icon: '✈',  screen: 'landing'  },
  { id: 'pack',     label: 'PACK',     icon: '◻',  screen: 'pack'     },
  { id: 'maps',     label: 'MAPS',     icon: '◎',  screen: 'maps'     },
  { id: 'calendar', label: 'CALENDAR', icon: '▦',  screen: 'calendar' },
  { id: 'profile',  label: 'PROFILE',  icon: '◯',  screen: 'profile'  },
];

export default function Sidebar({ activeScreen, onNavigate }) {
  return (
    <aside style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: 68,
      height: '100vh',
      background: '#0A0705',
      borderRight: '1px solid rgba(201,160,76,0.15)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 24,
      paddingBottom: 24,
      zIndex: 1000,
      backgroundImage: `
        radial-gradient(circle, rgba(201,160,76,0.06) 1px, transparent 1px),
        linear-gradient(#0A0705, #0A0705)
      `,
      backgroundSize: '20px 20px, 100% 100%',
    }}>
      {/* Logo mark */}
      <div style={{
        width: 32, height: 32, marginBottom: 32,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, color: '#C9A04C',
      }}>
        ✈
      </div>

      {/* Nav items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, width: '100%' }}>
        {NAV_ITEMS.map(item => {
          const isActive = activeScreen === item.screen
            || (item.screen === 'landing' && activeScreen === 'console');
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.screen)}
              style={{
                position: 'relative',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 4,
                padding: '12px 0',
                background: 'none', border: 'none',
                cursor: 'pointer', width: '100%',
              }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute', left: 0,
                  top: '50%', transform: 'translateY(-50%)',
                  width: 3, height: 24,
                  borderRadius: '0 2px 2px 0',
                  background: '#C9A04C',
                }} />
              )}
              <div style={{
                fontSize: 20, lineHeight: 1,
                color: isActive ? '#C9A04C' : 'rgba(232,220,200,0.4)',
                transition: 'color 0.2s ease',
              }}>
                {item.icon}
              </div>
              <span style={{
                fontFamily: 'Instrument Sans, sans-serif',
                fontSize: 9, fontWeight: 500,
                color: isActive ? '#C9A04C' : 'rgba(232,220,200,0.4)',
                letterSpacing: '0.8px', transition: 'color 0.2s ease', lineHeight: 1,
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Profile avatar anchored bottom */}
      <button
        onClick={() => onNavigate('profile')}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(201,160,76,0.15)',
          border: `2px solid ${activeScreen === 'profile' ? '#C9A04C' : 'rgba(201,160,76,0.3)'}`,
          cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 16, overflow: 'hidden',
          transition: 'border-color 0.2s ease',
        }}
      >
        <span style={{ color: '#C9A04C', fontSize: 14 }}>◯</span>
      </button>
    </aside>
  );
}
