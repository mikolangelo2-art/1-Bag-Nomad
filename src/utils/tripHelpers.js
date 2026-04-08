import { CAT_DOT_COLORS } from '../constants/colors';

export const COUNTRY_FLAGS={"Honduras":"🇭🇳","Belize":"🇧🇿","Barbados":"🇧🇧","Egypt":"🇪🇬","India":"🇮🇳","Indonesia":"🇮🇩","Malaysia":"🇲🇾","Thailand":"🇹🇭"};

export function toSegPhases(phases=[]) {
  // Group consecutive phases by country
  const groups=[];
  phases.forEach((p)=>{
    const last=groups[groups.length-1];
    if(last&&last.country===p.country){
      last.phases.push(p);
    } else {
      groups.push({country:p.country||"Unknown",phases:[p]});
    }
  });
  return groups.map((g,i)=>{
    const first=g.phases[0],last=g.phases[g.phases.length-1];
    const totalNights=g.phases.reduce((s,p)=>s+(p.nights||0),0);
    const totalBudget=g.phases.reduce((s,p)=>s+(p.budget||p.cost||0),0);
    const totalDives=g.phases.reduce((s,p)=>s+(p.diveCount||0),0);
    // Use color of first phase in country group
    const color=first.color||CAT_DOT_COLORS[i%6];
    return {
      id:i+1, name:g.country, flag:COUNTRY_FLAGS[g.country]||first.flag||"🌍",
      color, country:g.country, note:first.note||"",
      totalNights, totalBudget, totalDives,
      arrival:first.arrival||"", departure:last.departure||"",
      segments:g.phases.map((p)=>({
        id:String(p.id)+"a", name:p.name||p.destination||"Unnamed",
        type:p.type||"Exploration", nights:p.nights||0, budget:p.budget||p.cost||0,
        diveCount:p.diveCount||0, arrival:p.arrival||"", departure:p.departure||"",
        note:p.note||"", country:p.country||"",
      })),
    };
  });
}

/** Derived planned spend for a segmented phase (country group): sum of segment details, never persisted. */
export function computePhasePlannedSpend(phase, allSegD) {
  const out = { total: 0, transport: 0, stay: 0, activities: 0, food: 0 };
  const store = allSegD && typeof allSegD === "object" ? allSegD : {};
  const pid = phase?.id;
  const segments = phase?.segments;
  if (pid == null || !Array.isArray(segments)) return out;
  for (const seg of segments) {
    const d = store[`${pid}-${seg.id}`] || {};
    const t = Number(d.transport?.cost) || 0;
    const s = Number(d.stay?.cost) || 0;
    let a = 0;
    for (const act of d.activities || []) a += Number(act?.cost) || 0;
    const nights = Number(seg.nights) || 0;
    const f = (Number(d.food?.dailyBudget) || 0) * nights;
    out.transport += t;
    out.stay += s;
    out.activities += a;
    out.food += f;
  }
  out.total = out.transport + out.stay + out.activities + out.food;
  return out;
}
