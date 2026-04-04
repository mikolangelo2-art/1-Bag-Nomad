// ── Currency Formatting ──────────────────────────────────────
export const fmt = n => "$" + Math.round(n).toLocaleString();

// ── Date Math ────────────────────────────────────────────────
export const daysBetween = (d1, d2) => Math.round((new Date(d2) - new Date(d1)) / 86400000);

// ── Date Formatting ──────────────────────────────────────────
/** "Mar 15" */
export const fD = d => d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

/** "Mar 15, 26" */
export const fDS = d => d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "";
