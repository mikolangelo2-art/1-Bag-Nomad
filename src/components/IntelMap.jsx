import { useState, useEffect, useMemo, memo } from "react";
import { ComposableMap, Geographies, Geography, Line, Marker } from "react-simple-maps";
import CITY_COORDS from '../constants/cityCoords';

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const EASE = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";

const INTEL_CSS = `
@keyframes imDotPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
@keyframes imDotIn {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
@keyframes imRouteIn {
  from { stroke-dashoffset: 200; }
  to { stroke-dashoffset: 0; }
}
@keyframes imRouteDash {
  to { stroke-dashoffset: -50; }
}
@keyframes imLabelIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

function resolveCoord(phase) {
  return CITY_COORDS[phase.name] || CITY_COORDS[phase.country] || null;
}

function getProjectionConfig(coords) {
  if (!coords.length) return { scale: 160, center: [20, 10] };
  const lngs = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;
  const spanLng = Math.max(maxLng - minLng, 30);
  const spanLat = Math.max(maxLat - minLat, 20);
  const span = Math.max(spanLng, spanLat * 1.5);
  const scale = Math.min(800, Math.max(120, 18000 / span));
  return { scale, center: [centerLng, centerLat] };
}

const IntelMap = memo(function IntelMap({ tripData, isMobile, onSelectPhase }) {
  const [mapReady, setMapReady] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [dotsVisible, setDotsVisible] = useState(false);
  const [routeVisible, setRouteVisible] = useState(false);

  const phases = tripData?.phases || [];

  const phaseCoords = useMemo(() =>
    phases.map(p => ({ ...p, coord: resolveCoord(p) })).filter(p => p.coord),
    [phases]
  );

  const projConfig = useMemo(() =>
    getProjectionConfig(phaseCoords.map(p => p.coord)),
    [phaseCoords]
  );

  useEffect(() => {
    const t1 = setTimeout(() => setMapReady(true), 100);
    const t2 = setTimeout(() => setRouteVisible(true), 700);
    const t3 = setTimeout(() => setDotsVisible(true), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const handleDotClick = (phase) => {
    if (selectedId === phase.id) {
      setSelectedId(null);
    } else {
      setSelectedId(phase.id);
      if (onSelectPhase) onSelectPhase(phase);
    }
  };

  const dotSize = isMobile ? 8 : 6;
  const outerSize = isMobile ? 16 : 12;

  return (
    <div style={{
      position: "relative",
      width: "100%",
      minHeight: isMobile ? 340 : 420,
      overflow: "hidden",
      borderRadius: 16,
      background: "rgba(0,4,12,0.9)",
      border: "1px solid rgba(255,217,61,0.12)",
    }}>
      <style>{INTEL_CSS}</style>

      {/* Map */}
      <div style={{
        opacity: mapReady ? 1 : 0,
        transition: `opacity 600ms ${EASE}`,
        width: "100%",
        height: "100%",
        position: "absolute",
        inset: 0,
      }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={projConfig}
          style={{ width: "100%", height: "100%" }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) => geographies.map(geo => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#E8DCC8"
                fillOpacity={0.04}
                stroke="rgba(255,217,61,0.12)"
                strokeWidth={0.4}
                style={{ default: { outline: "none" }, hover: { outline: "none" }, pressed: { outline: "none" } }}
              />
            ))}
          </Geographies>

          {/* Route lines */}
          {routeVisible && phaseCoords.length > 1 && phaseCoords.map((p, i) => {
            if (i === phaseCoords.length - 1) return null;
            const faded = selectedId !== null && selectedId !== p.id && selectedId !== phaseCoords[i + 1].id;
            return (
              <Line
                key={`route-${i}`}
                from={p.coord}
                to={phaseCoords[i + 1].coord}
                stroke="rgba(255,217,61,0.35)"
                strokeWidth={1.5}
                strokeOpacity={faded ? 0.08 : 0.35}
                strokeDasharray="6,4"
                strokeLinecap="round"
                style={{
                  transition: `stroke-opacity 400ms ${EASE}`,
                  animation: `imRouteDash 6s linear infinite`,
                }}
              />
            );
          })}

          {/* Phase markers */}
          {dotsVisible && phaseCoords.map((phase, i) => {
            const isSelected = selectedId === phase.id;
            const isFaded = selectedId !== null && !isSelected;
            const color = phase.color || "#FFD93D";
            return (
              <Marker key={phase.id} coordinates={phase.coord}>
                {/* Outer glow */}
                <circle
                  r={isSelected ? outerSize * 1.5 : outerSize}
                  fill={color}
                  fillOpacity={isSelected ? 0.2 : 0.08}
                  style={{
                    transition: `all 400ms ${EASE}`,
                    opacity: isFaded ? 0.15 : 1,
                    animation: !isSelected && !isFaded ? `imDotPulse 3s ${EASE} infinite` : "none",
                  }}
                />
                {/* Inner dot — tap target */}
                <circle
                  r={dotSize}
                  fill={color}
                  fillOpacity={isFaded ? 0.2 : 1}
                  style={{
                    cursor: "pointer",
                    pointerEvents: "all",
                    transition: `all 400ms ${EASE}`,
                    animation: `imDotIn 300ms ${EASE} ${600 + i * 100}ms both`,
                  }}
                  onClick={() => handleDotClick(phase)}
                />
                {/* Label */}
                <g style={{
                  opacity: isFaded ? 0.15 : 1,
                  transition: `opacity 400ms ${EASE}`,
                  animation: `imLabelIn 300ms ${EASE} ${800 + i * 100}ms both`,
                }}>
                  <text
                    textAnchor="middle"
                    y={-(outerSize + 6)}
                    style={{
                      fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
                      fontSize: isMobile ? 11 : 13,
                      fill: "rgba(232,220,200,0.85)",
                      fontWeight: isSelected ? 700 : 400,
                      pointerEvents: "none",
                      transition: `all 300ms ${EASE}`,
                    }}
                  >
                    {phase.id} · {phase.name}
                  </text>
                </g>
              </Marker>
            );
          })}
        </ComposableMap>
      </div>

      {/* Loading skeleton */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: mapReady ? 0 : 1,
        transition: `opacity 600ms ${EASE}`,
        pointerEvents: "none",
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "rgba(255,217,61,0.4)",
          animation: "imDotPulse 1.5s ease-in-out infinite",
        }} />
      </div>

      {/* Back button when dot selected */}
      {selectedId !== null && (
        <button
          onClick={() => setSelectedId(null)}
          style={{
            position: "absolute",
            top: isMobile ? 12 : 16,
            left: isMobile ? 12 : 16,
            background: "rgba(0,4,12,0.8)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 8,
            color: "rgba(255,255,255,0.7)",
            fontSize: 13,
            fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
            padding: "8px 14px",
            cursor: "pointer",
            minHeight: 44,
            minWidth: 44,
            zIndex: 10,
            animation: `imLabelIn 300ms ${EASE} both`,
          }}
        >
          ← Back
        </button>
      )}

      {/* Phase count badge */}
      <div style={{
        position: "absolute",
        bottom: isMobile ? 12 : 16,
        right: isMobile ? 12 : 16,
        background: "rgba(0,4,12,0.8)",
        border: "1px solid rgba(255,217,61,0.2)",
        borderRadius: 8,
        padding: "6px 12px",
        fontSize: 11,
        fontFamily: "'Inter',system-ui,-apple-system,sans-serif",
        color: "rgba(255,217,61,0.7)",
        letterSpacing: 1.5,
        pointerEvents: "none",
      }}>
        {phaseCoords.length} PHASES · TAP A DOT
      </div>
    </div>
  );
});

export default IntelMap;
