import { useMobile } from "../hooks/useMobile";

function SDF({label,value,onChange,placeholder,type="text",multiline,accent="#00E5FF",onFocus,onBlur}) {
  const mob=useMobile();
  const s={background:"rgba(0,0,0,0.55)",border:"1px solid rgba(255,255,255,0.22)",borderRadius:6,color:"#FFF",fontSize:mob?12:15,padding:multiline?(mob?"5px 7px":"6px 8px"):(mob?"4px 7px":"5px 8px"),fontFamily:"'Inter',system-ui,-apple-system,sans-serif",outline:"none",width:"100%",maxWidth:"100%",boxSizing:"border-box",lineHeight:1.6,resize:multiline?"none":undefined,transition:"border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"};
  const onF=e=>{e.target.style.borderColor="rgba(255,159,67,0.65)";e.target.style.boxShadow="0 0 0 2px rgba(255,159,67,0.15)";setTimeout(()=>e.target.scrollIntoView({behavior:'smooth',block:'nearest'}),500);if(onFocus)onFocus(e);};
  const onB=e=>{e.target.style.borderColor="rgba(255,255,255,0.22)";e.target.style.boxShadow="none";if(onBlur)onBlur(e);};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:mob?2:3}}>
      <div style={{fontSize:mob?11:13,color:"rgba(212,180,120,0.92)",letterSpacing:1.5,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontWeight:500,opacity:0.92}}>{label}</div>
      {multiline?<textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={1} style={s} onFocus={onF} onBlur={onB}/>
      :type==="date"?<div style={{width:"100%"}}><input type="date" value={value} onChange={e=>onChange(e.target.value)} style={{...s,colorScheme:"dark"}} onFocus={onF} onBlur={onB}/></div>
      :<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={s} onFocus={onF} onBlur={onB}/>}
    </div>
  );
}


export default SDF;
