import { useState, useEffect, useRef } from "react";
import posthog from "posthog-js";
import WorldMapBackground from './WorldMapBackground';
import BottomSheet from './BottomSheet';
import HelpTip from './HelpTip';
import { useMobile } from '../hooks/useMobile';
import { askAI, parseJSON } from '../utils/aiHelpers';
import { TI } from '../utils/storageHelpers';
import { BAG_COLORS, CULTURE_GOLD, NOTEBOOK_CAT_COLORS, PACK_CAT_COLORS } from '../constants/colors';
import { CONSOLE_CONTENT_MAX } from '../constants/layout';
import { buildTripPack, getDefaultPack, mapPackItemsWithVolumes } from '../utils/packHelpers';
import { formatTripNameDisplay } from '../utils/tripConsoleHelpers';

const STORAGE_PACK_EXPANDED = "1bn_pack_expanded";
function loadPackExpandedCats() {
  try {
    const s = localStorage.getItem(STORAGE_PACK_EXPANDED);
    if (!s) return {};
    const p = JSON.parse(s);
    if (Array.isArray(p)) return Object.fromEntries(p.map((id) => [id, true]));
    if (p && typeof p === "object") return p;
  } catch (e) {}
  return {};
}
function persistPackExpandedCats(obj) {
  try {
    const ids = Object.keys(obj).filter((id) => obj[id]);
    localStorage.setItem(STORAGE_PACK_EXPANDED, JSON.stringify(ids));
  } catch (e) {}
}

const PACK_CREAM = "#F5F0E8";

// ── Pack Brief helper ────────────────────────────────────────
function getPackBrief(pp,tripData){
  if(!pp)return null;
  const {tripType,climate,duration}=pp;
  const tripName=formatTripNameDisplay(tripData?.tripName||"your expedition");
  const typeContext={dive:"underwater exploration — dive gear is front and center, everything else is minimal",adventure:"physical adventure — durability and weather protection are priorities",culture:"city and cultural exploration — versatile, presentable, lightweight",luxury:"premium travel — quality over quantity, smart casual essentials",nomad:"long-term travel — tech-forward, laundry-friendly, multi-purpose items",beach:"coastal living — sun protection, quick-dry, minimal footprint",moto:"motorbike travel — weather protection, packable layers, security essentials",wellness:"wellness retreat — comfortable layers, yoga-friendly, minimal distractions",Trek:"alpine trekking — layered warmth, durable footwear, weather protection",Exploration:"broad exploration — versatile pieces that work across settings",Relax:"relaxed travel — comfort-first, easy layers, minimal fuss",Surf:"surf travel — boardshorts, rashguards, reef-safe sun protection",Nature:"nature immersion — earth tones, insect protection, quick-dry layers",Transit:"transit-heavy routing — wrinkle-resistant, packable, security-conscious"};
  const climateAdvice={"tropical-hot":"The heat and humidity mean breathable fabrics are essential — avoid anything that traps moisture.","tropical-wet":"Wet season means rain is guaranteed — waterproof everything, quick-dry only.","temperate-cool":"Layering is key — mornings and evenings will be cold even if afternoons are mild.","cold-alpine":"Warmth is non-negotiable — down layers, windproof shell, thermal base layers.",mediterranean:"Mild days, cooler evenings — one light layer handles most situations.","desert-hot":"UV protection is critical — cover up during midday, light breathable fabrics."};
  let msg=`For ${tripName}, I've selected gear appropriate for `+(typeContext[tripType]||"your specific trip type")+". "+(climateAdvice[climate]||"");
  if(duration==="short")msg+=" For a short trip, pack lighter than you think you need.";
  else if(duration==="long")msg+=" For an extended trip, plan for laundry every 5-7 days.";
  return msg;
}

