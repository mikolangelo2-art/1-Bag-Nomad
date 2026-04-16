// src/components/AppHeader.jsx
// 1 Bag Nomad - Unified App Header
// Design System v2 - LOCKED April 15 2026

export default function AppHeader({
  mode = "utility",
  title = "",
  onBack = null,
  tripName = null,
  showExpeditionStatus = false,
  rightSlot = null,
}) {
  if (mode === "brand") {
    return (
      <header style={{ padding: "20px 20px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div
              style={{
                fontFamily: "Fraunces, serif",
                fontWeight: 400,
                fontSize: 22,
                color: "#E8DCC8",
                lineHeight: 1.1,
              }}
            >
              1 Bag Nomad
            </div>
            {showExpeditionStatus && (
              <div
                style={{
                  fontFamily: "Instrument Sans, sans-serif",
                  fontWeight: 500,
                  fontSize: 11,
                  color: "#5E8B8A",
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  marginTop: 2,
                }}
              >
                Expedition Active
              </div>
            )}
          </div>
          {rightSlot}
        </div>
        {tripName && (
          <div
            style={{
              fontFamily: "Fraunces, serif",
              fontWeight: 300,
              fontStyle: "italic",
              fontSize: 14,
              color: "#C9A04C",
              marginTop: 4,
            }}
          >
            {tripName}
          </div>
        )}
      </header>
    );
  }

  return (
    <header
      style={{
        height: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 16px",
        position: "relative",
      }}
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            position: "absolute",
            left: 20,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(232,220,200,0.7)",
            fontSize: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 44,
            minHeight: 44,
            padding: 0,
          }}
        >
          {"\u2190"}
        </button>
      )}
      <div
        style={{
          fontFamily: "Instrument Sans, sans-serif",
          fontWeight: 600,
          fontSize: 18,
          color: "#E8DCC8",
          letterSpacing: "-0.3px",
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </div>
      {rightSlot && <div style={{ position: "absolute", right: 20 }}>{rightSlot}</div>}
    </header>
  );
}
