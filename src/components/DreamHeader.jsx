import { useMobile } from '../hooks/useMobile';
import ConsoleHeader from './ConsoleHeader';
import { PILL_COLORS } from '../constants/colors';
import { CONSOLE_CONTENT_MAX } from '../constants/layout';

/** Same horizontal column as Trip / Pack console upper dashboard */
export function DreamConsoleColumn({ children }) {
  const isMobile = useMobile();
  return (
    <div
      style={
        isMobile
          ? undefined
          : {
              maxWidth: CONSOLE_CONTENT_MAX,
              margin: "0 auto",
              width: "100%",
              padding: "0 24px",
              boxSizing: "border-box",
            }
      }
    >
      {children}
    </div>
  );
}

function DreamHeader({step,screenLabel}) {
  const isMobile=useMobile();
  const pillColors=PILL_COLORS;
  const pills=(
    <div style={{display:"flex",gap:6,alignItems:"center",justifyContent:"center"}}>
      {[1,2,3,4].map(n=>(
        <div
          key={n}
          style={{
            width:n===step?5:4,
            height:n===step?5:4,
            borderRadius:"50%",
            background:n<step?pillColors[n-1]+"88":n===step?pillColors[n-1]:"rgba(255,255,255,0.08)",
            boxShadow:n===step?`0 0 8px ${pillColors[n-1]}66`:"none",
            transition:"all 0.3s ease",
            flexShrink:0,
          }}
        />
      ))}
    </div>
  );
  return (
    <DreamConsoleColumn>
      <ConsoleHeader console="dream" isMobile={isMobile} rightSlot={pills} screenLabel={screenLabel}/>
    </DreamConsoleColumn>
  );
}

export default DreamHeader;
