import { useState, useEffect } from "react";

function BottomSheet({open,onClose,children,zIndex=400,hideClose=false}) {
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    if(open){requestAnimationFrame(()=>requestAnimationFrame(()=>setVisible(true)));}
    else{setVisible(false);}
  },[open]);
  useEffect(()=>{
    if(open){
      const y=window.scrollY;
      document.body.style.overflow='hidden';
      document.body.style.position='fixed';
      document.body.style.width='100%';
      document.body.style.top=`-${y}px`;
    } else {
      const top=document.body.style.top;
      document.body.style.overflow='';
      document.body.style.position='';
      document.body.style.width='';
      document.body.style.top='';
      if(top)window.scrollTo(0,-parseInt(top));
    }
    return()=>{
      const top=document.body.style.top;
      document.body.style.overflow='';
      document.body.style.position='';
      document.body.style.width='';
      document.body.style.top='';
      if(top)window.scrollTo(0,-parseInt(top));
    };
  },[open]);
  if(!open)return null;
  return(
    <div style={{position:'fixed',inset:0,zIndex,display:'flex',flexDirection:'column',justifyContent:'flex-end'}} onClick={onClose}>
      <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.72)'}}/>
      <div onClick={e=>e.stopPropagation()}
        style={{position:'relative',background:'#1C1208',borderRadius:'20px 20px 0 0',border:'1px solid rgba(212,180,120,0.08)',maxHeight:'90vh',display:'flex',flexDirection:'column',paddingBottom:'env(safe-area-inset-bottom)',transform:visible?'translateY(0)':'translateY(100%)',transition:visible?'transform 0.42s cubic-bezier(0.34,1.56,0.64,1)':'none',boxShadow:'inset 0 1px 0 rgba(255,180,80,0.35),inset 1px 0 0 rgba(255,140,40,0.12),inset -1px 0 0 rgba(255,140,40,0.12),inset 0 -1px 0 rgba(255,100,20,0.08)'}}>
        {!hideClose&&<button onClick={onClose} style={{position:'absolute',top:20,right:20,width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.15)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1,flexShrink:0}}>
          <span style={{fontSize:16,color:'rgba(255,255,255,0.7)',lineHeight:1}}>✕</span>
        </button>}
        <div style={{height:16,flexShrink:0}}/>
        <div style={{overflowY:'auto',flex:1,WebkitOverflowScrolling:'touch'}}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default BottomSheet;
