function ProgDots({phaseId,segment,intelSnippet}) {
  const d=loadSeg()[`${phaseId}-${segment.id}`]||{};
  const dots=[!!(d.transport?.mode||d.transport?.cost),!!(d.stay?.name||d.stay?.cost),(d.activities?.length||0)>0,!!(d.food?.dailyBudget),(d.misc?.length||0)>0,!!(intelSnippet?.tagline||d.intel?.notes)];
  return(<div style={{display:"flex",gap:3,alignItems:"center",flexShrink:0}}>{dots.map((on,i)=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:on?CAT_DOT_COLORS[i]:"rgba(255,255,255,0.1)",boxShadow:on?`0 0 4px ${CAT_DOT_COLORS[i]}`:"none",transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",flexShrink:0}}/>)}</div>);
}


export default ProgDots;
