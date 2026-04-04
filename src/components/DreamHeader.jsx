import { useMobile } from '../hooks/useMobile';
import ConsoleHeader from './ConsoleHeader';
import { PILL_COLORS } from '../constants/colors';

function DreamHeader({step,screenLabel}) {
  const isMobile=useMobile();
  const pillColors=PILL_COLORS;const pills=<div style={{display:"flex",gap:5,alignItems:"center"}}>{[1,2,3,4].map(n=><div key={n} style={{width:n===step?28:18,height:6,borderRadius:3,background:n<step?pillColors[n-1]+"88":n===step?pillColors[n-1]:"rgba(255,255,255,0.08)",boxShadow:n===step?`0 0 10px ${pillColors[n-1]}66`:"none",transition:"all 0.3s ease"}}/>)}</div>;
  return <ConsoleHeader console="dream" isMobile={isMobile} rightSlot={pills} screenLabel={screenLabel}/>;
}

export default DreamHeader;
