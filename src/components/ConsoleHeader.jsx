import { useState } from "react";
import SharegoodLogo from './SharegoodLogo';
import BottomSheet from './BottomSheet';

function ConsoleHeader({console:which,isMobile,rightSlot,onTripConsole,onPackConsole,screenLabel,children}) {
  const isDream=which==="dream", isTrip=which==="trip", isPack=which==="pack";
  const [profileOpen,setProfileOpen]=useState(false);
  const bg=isDream?"rgba(21,15,10,0.95)":isTrip?"rgba(21,15,10,0.92)":"rgba(21,15,10,0.95)";
  const bc=isDream?"rgba(232,220,200,0.08)":isTrip?"rgba(232,220,200,0.06)":"rgba(196,87,30,0.35)";
  const dot=isDream?"#c9a04c":isTrip?"#00E5FF":"#FF9F43";
  const sub=isDream?"rgba(232,220,200,0.55)":isTrip?"rgba(232,220,200,0.55)":"rgba(232,220,200,0.55)";
  const sublabel=isDream?"DREAM CONSOLE":isTrip?"TRIP CONSOLE":"PACK CONSOLE";
  const dbSize=isMobile?(isDream?18:14):(isDream?36:26);
  const tlSize=isMobile?(isPack?18:14):(isPack?36:26);
  const dbColor=isDream?"#c9a04c":isTrip?"rgba(201,160,76,0.5)":"rgba(201,160,76,0.2)";
  const dbWeight=isDream?900:isTrip?700:300;
  const tlColor=isPack?"#c9a04c":isTrip?"rgba(201,160,76,0.65)":"#c9a04c";
  const tlShadow=isPack?"0 0 28px rgba(201,160,76,0.6)":isDream?"0 0 28px rgba(201,160,76,0.5)":"none";
  const logoGlow=isDream?"rgba(0,229,255,0.25)":isTrip?"rgba(0,229,255,0.35)":"rgba(196,87,30,0.5)";
  const radial=isDream?"rgba(255,159,67,0.25)":isTrip?"rgba(0,229,255,0.1)":"rgba(169,70,29,0.52)";
  const divLine=isDream?"rgba(255,159,67,0.4)":isTrip?"rgba(0,229,255,0.35)":"rgba(255,159,67,0.4)";

  // Console nav buttons — only shown on trip/pack consoles
  const TripBtn = ({active}) => (
    <button onClick={active ? undefined : onTripConsole} style={{
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,
      padding:isMobile?"5px 8px":"6px 12px",borderRadius:7,
      border:active?"1px solid rgba(0,229,255,0.55)":"1px solid rgba(0,229,255,0.25)",
      background:active?"rgba(0,229,255,0.08)":"rgba(0,229,255,0.03)",
      color:active?"#00E5FF":"rgba(0,229,255,0.45)",
      cursor:active?"default":"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,
      animation:active?"none":"consolePulse 3s ease-in-out infinite",
      minHeight:isMobile?34:38,minWidth:isMobile?52:64,flexShrink:0,
      boxShadow:active?"0 0 10px rgba(0,229,255,0.15)":"none",
      transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",
    }}>
      <span style={{fontSize:isMobile?13:15,lineHeight:1}}>🔭</span>
      <span style={{fontSize:isMobile?7:8,letterSpacing:1.5,whiteSpace:"nowrap"}}>{isMobile?"TRIP":"TRIP"}</span>
    </button>
  );
  const PackBtn = ({active}) => (
    <button onClick={active ? undefined : onPackConsole} style={{
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,
      padding:isMobile?"5px 8px":"6px 12px",borderRadius:7,
      border:active?"1px solid rgba(196,87,30,0.65)":"1px solid rgba(196,87,30,0.28)",
      background:active?"rgba(196,87,30,0.1)":"rgba(196,87,30,0.03)",
      color:active?"#FF9F43":"rgba(255,159,67,0.4)",
      cursor:active?"default":"pointer",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:700,
      animation:active?"none":"launchPulse 3s ease-in-out infinite",
      minHeight:isMobile?34:38,minWidth:isMobile?52:64,flexShrink:0,
      boxShadow:active?"0 0 10px rgba(196,87,30,0.2)":"none",
      transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)",
    }}>
      <span style={{fontSize:isMobile?13:15,lineHeight:1}}>🎒</span>
      <span style={{fontSize:isMobile?7:8,letterSpacing:1.5,whiteSpace:"nowrap"}}>{isMobile?"PACK":"PACK"}</span>
    </button>
  );

  return (
    <>
    <div style={{background:bg,borderBottom:`1px solid ${bc}`,backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",flexShrink:0}}>
      {/* Top row: [left slot] [center: logo+wordmark] [right slot] — on mobile Dream, screenLabel moves below logo to avoid overlap */}
      <div style={{display:"flex",alignItems:"center",padding:isMobile?"5px 8px":"7px 14px",gap:6}}>
        {/* Left slot */}
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"flex-start",justifyContent:"center",gap:2}}>
          {(!isMobile&&(isTrip||isPack)) ? <TripBtn active={isTrip}/> : null}
          {screenLabel&&!(isMobile&&isDream)&&<div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:13,color:"#c9a04c",letterSpacing:2,textTransform:"uppercase",paddingLeft:2}}>{screenLabel}</div>}
        </div>
        {/* Center: logo + wordmark */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,flexShrink:0}}>
          <SharegoodLogo size={isMobile?30:42} opacity={0.88} glowColor={logoGlow} animationState="idle"/>
          <div style={{textAlign:"center"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:isMobile?14:18,fontWeight:500,color:"#FFF",letterSpacing:3,lineHeight:1}}>1 Bag Nomad</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,marginTop:3}}>
              <div style={{width:3,height:3,borderRadius:"50%",background:dot,boxShadow:`0 0 6px ${dot}`}}/>
              <div style={{fontFamily:"'Playfair Display',serif",fontWeight:300,fontStyle:"italic",fontSize:isMobile?8:10,color:sub,letterSpacing:1.5}}>Sharegood Co.</div>
            </div>
          </div>
          {isMobile&&isDream&&rightSlot?(
            <div style={{display:"flex",justifyContent:"center",width:"100%",paddingTop:2}} aria-hidden>{rightSlot}</div>
          ):null}
        </div>
        {/* Right slot — Dream mobile progress moves under logo; desktop Dream keeps pills here */}
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"flex-end"}}>
          {(!isMobile&&(isTrip||isPack)) ? <PackBtn active={isPack}/> : (isMobile&&(isTrip||isPack)) ? (
            <button onClick={()=>setProfileOpen(true)} className="tap-scale" style={{width:36,height:36,borderRadius:"50%",border:`1.5px solid ${isPack?"rgba(255,159,67,0.45)":"rgba(0,229,255,0.45)"}`,background:isPack?"rgba(255,159,67,0.08)":"rgba(0,229,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,boxShadow:isPack?"0 0 12px rgba(255,159,67,0.12)":"0 0 12px rgba(0,229,255,0.12)"}}>
              <span style={{fontSize:16,lineHeight:1}}>👤</span>
            </button>
          ) : isMobile&&isDream ? null : rightSlot||null}
        </div>
      </div>
      {isMobile&&isDream&&screenLabel&&(
        <div style={{textAlign:"center",padding:"0 12px 8px"}}>
          <div style={{fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:10,letterSpacing:3,color:"rgba(255,255,255,0.5)",textTransform:"uppercase"}}>{screenLabel}</div>
        </div>
      )}
      {/* Tagline bar */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:isMobile?10:28,padding:isMobile?"10px 14px":"14px 32px",borderTop:`1px solid ${bc}`,border:'1px solid rgba(255,159,67,0.35)',borderTopColor:'rgba(255,159,67,0.55)',borderRadius:isMobile?8:0,margin:isMobile?'0 8px':0,background:`linear-gradient(90deg,transparent,${isDream?"rgba(32,15,0,0.75)":isTrip?"rgba(0,20,45,0.65)":"rgba(40,16,0,0.65)"},transparent)`,boxShadow:'inset 0 1px 0 rgba(255,159,67,0.40),inset 0 -1px 0 rgba(255,159,67,0.08)',position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"80%",height:80,background:`radial-gradient(ellipse,${radial} 0%,transparent 70%)`,pointerEvents:"none"}}/>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:dbSize,fontWeight:isMobile?400:dbWeight,color:dbColor,letterSpacing:isMobile?0:7,lineHeight:1,whiteSpace:"nowrap",textShadow:isDream?"0 0 32px rgba(201,160,76,0.7),0 0 64px rgba(169,70,29,0.4)":"none",position:"relative",textTransform:"uppercase"}}>Dream Big</div>
        <div style={{width:1,height:isMobile?22:30,background:`linear-gradient(180deg,transparent,${divLine},transparent)`,flexShrink:0}}/>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:tlSize,fontWeight:isPack?300:100,fontStyle:"italic",color:tlColor,letterSpacing:isMobile?0:8,lineHeight:1,whiteSpace:"nowrap",position:"relative",textShadow:tlShadow}}>travel light</div>
      </div>
      {children}
    </div>
    {isMobile&&(isTrip||isPack)&&<BottomSheet open={profileOpen} onClose={()=>setProfileOpen(false)} zIndex={700}>
      <div style={{padding:"24px 20px 32px"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,marginBottom:28}}>
          <div style={{width:72,height:72,borderRadius:"50%",border:"2px solid rgba(201,160,76,0.4)",background:"rgba(201,160,76,0.06)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 28px rgba(201,160,76,0.12)"}}>
            <span style={{fontSize:32}}>👤</span>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:4}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,fontStyle:"italic",color:"#FFF",letterSpacing:1}}>1 Bag Nomad</div>
              <div style={{padding:"2px 8px",borderRadius:12,background:"rgba(201,160,76,0.15)",border:"1px solid rgba(201,160,76,0.4)",fontSize:9,fontWeight:700,letterSpacing:2,color:"#c9a04c",fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>PRO</div>
            </div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:1}}>explorer@1bagnomad.com</div>
          </div>
        </div>
        {[
          {icon:"⚙️",label:"Settings",sub:"Preferences, units, notifications"},
          {icon:"🌐",label:"Your Trips",sub:"View all expeditions"},
          {icon:"💳",label:"Subscription",sub:"1 Bag Nomad Pro · Active"},
          {icon:"🚪",label:"Sign Out",sub:"See you on the road",danger:true},
        ].map(row=>(
          <div key={row.label} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 4px",borderBottom:"1px solid rgba(255,255,255,0.05)",cursor:"pointer"}}>
            <span style={{fontSize:20,width:28,textAlign:"center",flexShrink:0}}>{row.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:row.danger?"#FF6B6B":"rgba(255,255,255,0.88)",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",letterSpacing:0.5}}>{row.label}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginTop:2,fontFamily:"'Inter',system-ui,-apple-system,sans-serif"}}>{row.sub}</div>
            </div>
            {!row.danger&&<span style={{fontSize:16,color:"rgba(255,255,255,0.18)"}}>›</span>}
          </div>
        ))}
      </div>
    </BottomSheet>}
    </>
  );
}

export default ConsoleHeader;
