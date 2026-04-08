/** Footer line for committed segment summary cards (Trip console workspace). */
export function returnToLogCopy(tabName) {
  const t = tabName && String(tabName).trim() ? String(tabName).trim() : "this";
  if (/^stay$/i.test(t)) {
    return "Locked in — dates, links, and notes live here whenever you want to refine them.";
  }
  return `Come back to this ${t} tab anytime to add bookings, reservations, or confirmed details.`;
}
