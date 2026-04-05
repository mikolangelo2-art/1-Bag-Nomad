function BottomNav({activeTab,onTab}) {
  const NAV=[
    {id:"next",  icon:"🧭",lbl:"TRIP",   glowColor:"rgba(0,229,255,0.6)",   glowFaint:"rgba(0,229,255,0.2)"},
    {id:"budget",icon:"💰",lbl:"BUDGET", glowColor:"rgba(255,255,255,0.4)", glowFaint:"rgba(255,255,255,0.15)"},
    {id:"book",  icon:"🗓", lbl:"TIMELINE",glowColor:"rgba(255,255,255,0.4)", glowFaint:"rgba(255,255,255,0.15)"},
    {id:"intel", icon:"🔭",lbl:"INTEL",  glowColor:"rgba(255,255,255,0.4)", glowFaint:"rgba(255,255,255,0.15)"},
    {id:"pack",  icon:"🎒",lbl:"PACK",   glowColor:"rgba(255,159,67,0.6)",   glowFaint:"rgba(255,159,67,0.2)"},
  ];
  return(
    <div className="bnav">
      {NAV.map(n=>{
        const active=activeTab===n.id;
        const isPack=n.id==="pack";
        const pipColor=isPack?"#FF9F43":"#FFD93D";
        const borderColor=n.id==="next"?"rgba(0,229,255,0.90)":n.id==="pack"?"rgba(255,159,67,0.90)":"rgba(255,255,255,0.60)";
        const activeGlow=n.id==="next"
          ?'0 -3px 12px rgba(0,229,255,0.45),0 -1px 6px rgba(0,229,255,0.25)'
          :n.id==="pack"
          ?'0 -3px 12px rgba(255,159,67,0.45),0 -1px 6px rgba(255,159,67,0.25)'
          :'0 -3px 10px rgba(255,255,255,0.20)';
        return(
          <button key={n.id} className={`bnav-btn${isPack?" bnav-pack":""}${active?" active":""}`} onClick={()=>onTab(n.id)}
            style={active?{
              borderTop:`2px solid ${borderColor}`,
              marginTop:'-2px',
              boxShadow:activeGlow,
            }:undefined}>
            <div className="bnav-pip" style={{background:pipColor,boxShadow:active?`0 0 8px ${pipColor}`:undefined}}/>
            <span className="bnav-icon">{n.icon}</span>
            <span className="bnav-lbl">{n.lbl}</span>
          </button>
        );
      })}
    </div>
  );
}

export default BottomNav;
