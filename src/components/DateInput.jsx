import { useState, useEffect, useRef } from "react";

function DateInput({value,onChange,accentColor="#69F0AE",yearHint}) {
  const parse=v=>{if(!v)return{m:"",d:"",y:""};const p=v.split("-");return p.length===3?{m:p[1]||"",d:p[2]||"",y:p[0]||""}:{m:"",d:"",y:""};};
  const [mm,setMm]=useState(()=>parse(value).m);
  const [dd,setDd]=useState(()=>parse(value).d);
  const [yyyy,setYyyy]=useState(()=>parse(value).y);
  const mmRef=useRef();const ddRef=useRef();const yyyyRef=useRef();
  useEffect(()=>{const p=parse(value);setMm(p.m);setDd(p.d);setYyyy(p.y);},[value]);
  const emit=(m,d,y)=>{if(m&&d&&y.length===4){const iso=`${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;onChange(iso);}};
  const handleMm=e=>{const v=e.target.value.replace(/\D/g,"").slice(0,2);setMm(v);if(v.length===2)ddRef.current?.focus();emit(v,dd,yyyy);};
  const handleDd=e=>{const v=e.target.value.replace(/\D/g,"").slice(0,2);setDd(v);if(v.length===2)yyyyRef.current?.focus();emit(mm,v,yyyy);};
  const handleYyyy=e=>{const v=e.target.value.replace(/\D/g,"").slice(0,4);setYyyy(v);emit(mm,dd,v);};
  const fs={background:"rgba(255,255,255,0.04)",border:`1px solid ${accentColor}55`,borderRadius:9,color:"#FFF",fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:15,padding:"12px 8px",textAlign:"center",width:"100%",boxSizing:"border-box",outline:"none",transition:"border-color 0.2s,box-shadow 0.2s"};
  const onF=e=>{e.target.style.borderColor="rgba(255,159,67,0.65)";e.target.style.boxShadow="0 0 0 2px rgba(255,159,67,0.15)";};
  const onB=e=>{e.target.style.borderColor=`${accentColor}55`;e.target.style.boxShadow="none";};
  return(
    <div style={{display:"flex",gap:8,alignItems:"center",width:"100%"}}>
      <input ref={mmRef} type="text" inputMode="numeric" placeholder="MM" maxLength={2} value={mm} onChange={handleMm} onFocus={e=>{onF(e);if(yearHint&&!mm&&!dd&&!yyyy){setYyyy(yearHint);}}} onBlur={onB} style={{...fs,flex:1}}/>
      <span style={{color:"rgba(255,159,67,0.5)",fontSize:18,flexShrink:0}}>/</span>
      <input ref={ddRef} type="text" inputMode="numeric" placeholder="DD" maxLength={2} value={dd} onChange={handleDd} onFocus={onF} onBlur={onB} style={{...fs,flex:1}}/>
      <span style={{color:"rgba(255,159,67,0.5)",fontSize:18,flexShrink:0}}>/</span>
      <input ref={yyyyRef} type="text" inputMode="numeric" placeholder="YYYY" maxLength={4} value={yyyy} onChange={handleYyyy} onFocus={onF} onBlur={onB} style={{...fs,flex:2}}/>
    </div>
  );
}


export default DateInput;
