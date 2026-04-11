import { useState, useRef } from "react";

function CityInput({value,onChange,className,style:inputStyle,placeholder,accent,onFocus,onBlur}){
  const gold="rgba(255,217,61,0.30)";
  const cyan="rgba(0,229,255,0.35)";
  const borderAccent=accent==="cyan"?cyan:gold;
  const [suggestions,setSuggestions]=useState([]);
  const [focused,setFocused]=useState(false);
  const [highlight,setHighlight]=useState(-1);
  const timerRef=useRef(null);
  const abortRef=useRef(null);
  const handleChange=(v)=>{
    onChange(v);
    setHighlight(-1);
    if(timerRef.current)clearTimeout(timerRef.current);
    if(abortRef.current)abortRef.current.abort();
    if(v.length<2){setSuggestions([]);return;}
    timerRef.current=setTimeout(async()=>{
      const ctrl=new AbortController();
      abortRef.current=ctrl;
      try{
        const res=await fetch(`/api/airports?q=${encodeURIComponent(v)}`,{signal:ctrl.signal});
        const data=await res.json().catch(()=>({}));
        if(!res.ok){setSuggestions([]);return;}
        const items=[];
        (data.airports||[]).forEach(a=>{
          const label=`${a.city||a.name}${a.city&&a.name&&a.city!==a.name?' · '+a.name:''}`;
          items.push({label,code:a.iata,display:`${a.city||a.name}, ${a.country}`});
        });
        (data.cities||[]).forEach(c=>{
          if(!items.some(i=>i.label.toLowerCase().includes(c.name.toLowerCase())))
            items.push({label:c.name,code:'',display:`${c.name}, ${c.country}`});
        });
        setSuggestions(items.slice(0,8));
      }catch(e){if(e.name!=='AbortError')setSuggestions([]);}
    },300);
  };
  const select=(s)=>{onChange(s.display);setSuggestions([]);setHighlight(-1);};
  const handleKey=(e)=>{
    if(!suggestions.length)return;
    if(e.key==='ArrowDown'){e.preventDefault();setHighlight(h=>(h+1)%suggestions.length);}
    else if(e.key==='ArrowUp'){e.preventDefault();setHighlight(h=>h<=0?suggestions.length-1:h-1);}
    else if(e.key==='Enter'&&highlight>=0){e.preventDefault();select(suggestions[highlight]);}
    else if(e.key==='Escape'){setSuggestions([]);}
  };
  return(<div style={{position:'relative',zIndex:40,overflow:'visible'}}><input className={className} style={inputStyle} value={value??""} onClick={e=>e.stopPropagation()} onChange={e=>handleChange(e.target.value)} onKeyDown={handleKey} onFocus={e=>{setFocused(true);onFocus?.(e);}} onBlur={e=>{setTimeout(()=>setFocused(false),180);onBlur?.(e);}} placeholder={placeholder} autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck="false"/>
    {focused&&suggestions.length>0&&<div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:9999,background:'rgba(18,21,28,0.98)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',border:`1.5px solid ${borderAccent}`,borderRadius:10,marginTop:4,overflow:'hidden',boxShadow:accent==="cyan"?'0 8px 32px rgba(0,0,0,0.6),0 0 20px rgba(0,229,255,0.12)':'0 8px 32px rgba(0,0,0,0.6),0 0 20px rgba(255,159,67,0.08)'}}>
      {suggestions.map((s,i)=><div key={s.label+s.code} onMouseDown={()=>select(s)} style={{padding:'10px 14px',fontSize:13,color:highlight===i?'#c9a04c':'rgba(255,255,255,0.85)',fontFamily:"'Inter',system-ui,-apple-system,sans-serif",cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.06)',background:highlight===i?'rgba(255,159,67,0.12)':'transparent',transition:'background 0.15s',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}} onMouseOver={e=>{e.currentTarget.style.background='rgba(255,159,67,0.10)';setHighlight(i);}} onMouseOut={e=>{e.currentTarget.style.background='transparent';}}>
        <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.label}</span>
        {s.code&&<span style={{fontSize:12,fontWeight:700,color:'rgba(255,217,61,0.75)',letterSpacing:1,flexShrink:0}}>{s.code}</span>}
      </div>)}
    </div>}
  </div>);
}

export default CityInput;
