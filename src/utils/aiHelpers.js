export async function askAI(prompt, max = 900, temperature = 1.0, _attempt = 0) {
  const r = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: max,
      temperature,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  let d = {};
  try {
    d = await r.json();
  } catch {
    throw new Error("Bad response from AI service");
  }

  // 529 Overloaded — retry once after 2s delay
  if (r.status === 529 && _attempt === 0) {
    await new Promise((res) => setTimeout(res, 2000));
    return askAI(prompt, max, temperature, 1);
  }

  if (!r.ok) {
    const msg = d.error?.message || d.message || `Request failed (${r.status})`;
    throw new Error(msg);
  }
  if (d.error) {
    throw new Error(d.error.message || String(d.error));
  }
  const text = d.content?.find((c) => c.type === "text")?.text || "";
  if (!text.trim()) {
    throw new Error("Empty response from AI — try again");
  }
  return text;
}

export function parseJSON(raw) {
  if(!raw)return null;
  for(const fn of [s=>JSON.parse(s), s=>JSON.parse(s.replace(/`json\s*/gi,"").replace(/`\s*/gi,"").trim()), s=>{const m=s.match(/{[\s\S]*}/);if(m)return JSON.parse(m[0]);throw 0;}, s=>{const a=s.indexOf("{"),b=s.lastIndexOf("}");if(a!==-1&&b>a)return JSON.parse(s.slice(a,b+1));throw 0;}]) {
    try{return fn(raw);}catch(e){}
  }
  return null;
}
