// ── Currency Formatting ──────────────────────────────────────
export const fmt = n => "$" + Math.round(n).toLocaleString();

// ── Date Math ────────────────────────────────────────────────
export const daysBetween = (d1, d2) => Math.round((new Date(d2) - new Date(d1)) / 86400000);

// ── Date Formatting ──────────────────────────────────────────
/** "Mar 15" */
export const fD = d => d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

/** "Mar 15, 26" */
export const fDS = d => d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "";

/** Segment workspace card: "April 22–25, 2026 · 3 Nights" (en dash between dates). */
export function formatSegmentCardDateHeader(arrival, departure, nights) {
  const a = arrival ? new Date(arrival + "T12:00:00") : null;
  const b = departure ? new Date(departure + "T12:00:00") : null;
  let range = "";
  if (a && b) {
    const y1 = a.getFullYear();
    const y2 = b.getFullYear();
    const m1 = a.getMonth();
    const m2 = b.getMonth();
    const d1 = a.getDate();
    const d2 = b.getDate();
    if (y1 === y2 && m1 === m2) {
      const month = a.toLocaleDateString("en-US", { month: "long" });
      range = `${month} ${d1}\u2013${d2}, ${y1}`;
    } else if (y1 === y2) {
      range = `${a.toLocaleDateString("en-US", { month: "long", day: "numeric" })}\u2013${b.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
    } else {
      range = `${a.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}\u2013${b.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
    }
  } else if (a) {
    range = a.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } else if (b) {
    range = b.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }
  const n = Number(nights);
  const nightPart = Number.isFinite(n) && n > 0 ? `${n} Night${n === 1 ? "" : "s"}` : "";
  if (!range && !nightPart) return "";
  if (range && nightPart) return `${range} · ${nightPart}`;
  return range || nightPart;
}

/**
 * Format saved transport leg dates/times for the committed Travel summary card.
 * Returns "" when both departDate and arriveDate are empty (no line rendered).
 * Reads legacy depTime/arrTime into time slots when departTime/arriveTime are empty.
 */
export function formatTravelLegDates(t = {}) {
  if (!t || typeof t !== "object") return "";
  const dd = String(t.departDate ?? "").trim();
  const ad = String(t.arriveDate ?? "").trim();
  const dtm = String(t.departTime ?? "").trim() || String(t.depTime ?? "").trim();
  const atm = String(t.arriveTime ?? "").trim() || String(t.arrTime ?? "").trim();

  if (!dd && !ad) return "";

  const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso + "T12:00:00");
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (dd && ad) {
    if (dd === ad) {
      let s = fmtDate(dd);
      if (dtm && atm) s += ` · ${dtm} → ${atm}`;
      else if (dtm) s += ` · depart ${dtm}`;
      else if (atm) s += ` · arrive ${atm}`;
      return s;
    }
    let s = `${fmtDate(dd)} → ${fmtDate(ad)}`;
    if (dtm || atm) {
      const parts = [dtm || null, atm || null].filter(Boolean);
      if (parts.length) s += ` · ${parts.join(" → ")}`;
    }
    return s;
  }
  if (dd) {
    let s = fmtDate(dd);
    if (dtm) s += ` · ${dtm}`;
    return s;
  }
  if (ad) {
    let s = fmtDate(ad);
    if (atm) s += ` · ${atm}`;
    return s;
  }
  return "";
}
