import { memo } from "react";
import { ComposableMap, Geographies, Geography, Line, Marker } from "react-simple-maps";
import CITY_COORDS from '../constants/cityCoords';

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const EXPEDITION_COORDS = {
  'Honduras':    [-86.2, 15.2],
  'Belize':      [-88.5, 17.2],
  'Barbados':    [-59.5, 13.2],
  'Egypt':       [30.8,  26.8],
  'India':       [78.9,  20.6],
  'Malaysia':    [109.7,  4.2],
  'Thailand':    [100.9, 15.9],
  'Indonesia':   [113.9, -0.8],
  'Japan':       [138.2, 36.2],
  'Vietnam':     [108.3, 14.1],
  'Philippines': [122.9, 12.9],
  'Maldives':    [73.2,   3.2],
  'Italy':       [12.6,  41.9],
  'France':      [2.3,   46.2],
  'Portugal':    [-8.2,  39.6],
  'Mexico':      [-102.5, 23.6],
  'Costa Rica':  [-83.8,  9.7],
  'Panama':      [-80.8,  8.5],
  'Greece':      [21.8,  39.1],
  'Jordan':      [36.2,  30.6],
  'Tanzania':    [34.9,  -6.4],
};

const WorldMapBackground = memo(({phases, activeCountry, console: consoleProp, dream, departureCity}) => {
  try {
    const isPack = consoleProp === 'pack';
    const phaseList = phases||[];
    const coords = phaseList.map(p=>EXPEDITION_COORDS[p.country]).filter(Boolean);
    const activeCoord = activeCountry ? EXPEDITION_COORDS[activeCountry] : null;
    const isMobileMap = typeof window!=='undefined' && window.innerWidth < 480;
    const geoFill = dream ? '#E8DCC8' : isPack ? '#FF9F43' : '#E8DCC8';
    const geoFillOp = dream ? 0.04 : isPack ? 0.035 : (isMobileMap ? 0.08 : 0.06);
    const geoStroke = dream ? '#E8DCC8' : isPack ? '#FF9F43' : '#00E5FF';
    const geoStrokeOp = dream ? 0.03 : isPack ? 0.08 : (isMobileMap ? 0.22 : 0.18);

    // Departure city coord — prepend to route if found
    const depCoord = departureCity ? (CITY_COORDS[departureCity] || null) : null;
    const routeCoords = depCoord ? [depCoord, ...coords] : coords;

    return (
      <div style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,overflow:'hidden'}}>
        <style>{`@keyframes dashMove{to{stroke-dashoffset:-50}}.route-line{animation:dashMove 6s linear infinite}@keyframes activePulseR{0%,100%{r:2.8}50%{r:5}}.active-dot{animation:activePulseR 1.4s ease-in-out infinite}@keyframes depPulse{0%,100%{opacity:0.55}50%{opacity:0.9}}.dep-ring{animation:depPulse 2.4s ease-in-out infinite}`}</style>
        <ComposableMap projection="geoNaturalEarth1" projectionConfig={{scale:160,center:[20,10]}} style={{width:'100%',height:'100%'}}>
          <Geographies geography={GEO_URL}>
            {({geographies})=>geographies.map(geo=>(
              <Geography key={geo.rsmKey} geography={geo} fill={geoFill} fillOpacity={geoFillOp} stroke={geoStroke} strokeWidth={0.4} strokeOpacity={geoStrokeOp} style={{default:{outline:'none'},hover:{outline:'none'},pressed:{outline:'none'}}}/>
            ))}
          </Geographies>
          {routeCoords.length>1&&routeCoords.map((coord,i)=>{
            if(i===routeCoords.length-1)return null;
            const isDep = depCoord && i===0;
            return(<Line key={i} from={coord} to={routeCoords[i+1]} stroke="#FFD93D" strokeWidth={isDep?1:1.2} strokeOpacity={isDep?(isPack?0.3:0.45):(isPack?0.55:0.85)} strokeDasharray={isDep?"3,6":"4,4"} className="route-line"/>);
          })}
          {depCoord&&(
            <Marker coordinates={depCoord}>
              <circle r={9} fill="none" stroke="#E8DCC8" strokeWidth={1.2} strokeOpacity={0.55} className="dep-ring"/>
              <circle r="2.5" fill="#E8DCC8" fillOpacity={0.85}/>
            </Marker>
          )}
          {phaseList.map((phase,i)=>{
            const coord = EXPEDITION_COORDS[phase.country];
            if(!coord) return null;
            const isActive = activeCountry && phase.country === activeCountry;
            return(
              <Marker key={i} coordinates={coord}>
                <circle r={isActive?14:6} fill={isActive?"#00E5FF":"#FF9F43"} fillOpacity={isActive?0.35:(isPack?0.18:0.30)}/>
                <circle r="2.8" fill={isActive?"#00E5FF":"#FFD93D"} fillOpacity={isActive?1:(isPack?0.65:1)} className={isActive?"active-dot":undefined}/>
              </Marker>
            );
          })}
        </ComposableMap>
      </div>
    );
  } catch(e) { return null; }
});

export default WorldMapBackground;