// ── PackItemRow ──────────────────────────────────────────────
function PackItemRow({item,catColor,isLast,onEditOpenChange,isMobile,toggleOwned,updateItem,removeItem,wM,unit,BAGS,BAG_C}) {
  const [open,setOpen]=useState(false);
  const [editOpen,setEditOpen]=useState(false);
  const [draftName,setDraftName]=useState(()=>item.name??"");
  const [draftWeight,setDraftWeight]=useState(()=>String(item.weight??""));
  const [draftCost,setDraftCost]=useState(()=>String(item.cost??""));
  const [draftVolume,setDraftVolume]=useState(()=>String(item.volume??""));
  useEffect(()=>{
    setDraftName(item.name??"");
    setDraftWeight(String(item.weight??""));
    setDraftCost(String(item.cost??""));
    setDraftVolume(String(item.volume??""));
  },[item.id]);
  useEffect(()=>{onEditOpenChange?.(editOpen);},[editOpen,onEditOpenChange]);
  const flushMobileDrafts=()=>{
    if(String(item.name??"")!==String(draftName))updateItem(item.id,"name",draftName);
    if(String(item.weight??"")!==String(draftWeight))updateItem(item.id,"weight",draftWeight);
    if(String(item.cost??"")!==String(draftCost))updateItem(item.id,"cost",draftCost);
    if(String(item.volume??"")!==String(draftVolume))updateItem(item.id,"volume",draftVolume);
  };
  const closeEditSheet=()=>{flushMobileDrafts();setEditOpen(false);};
  if(isMobile) return(
    <>
      <div className="tap-scale" onClick={()=>setEditOpen(true)}
        style={{display:'flex',alignItems:'center',minHeight:56,padding:'0 12px',borderBottom:isLast?'none':'1px solid rgba(248,245,240,0.08)',gap:12,background:'transparent'}}>
        <button type="button" className="pack-owned-hit" onClick={e=>{e.stopPropagation();toggleOwned(item.id);}} style={{width:34,height:34,borderRadius:8,border:`1px solid ${CULTURE_GOLD}`,background:item.owned?'rgba(201,160,76,0.18)':'rgba(201,160,76,0.08)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
          {item.owned?<span className="pack-check-mark" style={{fontSize:15,color:CULTURE_GOLD}} aria-hidden>✓</span>:null}
        </button>
        <div style={{flex:1,minWidth:0,textAlign:'left'}}>
          <div className={`pack-item-name${item.owned?" pack-item-name--owned":""}`} style={{fontSize:13,fontWeight:500,color:PACK_CREAM,fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",whiteSpace:'normal',overflow:'visible',textOverflow:'clip',lineHeight:1.3}}>{item.essential&&<span style={{fontSize:9,color:'#c9a04c',marginRight:3}}>★</span>}{item.optional&&<span style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginRight:2}}>~</span>}{item.name||'Unnamed'}</div>
          <div style={{display:'flex',gap:8,marginTop:2}}>
            {parseFloat(item.weight)>0&&<span style={{fontSize:11,color:'rgba(255,255,255,0.38)',fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}>{(parseFloat(item.weight)*wM).toFixed(1)}{unit}</span>}
            {parseFloat(item.cost)>0&&<span style={{fontSize:11,color:'rgba(201,160,76,0.5)',fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}>${item.cost}</span>}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          <span style={{fontSize:10,padding:'2px 9px',borderRadius:20,border:`1px solid ${item.owned?CULTURE_GOLD:'rgba(255,255,255,0.3)'}`,background:item.owned?'rgba(201,160,76,0.18)':'transparent',color:item.owned?CULTURE_GOLD:'rgba(255,255,255,0.6)',fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",fontWeight:600,whiteSpace:'nowrap'}}>{item.owned?'OWNED':'NEED'}</span>
          <span style={{fontSize:18,color:'rgba(255,255,255,0.18)'}}>›</span>
        </div>
      </div>
      <BottomSheet open={editOpen} onClose={closeEditSheet} zIndex={600}>
        <div style={{padding:'16px 16px 8px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <div style={{fontSize:10,color:`${catColor}99`,letterSpacing:3,fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",fontWeight:700,marginBottom:8}}>EDIT ITEM</div>
          <input value={draftName} onChange={e=>setDraftName(e.target.value)} style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.30)',borderRadius:9,color:'#FFF',fontSize:14,padding:'10px 13px',fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",outline:'none',transition:'border-color 0.2s,box-shadow 0.2s'}} placeholder="Item name" onFocus={e=>{e.target.style.borderColor='rgba(201,160,76,0.65)';e.target.style.boxShadow='0 0 0 2px rgba(201,160,76,0.15)';}} onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,0.30)';e.target.style.boxShadow='none';if(String(item.name??"")!==String(draftName))updateItem(item.id,"name",draftName);}}/>
        </div>
        <div style={{padding:'14px 16px',display:'flex',flexDirection:'column',gap:12,textAlign:'left'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
            {[{label:'WT (lbs)',draft:draftWeight,setDraft:setDraftWeight,field:'weight'},{label:'COST ($)',draft:draftCost,setDraft:setDraftCost,field:'cost'},{label:'VOL (L)',draft:draftVolume,setDraft:setDraftVolume,field:'volume'}].map(({label,draft,setDraft,field})=>(
              <div key={field}>
                <div style={{fontSize:9,color:`${catColor}88`,letterSpacing:2,marginBottom:5,fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",fontWeight:700}}>{label}</div>
                <input value={draft} onChange={e=>setDraft(e.target.value)} style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.30)',borderRadius:7,color:'#c9a04c',fontSize:13,padding:'8px 9px',outline:'none',fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",transition:'border-color 0.2s,box-shadow 0.2s'}} onFocus={e=>{e.target.style.borderColor='rgba(201,160,76,0.65)';e.target.style.boxShadow='0 0 0 2px rgba(201,160,76,0.15)';}} onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,0.30)';e.target.style.boxShadow='none';if(String(item[field]??"")!==String(draft))updateItem(item.id,field,draft);}}/>
              </div>
            ))}
          </div>
          <div>
            <div style={{fontSize:9,color:`${catColor}88`,letterSpacing:2,marginBottom:8,fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",fontWeight:700}}>BAG</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {BAGS.map(b=><button key={b} onClick={()=>updateItem(item.id,'bag',b)} style={{padding:'5px 10px',borderRadius:20,border:`1px solid ${item.bag===b?BAG_C[b]||'#C9A04C':'rgba(255,255,255,0.35)'}`,background:item.bag===b?'rgba(255,255,255,0.06)':'transparent',color:item.bag===b?BAG_C[b]||'#C9A04C':'rgba(255,255,255,0.4)',fontSize:11,cursor:'pointer',fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",fontWeight:item.bag===b?700:400}}>{b}</button>)}
            </div>
          </div>
          <div style={{display:'flex',gap:8,paddingTop:4}}>
            <button onClick={()=>toggleOwned(item.id)} style={{flex:1,padding:'12px',borderRadius:12,border:`1px solid ${item.owned?'rgba(105,240,174,0.4)':'rgba(196,87,30,0.4)'}`,background:item.owned?'rgba(105,240,174,0.08)':'rgba(169,70,29,0.1)',color:item.owned?'#69F0AE':'#C9A04C',fontSize:13,cursor:'pointer',fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",fontWeight:700}}>{item.owned?'✓ OWNED':'MARK OWNED'}</button>
            <button onClick={()=>{removeItem(item.id);setEditOpen(false);}} style={{padding:'12px 16px',borderRadius:12,border:'1px solid rgba(255,107,107,0.3)',background:'rgba(255,107,107,0.06)',color:'rgba(255,107,107,0.7)',fontSize:11,cursor:'pointer',fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",fontWeight:700,letterSpacing:1}}>REMOVE</button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
  // Desktop inline expand
  return(
    <div style={{borderBottom:isLast?"none":"1px solid rgba(255,255,255,0.2)"}}>
      <div style={{display:"flex",alignItems:"center",minHeight:44,borderLeft:`2px solid ${catColor}${open?"88":"33"}`}}>
        <button type="button" className="pack-owned-hit" onClick={e=>{e.stopPropagation();toggleOwned(item.id);}} style={{width:44,height:"100%",minHeight:52,display:"flex",alignItems:"center",justifyContent:"center",background:"none",border:"none",cursor:"pointer",flexShrink:0}}>
          <div style={{width:20,height:20,borderRadius:4,border:`1px solid ${CULTURE_GOLD}`,background:item.owned?"rgba(201,160,76,0.18)":"rgba(201,160,76,0.08)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            {item.owned?<span className="pack-check-mark" style={{fontSize:14,color:CULTURE_GOLD}} aria-hidden>✓</span>:null}
          </div>
        </button>
        <div onClick={()=>setOpen(o=>!o)} style={{flex:1,display:"flex",alignItems:"center",gap:10,padding:"10px 8px 10px 4px",cursor:"pointer",minWidth:0}}>
          <div style={{flex:1,minWidth:0}}>
            <div className={`pack-item-name${item.owned?" pack-item-name--owned":""}`} style={{fontSize:13,fontWeight:500,color:PACK_CREAM,fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{item.essential&&<span style={{fontSize:9,color:"#c9a04c",marginRight:3}}>★</span>}{item.optional&&<span style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginRight:2}}>~</span>}{item.name||"Unnamed"}</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {parseFloat(item.weight)>0&&<span style={{fontSize:13,color:"rgba(255,255,255,0.45)",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}>{(parseFloat(item.weight)*wM).toFixed(1)}{unit}</span>}
              {parseFloat(item.cost)>0&&<span style={{fontSize:13,color:"rgba(201,160,76,0.55)",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}>${item.cost}</span>}
              <span style={{fontSize:13,color:(BAG_C[item.bag]||"rgba(201,160,76,0.6)")+"aa",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}>{item.bag}</span>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0}}>
            <div style={{padding:"2px 8px",borderRadius:20,border:`1px solid ${item.owned?CULTURE_GOLD:"rgba(255,255,255,0.3)"}`,background:item.owned?"rgba(201,160,76,0.18)":"transparent",fontSize:11,fontWeight:600,color:item.owned?CULTURE_GOLD:"rgba(255,255,255,0.6)",letterSpacing:1,whiteSpace:"nowrap"}}>{item.owned?"OWNED":"NEED"}</div>
            <div style={{width:16,height:16,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:10,color:"rgba(255,255,255,0.35)",transform:open?"rotate(180deg)":"none",display:"inline-block",transition:"transform 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}}>▼</span>
            </div>
          </div>
        </div>
      </div>
      {open&&(
        <div style={{padding:"12px 16px 16px 44px",background:"rgba(0,0,0,0.25)",borderTop:`1px solid ${catColor}15`,animation:"slideOpen 0.40s cubic-bezier(0.25,0.46,0.45,0.94)",display:"flex",flexDirection:"column",gap:10}}>
          <input value={draftName} onChange={e=>setDraftName(e.target.value)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.30)",borderRadius:7,color:"#FFF",fontSize:12,padding:"8px 10px",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",outline:"none",width:"100%",transition:"border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}} placeholder="Item name" onFocus={e=>{e.target.style.borderColor="rgba(201,160,76,0.65)";e.target.style.boxShadow="0 0 0 2px rgba(201,160,76,0.15)";}} onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.30)";e.target.style.boxShadow="none";if(String(item.name??"")!==String(draftName))updateItem(item.id,"name",draftName);}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[{label:"WT (lbs)",draft:draftWeight,setDraft:setDraftWeight,field:"weight"},{label:"COST ($)",draft:draftCost,setDraft:setDraftCost,field:"cost"},{label:"VOL (L)",draft:draftVolume,setDraft:setDraftVolume,field:"volume"}].map(({label,draft,setDraft,field})=>(
              <div key={field}><div style={{fontSize:9,color:"rgba(201,160,76,0.65)",letterSpacing:1,marginBottom:3,fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}>{label}</div><input value={draft} onChange={e=>setDraft(e.target.value)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.30)",borderRadius:5,color:"#c9a04c",fontSize:12,padding:"6px 8px",outline:"none",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",width:"100%",transition:"border-color 0.30s cubic-bezier(0.25,0.46,0.45,0.94),box-shadow 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}} onFocus={e=>{e.target.style.borderColor="rgba(201,160,76,0.65)";e.target.style.boxShadow="0 0 0 2px rgba(201,160,76,0.15)";}} onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.30)";e.target.style.boxShadow="none";if(String(item[field]??"")!==String(draft))updateItem(item.id,field,draft);}}/></div>
            ))}
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {BAGS.map(b=><button key={b} onClick={()=>updateItem(item.id,"bag",b)} style={{padding:"4px 8px",borderRadius:8,border:`1px solid ${item.bag===b?BAG_C[b]||"#C9A04C":"rgba(255,255,255,0.35)"}`,background:item.bag===b?"rgba(255,255,255,0.07)":"transparent",color:item.bag===b?BAG_C[b]||"#C9A04C":"rgba(255,255,255,0.45)",fontSize:10,cursor:"pointer",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",fontWeight:item.bag===b?700:400}}>{b}</button>)}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>toggleOwned(item.id)} style={{flex:1,padding:"9px 8px",borderRadius:7,border:`1px solid ${item.owned?"rgba(105,240,174,0.4)":"rgba(196,87,30,0.4)"}`,background:item.owned?"rgba(105,240,174,0.08)":"rgba(169,70,29,0.1)",color:item.owned?"#69F0AE":"#C9A04C",fontSize:13,cursor:"pointer",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",fontWeight:700,whiteSpace:"nowrap"}}>{item.owned?"✓ OWNED":"MARK OWNED"}</button>
            <button onClick={()=>removeItem(item.id)} style={{padding:"8px 12px",borderRadius:7,border:"1px solid rgba(255,107,107,0.3)",background:"rgba(255,107,107,0.06)",color:"rgba(255,107,107,0.7)",fontSize:13,cursor:"pointer",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",fontWeight:700}}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Category Tile (module scope — stable identity vs nested in PackConsole) ─
function CatCard({ cat, idx, isMobile, itemsForCat, wM, unit, onSelectCategory }) {
  const catItems = itemsForCat(cat.id);
  const ownedInCat = catItems.filter((i) => i.owned).length;
  const catW = catItems.reduce((s, i) => s + (parseFloat(i.weight) || 0), 0) * wM;
  const needCount = catItems.filter((i) => !i.owned).length;
  const needCost = catItems.filter((i) => !i.owned).reduce((s, i) => s + (parseFloat(i.cost) || 0), 0);
  const pct = catItems.length > 0 ? Math.round((ownedInCat / catItems.length) * 100) : 0;
  const pctColor = pct >= 100 ? "#5E8B8A" : "#C9A04C";
  const barFill = pct >= 100 ? "#5E8B8A" : "#C9A04C";
  return (
    <div
      onClick={() => onSelectCategory(cat)}
      style={{
        ...(isMobile
          ? {
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(122,111,93,0.35)",
              borderRadius: 16,
              animation: `fadeUp 0.3s ease ${idx * 0.05}s both`,
            }
          : {
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(122,111,93,0.35)",
              borderRadius: 16,
              overflow: "hidden",
              transition: "border-color 0.2s ease",
              animation: `fadeUp 0.40s cubic-bezier(0.25,0.46,0.45,0.94) ${idx * 0.06}s both`,
            }),
        padding: isMobile ? "14px 12px" : "14px 16px",
        marginBottom: 8,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "rgba(201,160,76,0.08)",
            border: "1px solid rgba(201,160,76,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          {cat.icon}
        </div>
        <span
          style={{
            flex: 1,
            fontFamily: "'Instrument Sans', sans-serif",
            fontWeight: 600,
            fontSize: 16,
            color: "#E8DCC8",
            letterSpacing: "0",
          }}
        >
          {cat.label}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: pctColor }}>{pct}%</span>
        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.30)", marginLeft: 6 }}>›</span>
      </div>
      <div style={{ display: "flex", gap: 12, fontSize: 14, color: "rgba(255,255,255,0.45)", fontFamily: "'Instrument Sans',system-ui,-apple-system,sans-serif" }}>
        <span>{catItems.length} items</span>
        <span>·</span>
        <span style={{ color: cat.color }}>
          {catW.toFixed(1)}
          {unit}
        </span>
        <span style={{ marginLeft: "auto", color: needCount > 0 ? "#C9A04C" : "#69F0AE" }}>
          {needCount > 0 ? `$${Math.round(needCost)} still needed` : "✓ all owned"}
        </span>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
        <div
          className="pack-cat-progress-fill"
          style={{
            height: "100%",
            width: `${pct}%`,
            background: barFill,
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
}

// ─── Category Detail (module scope — avoids remount on parent re-render) ─────
function CategoryDetailPage({ cat, onBack, catItems, isMobile, rowProps, addItemToCat }) {
  const ownedInCat = catItems.filter((i) => i.owned).length;
  const wM = rowProps.wM;
  const unit = rowProps.unit;
  const catW = catItems.reduce((s, i) => s + (parseFloat(i.weight) || 0), 0) * wM;
  const catCost = catItems.reduce((s, i) => s + (parseFloat(i.cost) || 0), 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflowY: "auto", animation: "slideInRight 0.45s cubic-bezier(0.25,0.46,0.45,0.94)", maxWidth: CONSOLE_CONTENT_MAX, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: isMobile ? "12px" : "16px",
          gap: 12,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
          background: "rgba(10,4,0,0.95)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: "#C9A04C",
            fontSize: 22,
            cursor: "pointer",
            padding: "0 8px 0 0",
            lineHeight: 1,
            minWidth: 32,
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          ‹{" "}
          <span style={{ fontSize: 13, fontFamily: "'Instrument Sans',system-ui,-apple-system,sans-serif", letterSpacing: 2, fontWeight: 700, opacity: 0.9 }}>PACK LIST</span>
        </button>
        <span style={{ fontSize: 18 }}>{cat.icon}</span>
        <span style={{ flex: 1, fontSize: 16, fontWeight: 600, color: "#FFFFFF", fontFamily: "'Instrument Sans',system-ui,-apple-system,sans-serif" }}>{cat.label}</span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: "'Instrument Sans',system-ui,-apple-system,sans-serif" }}>
          {ownedInCat}/{catItems.length}
        </span>
      </div>
      <div style={{ display: "flex", gap: 16, padding: isMobile ? "10px 12px" : "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontFamily: "'Instrument Sans',system-ui,-apple-system,sans-serif" }}>
          <span style={{ color: cat.color, fontWeight: 700 }}>
            {catW.toFixed(1)}
            {unit}
          </span>{" "}
          total weight
        </span>
        {catCost > 0 && (
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontFamily: "'Instrument Sans',system-ui,-apple-system,sans-serif" }}>
            <span style={{ color: "#c9a04c", fontWeight: 700 }}>${catCost.toLocaleString()}</span> total cost
          </span>
        )}
      </div>
      <div style={{ flex: 1, padding: isMobile ? "8px 12px 24px" : "8px 16px 24px" }}>
        {catItems.map((item, i) => (
          <PackItemRow key={item.id} item={item} catColor={cat.color} isLast={i === catItems.length - 1} {...rowProps} />
        ))}
        {catItems.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: 14, fontStyle: "italic", color: "rgba(201,160,76,0.45)" }}>No items yet. Add one below.</div>
          </div>
        )}
        <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
          <button
            onClick={() => addItemToCat(cat.id)}
            style={{
              padding: "10px 32px",
              borderRadius: 20,
              border: `1px dashed ${cat.color}55`,
              background: "transparent",
              color: `${cat.color}88`,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "'Instrument Sans',system-ui,-apple-system,sans-serif",
              letterSpacing: 1.5,
              fontWeight: 700,
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = `${cat.color}12`;
              e.currentTarget.style.color = cat.color;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = `${cat.color}88`;
            }}
          >
            + ADD ITEM
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PackConsole ───────────────────────────────────────────────
function PackConsole({tripData,onExpedition,onGoToTab,isFullscreen,setFullscreen,onPackUiContextChange}) {
  const isMobile=useMobile();
  useEffect(()=>{window.scrollTo(0,0);posthog.capture("pack_console_opened");posthog.capture("$pageview",{$current_url:"/pack-console"});},[]);
  const ALL_CATS=[
    {id:"clothes",label:"Clothes",icon:"👕",color:"#c9a04c"},
    {id:"tech",label:"Tech",icon:"💻",color:"#C9A04C"},
    {id:"creator",label:"Creator",icon:"🎥",color:"#C9A04C"},
    {id:"dive",label:"Dive",icon:"🤿",color:"#B8A078"},
    {id:"health",label:"Health",icon:"🏥",color:"#69F0AE"},
    {id:"travel",label:"Travel",icon:"🧳",color:"#55EFC4"},
    {id:"docs",label:"Docs",icon:"📄",color:"#E0E0E0"},
    {id:"adventure",label:"Adventure",icon:"🥾",color:"#55EFC4"},
    {id:"moto",label:"Moto",icon:"🏍️",color:"#FF6B6B"},
    {id:"safari",label:"Safari",icon:"🦁",color:"#c9a04c"},
    {id:"work",label:"Work",icon:"💼",color:"#7A6F5D"},
  ];
  const pp=tripData.packProfile||null;
  const [enabledCats,setEnabledCats]=useState(()=>{try{const s=localStorage.getItem("1bn_pack_cats_v1");if(s)return JSON.parse(s);}catch(e){}return null;});
  useEffect(()=>{if(enabledCats)try{localStorage.setItem("1bn_pack_cats_v1",JSON.stringify(enabledCats));}catch(e){}},[enabledCats]);
  const BAGS=["Backpack","Global Briefcase","Worn","Digital","Day Bag"];
  const WL=15,KGL=7,VL=45;
  const BAG_C=BAG_COLORS;

  const [packTab,setPackTab]=useState("pack");
  const [packView,setPackView]=useState("dashboard");
  const [activeCategory,setActiveCategory]=useState(null);
  const [items,setItems]=useState(()=>{try{const s=localStorage.getItem("1bn_pack_v5");if(s){const p=JSON.parse(s);if(p?.length>0)return mapPackItemsWithVolumes(p);}}catch(e){}return mapPackItemsWithVolumes(pp?buildTripPack(pp,tripData.travelerProfile||null):getDefaultPack());});
  // Derive visible categories from actual items — always in sync with tiered pack system
  const itemCats=[...new Set(items.map(i=>i.cat))];
  const CATS=enabledCats?ALL_CATS.filter(c=>enabledCats.includes(c.id)):ALL_CATS.filter(c=>itemCats.includes(c.id));
  const [filterCat,setFilterCat]=useState("all");
  const [openCats,setOpenCats]=useState(loadPackExpandedCats);
  const setOpenCatsPersist=(updater)=>{setOpenCats((prev)=>{const next=typeof updater==="function"?updater(prev):updater;persistPackExpandedCats(next);return next;});};
  const [unit,setUnit]=useState("lbs");
  const [expandedItem,setExpandedItem]=useState(null);
  const [resetConfirm,setResetConfirm]=useState(false);
  const suggestCacheKey="1bn_refine_"+(tripData?.tripName||"default").replace(/\s+/g,"_").toLowerCase();
  const [suggestions,setSuggestions]=useState(()=>{try{const c=localStorage.getItem(suggestCacheKey);if(c){const p=JSON.parse(c);if(Array.isArray(p)&&p.length>0)return p;}}catch(e){}return[];});
  const [suggestLoading,setSuggestLoading]=useState(false);
  const [suggestDone,setSuggestDone]=useState(()=>{try{const c=localStorage.getItem(suggestCacheKey);if(c){const p=JSON.parse(c);if(Array.isArray(p))return true;}}catch(e){}return false;});
  const [accepted,setAccepted]=useState([]);
  const briefKey="1bn_pack_brief_"+(tripData?.tripName||"default").replace(/\s+/g,"_").toLowerCase();
  const [packBriefCollapsed,setPackBriefCollapsed]=useState(()=>{try{return localStorage.getItem(briefKey)==="1";}catch(e){return false;}});
  const [showAddCats,setShowAddCats]=useState(false);
  const [packSaveFlash,setPackSaveFlash]=useState(false);
  const packSaveRef=useRef(null);
  const packFirstRender=useRef(true);
  const coupleMode=tripData.travelerProfile?.group==="couple";
  useEffect(()=>{try{localStorage.setItem("1bn_pack_v5",JSON.stringify(items));}catch(e){}if(packFirstRender.current){packFirstRender.current=false;return;}setPackSaveFlash(true);if(packSaveRef.current)clearTimeout(packSaveRef.current);packSaveRef.current=setTimeout(()=>setPackSaveFlash(false),2000);},[items]);
  useEffect(()=>{if(packTab==="tailor"){posthog.capture("tailor_tab_opened");if(!suggestDone&&!suggestLoading){const t=setTimeout(()=>genSuggestions(),800);return()=>clearTimeout(t);}}},[ packTab]);
  useEffect(()=>{onPackUiContextChange?.({tab:packTab,view:packView});},[packTab,packView,onPackUiContextChange]);

  const countries=[...new Set(tripData.phases.map(p=>p.country))];
  const tripTypes=[...new Set(tripData.phases.map(p=>p.type))];
  const goalLabel=tripData.goalLabel||"Expedition";
  const totalNights=tripData.phases.reduce((s,p)=>s+p.nights,0);
  const wM=unit==="kg"?0.453592:1,wLim=unit==="kg"?KGL:WL;
  const bpW=items.filter(i=>i.bag==="Backpack").reduce((s,i)=>s+(parseFloat(i.weight)||0),0);
  const bpV=items.filter(i=>i.bag==="Backpack").reduce((s,i)=>s+(parseFloat(i.volume)||0),0);
  const gbW=items.filter(i=>i.bag==="Global Briefcase").reduce((s,i)=>s+(parseFloat(i.weight)||0),0);
  const neededCost=items.filter(i=>!i.owned).reduce((s,i)=>s+(parseFloat(i.cost)||0),0);
  const ownedCount=items.filter(i=>i.owned).length;
  const gearPct=items.length>0?Math.round((ownedCount/items.length)*100):0;

  const toggleOwned=id=>setItems(p=>p.map(it=>it.id===id?{...it,owned:!it.owned,status:it.owned?"needed":"owned"}:it));
  const removeItem=id=>setItems(p=>p.filter(it=>it.id!==id));
  const updateItem=(id,f,v)=>setItems(p=>p.map(it=>it.id===id?{...it,[f]:v}:it));
  const addItemToCat=cat=>{setItems(p=>[...p,{id:Date.now(),name:"New Item",cat,weight:"0",cost:"0",volume:"0",owned:false,bag:"Backpack",status:"needed"}]);setOpenCatsPersist(o=>({...o,[cat]:true}));};
  const toggleCat=id=>setOpenCatsPersist(o=>({...o,[id]:!o[id]}));

  // filter logic
  const visibleCats=filterCat==="all"?CATS:CATS.filter(c=>c.id===filterCat);
  const itemsForCat=catId=>items.filter(i=>i.cat===catId);

  async function genSuggestions(skipCache){
    if(!skipCache){try{const c=localStorage.getItem(suggestCacheKey);if(c){const p=JSON.parse(c);if(Array.isArray(p)&&p.length>0){setSuggestions(p);setSuggestDone(true);return;}}}catch(e){}}
    setSuggestLoading(true);
    const existing=items.map(i=>i.name.toLowerCase());
    const tp=tripData.travelerProfile;
    const prompt=`You are a travel packing expert and co-architect for a ${pp?.tripType||"exploration"} trip.

TRIP DETAILS:
- Trip: ${formatTripNameDisplay(tripData.tripName||"expedition")}
- Duration: ${pp?.duration||"medium"} (${totalNights} nights)
- Destinations: ${tripData.phases.map(p=>`${p.name||p.destination||""}, ${p.country} (${p.nights}n, ${p.type})`).join("; ")}
- Climate: ${pp?.climate?.replace(/-/g," ")||"mixed"}, ${pp?.season||"dry"} season
- Temperature: ${pp?.tempRange||"20-30C"}
- Activities: ${pp?.activities?.join(", ")||tripTypes.join(", ")}
- Travel style: ${tp?.style||"independent"}
- Group: ${tp?.group||"solo"}
${pp?.essentialItems?.length?`- Essential gear already flagged: ${pp.essentialItems.join(", ")}`:""}

ALREADY IN PACK (do NOT suggest these): ${existing.slice(0,25).join(", ")}

Generate 6-8 specific packing suggestions for this exact trip. For each suggestion:
- Be specific to THIS trip (mention the destination, climate, activities by name)
- Explain WHY this item matters for this specific trip
- Include realistic cost and weight estimates in lbs
- Assign to correct category: clothes, tech, travel, health, docs, dive, creator, adventure, safari, moto, work
- Assign bag: Backpack, Global Briefcase, Worn, Digital, Day Bag

Return ONLY a JSON array:
[{"name":"item name","cat":"category","reason":"specific reason for THIS trip","weight":0.3,"volume":0.2,"cost":25,"bag":"Backpack","priority":"essential|nice-to-have"}]`;
    const raw=await askAI(prompt,1200);
    const parsed=parseJSON(raw);
    if(parsed&&Array.isArray(parsed)){const tagged=parsed.map((s,i)=>({...s,id:"s"+Date.now()+i}));setSuggestions(tagged);try{localStorage.setItem(suggestCacheKey,JSON.stringify(tagged));}catch(e){}}
    setSuggestLoading(false);setSuggestDone(true);
  }
  const acceptSuggestion=s=>{posthog.capture("refine_item_added",{item_name:s.name,item_category:s.cat,essential:s.priority==="essential"||s.essential||false});setItems(p=>[...p,{id:Date.now(),name:s.name,cat:s.cat||"travel",weight:s.weight||0,volume:s.volume||0,cost:s.cost||0,bag:s.bag||"Backpack",owned:false,status:"needed"}]);setAccepted(p=>[...p,s.id]);setSuggestions(p=>{const next=p.filter(x=>x.id!==s.id);try{localStorage.setItem(suggestCacheKey,JSON.stringify(next));}catch(e){}return next;});};
  const firePackCaChip=(message)=>{
    posthog.capture("pack_ca_chip",{message});
    window.dispatchEvent(new CustomEvent("openCA",{detail:{message,submit:true}}));
  };

  // shared props for PackItemRow
  const rowProps={isMobile,toggleOwned,updateItem,removeItem,wM,unit,BAGS,BAG_C};
  const selectCategory=(cat)=>{setActiveCategory(cat);setPackView("category");};
  const packMobileScrollBottom=isMobile?"calc(16px + env(safe-area-inset-bottom, 0px))":"32px";

  return(
    <div style={{fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",background:"transparent",minHeight:"100vh",color:"#FFF",display:"flex",flexDirection:"column",animation:"consoleIn 0.45s cubic-bezier(0.25,0.46,0.45,0.94) both"}}>
      <WorldMapBackground phases={tripData?.phases||[]} console="pack" departureCity={tripData?.departureCity||tripData?.city||""}/>
      <div style={{position:'relative',zIndex:1,display:'flex',flexDirection:'column',flex:1,minHeight:'100vh',background:'transparent'}}>
      {!isFullscreen && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          height: 44,
          padding: "0 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <button type="button" onClick={onExpedition} style={{
            position: "absolute",
            left: 20,
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.70)",
            fontSize: 24,
            cursor: "pointer",
            padding: 0,
            minWidth: 44,
            minHeight: 44,
            display: "flex",
            alignItems: "center",
          }} aria-label="Back to landing">←</button>
          <span style={{
            fontFamily: "'Fraunces',serif",
            fontSize: 18,
            fontWeight: 400,
            color: "#E8DCC8",
            letterSpacing: "0.02em",
          }}>My Pack</span>
        </div>
      )}
      {/* Upper dashboard — desktop side inset matches card column / Trip Console */}
      <div style={isMobile?{padding:'0 12px',width:'100%',boxSizing:'border-box'}:{maxWidth:CONSOLE_CONTENT_MAX,margin:'0 auto',padding:'0 24px',width:'100%',boxSizing:'border-box'}}>
      {!isFullscreen && (
        <div style={{ padding: isMobile ? "16px 12px" : "16px 0" }}>
          {tripData?.tripName && (
            <div style={{
              fontFamily: "'Fraunces',serif",
              fontSize: 14,
              fontWeight: 300,
              fontStyle: "italic",
              color: "#5E8B8A",
              textAlign: "center",
              marginBottom: 16,
            }}>{formatTripNameDisplay(tripData.tripName)}</div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: "rgba(255,255,255,0.55)", fontFamily: "'Instrument Sans',system-ui,-apple-system,sans-serif" }}>WEIGHT</span>
              <button type="button" onClick={() => setUnit((u) => (u === "lbs" ? "kg" : "lbs"))} style={{ fontSize: 9, fontWeight: 700, color: CULTURE_GOLD, background: "rgba(201,160,76,0.08)", border: "1px solid rgba(201,160,76,0.25)", borderRadius: 12, padding: "2px 8px", cursor: "pointer", fontFamily: "'Instrument Sans',system-ui,-apple-system,sans-serif", letterSpacing: 1 }}>{unit.toUpperCase()}</button>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: (bpW * wM) > wLim ? "#FF6B6B" : CULTURE_GOLD, fontFamily: "'Instrument Sans',system-ui,-apple-system,sans-serif" }}>{(bpW * wM).toFixed(1)} / {wLim} {unit}</span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ height: "100%", background: (bpW * wM) > wLim ? "linear-gradient(90deg, rgba(201,160,76,0.5), #FF6B6B)" : `linear-gradient(90deg, rgba(201,160,76,0.35), ${CULTURE_GOLD})`, borderRadius: 3, width: Math.min((bpW * wM) / wLim * 100, 100) + "%", transition: "width 0.5s ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: "rgba(255,255,255,0.55)", fontFamily: "'Instrument Sans',system-ui,-apple-system,sans-serif" }}>VOLUME</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: bpV > VL ? "#FF6B6B" : "#5E8B8A", fontFamily: "'Instrument Sans',system-ui,-apple-system,sans-serif" }}>{bpV.toFixed(1)} / {VL} L</span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ height: "100%", background: bpV > VL ? "linear-gradient(90deg, rgba(94,139,138,0.5), #FF6B6B)" : "linear-gradient(90deg, rgba(94,139,138,0.35), #5E8B8A)", borderRadius: 3, width: Math.min(bpV / VL * 100, 100) + "%", transition: "width 0.5s ease" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {[
              { label: "PERSONAL BAG", value: (gbW * wM).toFixed(1) + unit },
              { label: "GEAR READY", value: gearPct + "%" },
              { label: "STILL NEED", value: "$" + Math.round(neededCost).toLocaleString() },
              { label: "TOTAL ITEMS", value: items.length },
            ].map((s) => (
              <div
                key={s.label}
                className={s.label === "GEAR READY" && gearPct >= 100 ? "pack-gear-ready-seal--full" : undefined}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(122,111,93,0.25)",
                  borderRadius: 10,
                  padding: "10px 8px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: 1, fontFamily: "'Instrument Sans',system-ui,-apple-system,sans-serif", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: isMobile ? 14 : 18, fontWeight: 700, color: CULTURE_GOLD, fontFamily: "'Instrument Sans',system-ui,-apple-system,sans-serif" }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Built-for strip */}
      {!isFullscreen&&pp&&(()=>{
        const getClimateAdvisory=(climate,season)=>{const map={'tropical-hot':{dry:{label:'Tropical',advice:'Pack light — reef-safe sunscreen essential'},wet:{label:'Tropical Wet',advice:'Quick-dry everything — waterproof your gear'},default:{label:'Tropical',advice:'Pack light, breathable fabrics only'}},'tropical-wet':{default:{label:'Tropical Wet',advice:'Quick-dry everything — waterproof your gear'}},'temperate-cool':{default:{label:'Temperate',advice:'Layer up — mornings cold, afternoons warm'}},'cold-alpine':{default:{label:'Alpine Cold',advice:'Warm layers essential — windproof shell critical'}},'mediterranean':{default:{label:'Mediterranean',advice:'Light clothing + one smart dinner outfit'}},'desert-hot':{default:{label:'Desert',advice:'UV protection critical — cover up at midday'}},'varied':{default:{label:'Mixed Climate',advice:'Pack for range — layers are your friend'}}};return map[climate]?.[season]||map[climate]?.default||{label:'Varied',advice:'Check conditions per destination'};};
        const ca=pp.climate?getClimateAdvisory(pp.climate,pp.season):null;
        const builtForPrimary=`✦ Built for: ${formatTripNameDisplay(tripData.tripName||"Your Trip")} · ${totalNights}n · ${pp.tripType}${coupleMode?" · for 2":""}${ca?` · 🌡 ${ca.label}${pp.tempRange?" · "+pp.tempRange:""}`:""}`;
        return <div style={{padding:isMobile?"6px 12px":"6px 0",background:"rgba(201,160,76,0.04)",borderBottom:"1px solid rgba(201,160,76,0.12)",overflow:"hidden"}}>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:15,fontStyle:"italic",fontWeight:400,color:"rgba(248,245,240,0.70)",lineHeight:1.55,letterSpacing:"0.02em"}}>{builtForPrimary}</div>
          {ca?.advice&&<div style={{fontFamily:"'Fraunces',serif",fontSize:15,fontStyle:"italic",fontWeight:400,color:"rgba(248,245,240,0.45)",lineHeight:1.5,marginTop:6}}>{ca.advice}</div>}
        </div>;
      })()}
      <div style={{
        display: "flex",
        gap: 8,
        padding: isMobile ? "12px 12px" : "12px 0",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        msOverflowStyle: "none",
        scrollbarWidth: "none",
        position: "relative",
        borderBottom: "1px solid rgba(196,87,30,0.14)",
        background: "rgba(10,7,5,0.45)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}>
        {packSaveFlash && <div style={{ position: "absolute", right: 12, top: 4, fontFamily: "'Instrument Sans',system-ui,-apple-system,sans-serif", fontSize: 13, color: "#69F0AE", opacity: 0.80, letterSpacing: 1, zIndex: 2, pointerEvents: "none" }}>✓ saved</div>}
        {[
          { id: "pack", label: "Pack List" },
          { id: "tailor", label: "Tailor" },
          { id: "weight", label: "Pack Index" },
        ].map((t) => (
          <button key={t.id} type="button" onClick={() => setPackTab(t.id)} style={{
            padding: "0 16px",
            height: isMobile ? 36 : 40,
            borderRadius: 20,
            border: packTab === t.id ? "none" : "1px solid #7A6F5D",
            background: packTab === t.id ? "#C9A04C" : "transparent",
            color: packTab === t.id ? "#0A0705" : "rgba(232,220,200,0.60)",
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "'Instrument Sans',system-ui,-apple-system,sans-serif",
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
            transition: "all 0.2s ease",
            position: "relative",
          }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              {t.label}
              {t.id === "tailor" && <HelpTip compact noLeadingMargin text="Tell your Co-Architect about your trip and get a personalized gear list built around your exact destinations and activities" />}
            </span>
            {t.id === "tailor" && suggestions.length > 0 && (
              <div style={{ position: "absolute", top: -2, right: -2, width: 7, height: 7, borderRadius: "50%", background: CULTURE_GOLD, boxShadow: `0 0 8px ${CULTURE_GOLD}` }} />
            )}
          </button>
        ))}
      </div>
      {/* Need to Buy pill (retained as a standalone shortcut) */}
      {packTab==="pack"&&packView==="dashboard"&&<div style={{display:"flex",padding:isMobile?"8px 12px":"8px 0",borderBottom:"1px solid rgba(169,70,29,0.2)",background:"transparent",flexShrink:0}}>
        <button onClick={()=>setFilterCat(f=>f==="needtobuy"?"all":"needtobuy")} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 16px",borderRadius:20,border:"1px solid "+(filterCat==="needtobuy"?"rgba(255,107,107,0.85)":"rgba(255,107,107,0.25)"),background:filterCat==="needtobuy"?"rgba(255,107,107,0.18)":"transparent",cursor:"pointer",whiteSpace:"nowrap",minHeight:34,boxShadow:filterCat==="needtobuy"?"0 0 10px rgba(255,107,107,0.30)":"none",transition:"all 0.30s cubic-bezier(0.25,0.46,0.45,0.94)"}}>
          <span style={{fontSize:13}}>{filterCat==="needtobuy"?"←":"🛒"}</span>
          <span style={{fontSize:11,color:filterCat==="needtobuy"?"#FF6B6B":"rgba(255,107,107,0.6)",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",fontWeight:filterCat==="needtobuy"?700:400,letterSpacing:1}}>{filterCat==="needtobuy"?"ALL ITEMS":"NEED TO BUY"}</span>
        </button>
      </div>}
      {/* Main content — same column as Trip Console (CONSOLE_CONTENT_MAX) */}
      {packTab==="pack"&&packView==="category"&&activeCategory&&(
        <>
          <CategoryDetailPage cat={activeCategory} onBack={()=>{setPackView('dashboard');setActiveCategory(null);}} catItems={items.filter(i=>i.cat===activeCategory.id)} isMobile={isMobile} rowProps={rowProps} addItemToCat={addItemToCat}/>
        </>
      )}
      {packTab==="pack"&&packView==="dashboard"&&(
        <div className="pack-scroll-dashboard" style={{overflowY:"auto",flex:1,padding:isMobile?`12px 0 ${packMobileScrollBottom}`:"12px 0 32px",boxSizing:"border-box",background:"transparent",backgroundImage:"none",width:"100%"}}>
          {filterCat==="needtobuy"?(()=>{
            const unowned=[...items].filter(i=>!i.owned).sort((a,b)=>(parseFloat(b.cost)||0)-(parseFloat(a.cost)||0));
            const total=unowned.reduce((s,i)=>s+(parseFloat(i.cost)||0),0);
            const CAT_COLORS_NTB=NOTEBOOK_CAT_COLORS;
            return(<div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,padding:"10px 14px",background:"rgba(255,107,107,0.06)",border:"1px solid rgba(255,107,107,0.22)",borderRadius:10}}>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13,color:"rgba(255,107,107,0.85)",letterSpacing:2,fontWeight:700,fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}>🛒 NEED TO BUY</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.45)",marginTop:2}}>{unowned.length} item{unowned.length!==1?"s":""} · sorted by cost</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:20,fontWeight:900,color:"#FF6B6B",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}>${total.toLocaleString()}</div>
                  <div style={{fontSize:10,color:"rgba(255,107,107,0.55)",letterSpacing:1,whiteSpace:"nowrap"}}>TOTAL TO SPEND</div>
                </div>
              </div>
              {unowned.length===0?(<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:28,marginBottom:12}}>✅</div><div style={{fontFamily:"'Fraunces',serif",fontSize:16,fontStyle:"italic",color:"rgba(105,240,174,0.75)"}}>You own everything!</div></div>):(
                <div style={{display:"flex",flexDirection:"column",gap:0,borderRadius:12,overflow:"hidden",border:"1px solid rgba(255,255,255,0.07)"}}>
                  {unowned.map((item,i)=>{
                    const c=CAT_COLORS_NTB[item.cat]||"#C9A04C";
                    const running=unowned.slice(0,i+1).reduce((s,x)=>s+(parseFloat(x.cost)||0),0);
                    return(<div key={item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:i%2===0?"rgba(18,5,0,0.9)":"rgba(10,3,0,0.9)",borderBottom:i<unowned.length-1?"1px solid rgba(255,255,255,0.06)":"none",borderLeft:`3px solid ${c}`}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:"#FFF",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",whiteSpace:"nowrap"}}>{item.name}</div>
                        <div style={{fontSize:10,color:`${c}99`,letterSpacing:1,marginTop:2,fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}>{item.cat?.toUpperCase()} · {item.bag}</div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontSize:14,fontWeight:700,color:"#c9a04c",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}>${parseFloat(item.cost||0).toLocaleString()}</div>
                        <div style={{fontSize:10,color:"rgba(255,255,255,0.28)",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}>running: ${running.toLocaleString()}</div>
                      </div>
                      <button onClick={()=>toggleOwned(item.id)} style={{padding:"5px 10px",borderRadius:6,border:"1px solid rgba(105,240,174,0.3)",background:"rgba(105,240,174,0.06)",color:"#69F0AE",fontSize:11,cursor:"pointer",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>GOT IT</button>
                    </div>);
                  })}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",background:"rgba(255,107,107,0.08)",borderTop:"1px solid rgba(255,107,107,0.2)"}}>
                    <div style={{fontSize:11,color:"rgba(255,107,107,0.75)",letterSpacing:2,fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",fontWeight:700}}>TOTAL TO BUY</div>
                    <div style={{fontSize:20,fontWeight:900,color:"#FF6B6B",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}>${total.toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>);
          })():<>
            <div style={{width:"100%",boxSizing:"border-box",background:"transparent"}}>
              {CATS.map((cat,i)=><CatCard key={cat.id} cat={cat} idx={i} isMobile={isMobile} itemsForCat={itemsForCat} wM={wM} unit={unit} onSelectCategory={selectCategory}/>)}
            </div>
            {pp&&<>
              <button onClick={()=>setShowAddCats(o=>!o)} style={{width:"100%",padding:"10px 14px",marginTop:4,borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.02)",color:"rgba(255,255,255,0.4)",fontSize:12,fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",cursor:"pointer",letterSpacing:1,textAlign:"center",minHeight:40}}>＋ Add gear categories</button>
              {showAddCats&&<div style={{marginTop:8,padding:"10px 14px",background:"rgba(10,7,5,0.6)",border:"1px solid rgba(201,160,76,0.2)",borderRadius:10}}>
                <div style={{fontSize:10,color:"rgba(201,160,76,0.7)",letterSpacing:2,fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",fontWeight:700,marginBottom:8}}>HIDDEN CATEGORIES</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {ALL_CATS.filter(c=>!CATS.find(v=>v.id===c.id)).map(c=>(
                    <button key={c.id} onClick={()=>{const next=[...CATS.map(x=>x.id),c.id];setEnabledCats(next);}} style={{padding:"6px 12px",borderRadius:16,border:"1px solid rgba(255,255,255,0.15)",background:"transparent",color:"rgba(255,255,255,0.5)",fontSize:12,fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",cursor:"pointer",display:"flex",alignItems:"center",gap:5,minHeight:32}}>
                      <span>{c.icon}</span>{c.label}
                    </button>
                  ))}
                  {ALL_CATS.filter(c=>!CATS.find(v=>v.id===c.id)).length===0&&<div style={{fontSize:12,color:"rgba(255,255,255,0.35)",fontStyle:"italic"}}>All categories are visible</div>}
                </div>
              </div>}
            </>}
          </>}
          <div style={{textAlign:"center",marginTop:8,padding:"8px 0",borderTop:"1px solid rgba(169,70,29,0.12)"}}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:15,fontWeight:100,fontStyle:"italic",color:"rgba(201,160,76,0.35)",letterSpacing:2}}>1 bag. travel light. · {(bpW*wM).toFixed(1)}{unit}</div>
          </div>
        </div>
      )}
      {packTab==="tailor"&&(
        <div style={{overflowY:"auto",flex:1,padding:isMobile?`12px 0 ${packMobileScrollBottom}`:"12px 0 32px",boxSizing:"border-box",width:"100%"}}>
          <div style={{background:"linear-gradient(135deg,rgba(169,70,29,0.12),rgba(201,160,76,0.04))",border:"1px solid rgba(201,160,76,0.28)",borderRadius:12,marginBottom:16,overflow:"hidden"}}>
            <button onClick={()=>{const next=!packBriefCollapsed;setPackBriefCollapsed(next);if(next)try{localStorage.setItem(briefKey,"1");}catch(e){}}} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:"none",border:"none",cursor:"pointer"}}>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:18,color:CULTURE_GOLD,letterSpacing:"0.08em",fontWeight:600}}>✦ CO-ARCHITECT PACK BRIEF</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}>{packBriefCollapsed?"▼":"▲"}</div>
            </button>
            <div style={{maxHeight:packBriefCollapsed?0:400,overflow:"hidden",transition:"max-height 0.28s ease-out"}}>
              <div style={{padding:"0 12px 12px"}}>
                <div style={{fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",fontSize:15,fontWeight:400,color:"rgba(255,248,235,0.85)",lineHeight:1.6,marginBottom:10}}>{getPackBrief(pp,tripData)||`Reviewing your pack for a ${goalLabel} trip across ${countries.slice(0,3).join(", ")}${countries.length>3?" +"+(countries.length-3)+" more":""} — ${totalNights} nights.`}</div>
                <div style={{fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",fontSize:13,color:"rgba(255,255,255,0.5)",marginBottom:8}}>Built for: {formatTripNameDisplay(tripData?.tripName||"your expedition")} · {totalNights} nights · {pp?.tripType||goalLabel} · {pp?.climate?.replace(/-/g," ")||"mixed"}</div>
                <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{tripTypes.map(t=><span key={t} style={{fontSize:11,color:"rgba(201,160,76,0.85)",background:"rgba(169,70,29,0.18)",border:"1px solid rgba(169,70,29,0.35)",borderRadius:10,padding:"3px 9px",letterSpacing:1,fontWeight:700}}>{TI[t]||"🗺️"} {t}</span>)}</div>
              </div>
            </div>
          </div>
          {suggestLoading&&<div>
            <div style={{textAlign:"center",padding:"20px 20px 16px"}}>
              <div style={{position:"relative",width:52,height:52,margin:"0 auto 14px"}}>
                <div style={{position:"absolute",inset:-6,borderRadius:"50%",border:"1.5px solid rgba(201,160,76,0.5)",animation:"amberPulse 1.8s ease-in-out infinite"}}/>
                <div style={{width:52,height:52,borderRadius:"50%",background:"rgba(169,70,29,0.12)",border:"1px solid rgba(201,160,76,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,animation:"logoPulse 2s ease-in-out infinite"}}>✦</div>
              </div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontStyle:"italic",color:"rgba(255,255,255,0.85)",marginBottom:4}}>Analyzing your trip and current pack...</div>
              <div style={{fontSize:10,color:"rgba(201,160,76,0.6)",letterSpacing:2,fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}>{formatTripNameDisplay(tripData.tripName||"your expedition")} · {totalNights}N · {pp?.climate?.replace(/-/g," ")||"mixed"}</div>
            </div>
            {[0,1,2].map(i=><div key={i} style={{borderRadius:12,marginBottom:9,background:"rgba(18,8,0,0.85)",border:"1px solid rgba(255,255,255,0.06)",padding:"14px 12px",animation:`shimmer 1.5s ease-in-out infinite ${i*0.2}s`}}>
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                <div style={{width:70,height:14,borderRadius:6,background:"rgba(201,160,76,0.12)"}}/>
                <div style={{width:50,height:14,borderRadius:6,background:"rgba(255,255,255,0.06)"}}/>
              </div>
              <div style={{width:"80%",height:13,borderRadius:6,background:"rgba(255,255,255,0.06)",marginBottom:8}}/>
              <div style={{width:"60%",height:12,borderRadius:6,background:"rgba(255,255,255,0.04)"}}/>
            </div>)}
          </div>}
          {!suggestLoading&&suggestions.length>0&&<div>
            <div style={{fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",fontSize:12,color:"rgba(201,160,76,0.9)",letterSpacing:3,marginBottom:12,fontWeight:700}}>SUGGESTED FOR YOUR TRIP</div>
            {suggestions.map(s=>{
              const CAT_COLORS_P=PACK_CAT_COLORS;
              const c=CAT_COLORS_P[s.cat]||"#C9A04C";
              const isEssential=s.priority==="essential"||s.essential;
              return(<div key={s.id} style={{borderRadius:12,marginBottom:9,background:"rgba(18,8,0,0.85)",border:"1px solid "+(isEssential?"rgba(201,160,76,0.4)":"rgba(255,255,255,0.08)"),animation:"fadeUp 0.4s ease"}}>
                <div style={{padding:"10px 12px"}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                        {isEssential?<span style={{fontSize:11,color:"#C9A04C",background:"rgba(201,160,76,0.18)",border:"1px solid rgba(201,160,76,0.4)",borderRadius:6,padding:"2px 8px",letterSpacing:1.5,fontWeight:700,fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}>ESSENTIAL</span>:<span style={{fontSize:11,color:CULTURE_GOLD,background:"rgba(201,160,76,0.1)",border:`1px solid ${CULTURE_GOLD}44`,borderRadius:6,padding:"2px 8px",letterSpacing:1.5,fontWeight:700,fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}>RECOMMENDED</span>}
                        <span style={{fontSize:11,color:c,background:c+"14",border:`1px solid ${c}44`,borderRadius:6,padding:"2px 8px",letterSpacing:1,fontWeight:700,fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}>{s.cat}</span>
                      </div>
                      <div style={{fontSize:15,fontWeight:600,color:"#FFF",marginBottom:5}}>{s.name}</div>
                      <div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontStyle:"italic",color:"rgba(255,248,235,0.65)",lineHeight:1.65}}>{s.reason}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0,fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}>{s.cost>0&&<div style={{fontSize:12,fontWeight:700,color:"#c9a04c",marginBottom:3}}>~${s.cost}</div>}{s.weight>0&&<div style={{fontSize:12,color:"rgba(255,255,255,0.45)"}}>~{s.weight}lb</div>}</div>
                  </div>
                  <button type="button" onClick={()=>acceptSuggestion(s)} style={{width:"100%",padding:"10px",borderRadius:8,border:`1px solid ${CULTURE_GOLD}`,background:"rgba(201,160,76,0.08)",color:CULTURE_GOLD,fontSize:13,cursor:"pointer",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",letterSpacing:"0.06em",fontWeight:700,minHeight:40}}>+ ADD TO PACK</button>
                </div>
              </div>);
            })}
          </div>}
          {!suggestLoading&&suggestions.length===0&&suggestDone&&<div style={{marginBottom:16}}>
            <div style={{textAlign:"center",padding:"24px 0 18px"}}>
              <div style={{fontSize:22,marginBottom:10,color:CULTURE_GOLD}}>✦</div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:13,fontStyle:"italic",color:"rgba(255,255,255,0.85)",marginBottom:5}}>{accepted.length>0?`${accepted.length} item${accepted.length>1?"s":""} added to your pack.`:"Your pack looks solid for this trip."}</div>
              <div style={{fontSize:10,color:"rgba(201,160,76,0.65)",letterSpacing:2,fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif"}}>Anything else? Open the Co-Architect.</div>
            </div>
          </div>}
          {suggestDone&&!suggestLoading&&<div style={{borderTop:"1px solid rgba(196,87,30,0.2)",paddingTop:18,marginTop:8}}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:14,fontStyle:"italic",color:"rgba(201,160,76,0.7)",textAlign:"center",marginBottom:12,lineHeight:1.45}}>✦ Ask Co-Architect for more</div>
            <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:4}}>
              {["Stay under 15 lbs","I do laundry weekly","Add rain gear","Pack for heat"].map((p)=>(
                <button key={p} type="button" onClick={()=>firePackCaChip(p)} style={{background:"rgba(201,160,76,0.08)",border:"1px solid rgba(201,160,76,0.4)",color:CULTURE_GOLD,borderRadius:20,fontSize:13,padding:"6px 14px",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",cursor:"pointer",margin:4}}>{p}</button>
              ))}
            </div>
          </div>}
        </div>
      )}
      {packTab==="weight"&&(
        <div style={{overflowY:"auto",flex:1,padding:isMobile?`12px 0 ${packMobileScrollBottom}`:"12px 0 32px",boxSizing:"border-box",width:"100%",position:"relative"}}>
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
            <button type="button" onClick={()=>setUnit(u=>u==="lbs"?"kg":"lbs")} style={{fontSize:11,color:"rgba(255,255,255,0.5)",background:"transparent",border:"1px solid rgba(255,255,255,0.25)",borderRadius:20,padding:"4px 12px",cursor:"pointer",fontFamily:"'Instrument Sans',system-ui,-apple-system,sans-serif",letterSpacing:0.5,fontWeight:600}}>SWITCH TO {unit==="lbs"?"KG":"LBS"}</button>
          </div>
          {["Backpack","Global Briefcase","Worn","Digital"].map(bagName=>{
            const bagItems=items.filter(i=>i.bag===bagName);
            const bagW=bagItems.reduce((s,i)=>s+(parseFloat(i.weight)||0),0)*wM;
            const bagV=bagName==="Backpack"?bpV:0;
            const isOver=bagName==="Backpack"&&bagW>wLim;
            const bagColor=bagName==="Backpack"?CULTURE_GOLD:bagName==="Global Briefcase"?"#7A6F5D":bagName==="Worn"?"#c9a04c":CULTURE_GOLD;
            return(
              <div key={bagName} style={{background:"rgba(18,8,0,0.85)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:16,marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:16,fontWeight:600,color:bagColor,letterSpacing:0.5}}>{bagName}</div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:20,fontWeight:900,color:isOver?"#FF6B6B":bagColor,letterSpacing:-1,lineHeight:1}}>{bagW.toFixed(1)}<span style={{fontSize:15,fontWeight:400,opacity:0.8}}> {unit}</span></div>
                    {bagName==="Backpack"&&<div style={{fontSize:15,color:"#c9a04c",marginTop:1,fontWeight:700}}>{bagV.toFixed(1)}L / {VL}L</div>}
                  </div>
                </div>
                {bagName==="Backpack"&&<div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden",marginBottom:11}}><div style={{height:"100%",background:isOver?"linear-gradient(90deg,rgba(201,160,76,0.5),#FF6B6B)":`linear-gradient(90deg,rgba(201,160,76,0.35),${CULTURE_GOLD})`,borderRadius:2,width:Math.min(bagW/wLim*100,100)+"%",transition:"width 0.5s ease"}}/></div>}
                {bagItems.length===0?<div style={{fontSize:15,color:"rgba(255,255,255,0.35)",textAlign:"center",padding:"10px 0"}}>No items</div>
                :bagItems.sort((a,b)=>(parseFloat(b.weight)||0)-(parseFloat(a.weight)||0)).map(item=>(
                  <div key={item.id} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                    <div style={{fontSize:13,color:PACK_CREAM,flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.owned?<span style={{color:CULTURE_GOLD,marginRight:4}}>✓</span>:null}{item.name}</div>
                    <div style={{fontSize:14,color:"rgba(255,255,255,0.65)",flexShrink:0,marginLeft:8,fontWeight:700}}>{parseFloat(item.weight)>0?(parseFloat(item.weight)*wM).toFixed(2)+unit:"—"}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
      </div>
      </div>
    </div>
  );
}

export default PackConsole;
