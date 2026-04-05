import { useState, useEffect } from "react";
import { fmt, fD, daysBetween } from '../utils/dateHelpers';

function Timeline({ tripData }) {
  const phases = tripData?.phases || [];
  const startDate = tripData?.startDate || "";
  const totalBudget = phases.reduce((s, p) => s + (p.budget || p.cost || 0), 0);
  const totalNights = phases.reduce((s, p) => s + (p.nights || 0), 0);
  const lastPhase = phases[phases.length - 1];
  const returnDate = lastPhase?.departure || "";
  const daysFromNow = startDate ? daysBetween(new Date().toISOString().split("T")[0], startDate) : null;

  if (!phases.length) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 20px",gap:12}}>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontStyle:"italic",color:"rgba(232,220,200,0.65)",letterSpacing:1}}>Your timeline is waiting.</div>
      <div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:13,color:"rgba(255,255,255,0.45)",letterSpacing:0.5}}>Build your expedition to see it come to life.</div>
    </div>
  );

  return (
    <div style={{padding:"20px 0 40px",position:"relative"}}>
      <div style={{background:'rgba(0,8,20,0.82)',borderRadius:12,padding:'28px 24px',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',margin:'0 auto',maxWidth:600}}>
      {/* Running total */}
      <div style={{textAlign:"center",marginBottom:28}}>
        <div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:11,color:"rgba(255,217,61,0.6)",letterSpacing:3,marginBottom:4}}>TOTAL EXPEDITION BUDGET</div>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:32,color:"#FFD93D",fontWeight:700}}>{fmt(totalBudget)}</div>
        <div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:4}}>{totalNights} nights · {phases.length} phases</div>
      </div>

      {/* Thread container */}
      <div style={{position:"relative",paddingLeft:28}}>
        {/* Vertical amber thread */}
        <div style={{position:"absolute",left:11,top:0,bottom:0,width:2,background:"rgba(255,159,67,0.35)"}}/>

        {/* Departure header */}
        <div style={{position:"relative",marginBottom:24,animation:"fadeUp 0.4s ease both"}}>
          <div style={{position:"absolute",left:-22,top:4,width:8,height:8,borderRadius:"50%",background:"#FFD93D",boxShadow:"0 0 8px rgba(255,217,61,0.5)"}}/>
          <div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:11,color:"rgba(255,217,61,0.6)",letterSpacing:3,marginBottom:4}}>DEPARTS</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:28,color:"#E8DCC8",fontWeight:500}}>{startDate ? fD(startDate) : "Date TBD"}</div>
          {daysFromNow !== null && daysFromNow > 0 && <div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:13,color:"#FFD93D",marginTop:4}}>{daysFromNow} DAYS FROM NOW</div>}
          {daysFromNow !== null && daysFromNow <= 0 && <div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:13,color:"#69F0AE",marginTop:4}}>EXPEDITION UNDERWAY</div>}
        </div>

        {/* Phase nodes */}
        {phases.map((phase, i) => (
          <div key={phase.id || i}>
            {/* Transport connector */}
            {i > 0 && <div style={{paddingLeft:6,marginBottom:8,marginTop:-4}}>
              <div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:11,color:"rgba(255,255,255,0.3)",letterSpacing:1}}>
                {phase.type === "Transit" ? "✈️ transit" : ""}
              </div>
            </div>}

            {/* Phase node */}
            <div style={{position:"relative",marginBottom:24,animation:"fadeUp 0.4s ease both",animationDelay:i * 0.1 + "s"}}>
              <div style={{position:"absolute",left:-22,top:6,width:8,height:8,borderRadius:"50%",background:phase.color || "#FF9F43",boxShadow:`0 0 6px ${phase.color || "#FF9F43"}55`}}/>
              <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:2}}>
                {phase.flag && <span style={{fontSize:18}}>{phase.flag}</span>}
                <div style={{fontFamily:"'Fraunces',serif",fontSize:24,color:"#E8DCC8",fontWeight:500}}>{phase.name || phase.destination}</div>
              </div>
              <div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:14,color:"rgba(255,255,255,0.55)",marginBottom:3}}>
                {phase.arrival && phase.departure ? `${fD(phase.arrival)} – ${fD(phase.departure)}` : "Dates TBD"}
              </div>
              <div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:16,color:"rgba(255,255,255,0.45)",display:"flex",gap:8}}>
                <span>{phase.nights}n</span>
                <span style={{color:"#FFD93D",fontWeight:600}}>{fmt(phase.budget || phase.cost || 0)}</span>
              </div>
            </div>
          </div>
        ))}

        {/* Homecoming footer */}
        <div style={{position:"relative",animation:"fadeUp 0.4s ease both",animationDelay:phases.length * 0.1 + "s"}}>
          <div style={{position:"absolute",left:-22,top:4,width:8,height:8,borderRadius:"50%",background:"#FFD93D",boxShadow:"0 0 8px rgba(255,217,61,0.5)"}}/>
          <div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:11,color:"rgba(255,217,61,0.6)",letterSpacing:3,marginBottom:4}}>HOMECOMING</div>
          {returnDate
            ? <div style={{fontFamily:"'Fraunces',serif",fontSize:22,fontStyle:"italic",color:"#FFD93D"}}>{fD(returnDate)}</div>
            : <div style={{fontFamily:"'Fraunces',serif",fontSize:22,fontStyle:"italic",color:"rgba(255,217,61,0.5)"}}>Open-ended expedition</div>
          }
        </div>
      </div>
      </div>
    </div>
  );
}

export default Timeline;
