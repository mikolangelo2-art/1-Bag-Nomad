/** Footer line for committed segment summary cards (Trip console workspace). */
export function returnToLogCopy(tabName) {
  const t = tabName && String(tabName).trim() ? String(tabName).trim() : "this";
  if (/^stay$/i.test(t)) {
    return "Locked in — dates, links, and notes live here whenever you want to refine them.";
  }
  return `Come back to this ${t} tab anytime to add bookings, reservations, or confirmed details.`;
}

/** Short confirmation shown on committed plan cards (aligned across Travel / Stay / Food / Activities). */
export function addedToPlanLine(kind) {
  const k = String(kind || "").toLowerCase();
  if (k === "transport" || k === "travel") {
    return "Transport leg added to your plan — edit times, costs, and booking links anytime.";
  }
  if (k === "stay") {
    return "Stay added to your plan.";
  }
  if (k === "food") {
    return "Food picks & daily budget saved to your plan.";
  }
  if (k === "activity" || k === "activities") {
    return "Activity added to your plan.";
  }
  return "Added to your plan.";
}
