// src/components/BottomNav.jsx
// 1 Bag Nomad — App shell bottom navigation (mobile)
// Design System v2 — LOCKED April 15 2026

import { NAV_ITEMS } from "./Sidebar";

export default function BottomNav({ activeScreen, onNavigate }) {
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        background: "rgba(10,7,5,0.95)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        zIndex: 1000,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          activeScreen === item.screen || (item.screen === "landing" && activeScreen === "console");
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.screen)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px 12px",
              position: "relative",
              minWidth: 44,
              minHeight: 44,
            }}
          >
            {isActive && (
              <div
                style={{
                  position: "absolute",
                  bottom: 2,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 20,
                  height: 3,
                  borderRadius: 2,
                  background: "#C9A04C",
                }}
              />
            )}
            <div
              style={{
                fontSize: 22,
                lineHeight: 1,
                color: isActive ? "#C9A04C" : "rgba(232,220,200,0.4)",
                transition: "color 0.2s ease",
              }}
            >
              {item.icon}
            </div>
            <span
              style={{
                fontFamily: "Instrument Sans, sans-serif",
                fontSize: 10,
                fontWeight: 500,
                color: isActive ? "#C9A04C" : "rgba(232,220,200,0.4)",
                letterSpacing: "0.5px",
                transition: "color 0.2s ease",
                lineHeight: 1,
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
