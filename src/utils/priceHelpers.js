// ── Per-Night Cost Estimation ─────────────────────────────────
/** Estimate total phase cost based on destination, country, trip type, and nights. */
export function estCost(dest, country, type, nights) {
  const d = (dest || "").toLowerCase(), c = (country || "").toLowerCase();
  if (["maldives","norway","switzerland","iceland","japan","australia"].some(r => d.includes(r) || c.includes(r))) return Math.round(nights * 220);
  if (["europe","portugal","spain","france","italy","greece","barbados","caribbean"].some(r => d.includes(r) || c.includes(r))) return Math.round(nights * 190);
  if (type === "Dive" && ["red sea","komodo","galapagos","liveaboard"].some(r => d.includes(r))) return Math.round(nights * 230);
  if (["mexico","colombia","south africa","egypt","brazil"].some(r => d.includes(r) || c.includes(r))) return Math.round(nights * 165);
  if (["thailand","vietnam","indonesia","bali","philippines"].some(r => d.includes(r) || c.includes(r))) return Math.round(nights * 145);
  if (["honduras","belize","guatemala","nicaragua"].some(r => d.includes(r) || c.includes(r))) return Math.round(nights * 155);
  if (["india","nepal","sri lanka"].some(r => d.includes(r) || c.includes(r))) return Math.round(nights * 130);
  return Math.round(nights * 170);
}
