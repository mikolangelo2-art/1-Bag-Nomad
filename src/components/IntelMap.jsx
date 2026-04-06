import { useState, useEffect, useRef, useMemo, memo, useCallback } from "react";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import CITY_COORDS from '../constants/cityCoords';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const EASE = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";

const CATEGORY_COLORS = {
  'DIVE': '#00E5FF',
  'CULTURE': '#FF9F43',
  'NATURE': '#69F0AE',
  'ADVENTURE': '#FF6B6B',
  'WELLNESS': '#C678DD',
  'EXPLORATION': '#FFD93D',
  'MARINE': '#00E5FF',
  'TRANSIT': '#A29BFE',
};

const INTEL_CSS = `
@keyframes imDotPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
@keyframes imLabelIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.intel-marker { transition: opacity 400ms ${EASE}, transform 400ms ${EASE}; }
`;

function resolveCoord(phase) {
  return CITY_COORDS[phase.name] || CITY_COORDS[phase.country] || null;
}

const IntelMap = memo(function IntelMap({ tripData, isMobile, onSelectPhase }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const phases = tripData?.phases || [];

  const phaseCoords = useMemo(() =>
    phases.map(p => ({ ...p, coord: resolveCoord(p) })).filter(p => p.coord),
    [phases]
  );

  // Fade other markers when one is selected
  const updateMarkerOpacity = useCallback((activeId) => {
    markersRef.current.forEach(({ el, id }) => {
      const faded = activeId !== null && id !== activeId;
      el.style.opacity = faded ? "0.15" : "1";
    });
    const map = mapRef.current;
    if (map && map.getLayer('route')) {
      map.setPaintProperty('route', 'line-opacity', activeId !== null ? 0.08 : 0.5);
    }
  }, []);

  // Init Mapbox
  useEffect(() => {
    if (!mapContainerRef.current || mapFailed) return;
    let map;
    try {
      map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        projection: 'mercator',
        attributionControl: false,
        fadeDuration: 0,
        center: [10, 15],
        zoom: 2.2,
      });
      mapRef.current = map;
    } catch (e) {
      setMapFailed(true);
      return;
    }

    map.once('idle', () => {
      map.dragRotate.disable();
      map.boxZoom.disable();
      map.keyboard.disable();

      map.resize();

      setTimeout(() => {
        const allPhases = tripData?.phases || [];
        const resolved = allPhases.map(p => ({ ...p, coord: resolveCoord(p) })).filter(p => p.coord);
        const coords = resolved.map(p => p.coord);

        // Auto-frame to trip region
        if (coords.length >= 2) {
          const bounds = new mapboxgl.LngLatBounds();
          coords.forEach(c => bounds.extend(c));
          map.fitBounds(bounds, {
            padding: { top: 80, bottom: 80, left: 80, right: 80 },
            maxZoom: 4,
            duration: 1200,
            essential: true,
          });
        } else if (coords.length === 1) {
          map.flyTo({ center: coords[0], zoom: 4, duration: 1200, essential: true });
        } else {
          map.flyTo({ center: [10, 15], zoom: 2.2, duration: 1200, essential: true });
        }

        // Route line — GeoJSON
        if (coords.length > 1) {
          map.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: coords,
              }
            }
          });
          map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            paint: {
              'line-color': '#FFD93D',
              'line-width': 2,
              'line-opacity': 0.8,
              'line-dasharray': [2, 3],
            }
          });
        }

        // City dot markers — category colored, with labels
        resolved.forEach((phase, i) => {
          const dotColor = CATEGORY_COLORS[phase.type?.toUpperCase()] || '#FFD93D';
          console.log(`Phase ${i}: ${phase.name} → coord:`, phase.coord);

          const el = document.createElement('div');
          el.className = 'intel-marker';
          el.style.cssText = `display:flex;flex-direction:column;align-items:center;cursor:pointer;gap:4px;opacity:0;`;

          const dot = document.createElement('div');
          dot.style.cssText = `width:${isMobile ? 20 : 14}px;height:${isMobile ? 20 : 14}px;border-radius:50%;background:${dotColor};border:2px solid rgba(255,255,255,0.9);box-shadow:0 0 8px ${dotColor},0 0 16px ${dotColor}40;flex-shrink:0;`;

          const label = document.createElement('div');
          label.textContent = phase.name;
          label.style.cssText = `color:#FFF;font-family:Inter,sans-serif;font-size:11px;font-weight:600;white-space:nowrap;background:rgba(169,70,29,1);padding:2px 6px;border-radius:4px;pointer-events:none;letter-spacing:0.3px;`;

          el.appendChild(dot);
          el.appendChild(label);

          setTimeout(() => { el.style.opacity = "1"; }, 600 + i * 100);

          el.addEventListener('click', () => {
            const newId = selectedIdRef.current === phase.id ? null : phase.id;
            selectedIdRef.current = newId;
            setSelectedId(newId);
            updateMarkerOpacity(newId);
            if (newId !== null && onSelectPhase) onSelectPhase(phase);
          });

          const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
            .setLngLat(phase.coord)
            .addTo(map);
          markersRef.current.push({ marker, el, id: phase.id });
        });

        setMapReady(true);
      }, 300);
    });

    map.on('error', () => {
      setMapFailed(true);
    });

    return () => {
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];
      map?.remove();
      mapRef.current = null;
    };
  }, [tripData, isMobile, mapFailed, updateMarkerOpacity, onSelectPhase]);

  const selectedIdRef = useRef(selectedId);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  // Dispatch intelMapActive event for header animation
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('intelMapActive', { detail: { active: true } }));
    return () => window.dispatchEvent(new CustomEvent('intelMapActive', { detail: { active: false } }));
  }, []);

  const handleBack = () => {
    setSelectedId(null);
    selectedIdRef.current = null;
    updateMarkerOpacity(null);
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 40,
      width: "100vw",
      height: "100vh",
    }}>
      <style>{INTEL_CSS}</style>

      {/* Mapbox container — full viewport */}
      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: "100%",
          opacity: mapReady ? 1 : 0,
          transition: `opacity 600ms ${EASE}`,
        }}
      />

      {/* Loading skeleton — cross-fades out */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        height: "100%",
        paddingBottom: isMobile ? "80px" : "0px",
        background: "rgba(0,4,12,0.95)",
        opacity: mapReady ? 0 : 1,
        transition: `opacity 600ms ${EASE}`,
        pointerEvents: mapReady ? "none" : "auto",
        zIndex: 45,
      }}>
        <div style={{
          fontSize: 90,
          animation: "spinGlobe 20s linear infinite",
          filter: "drop-shadow(0 0 20px rgba(0,229,255,0.4))",
        }}>🌍</div>
        <div style={{
          fontFamily: "'Fraunces',serif",
          fontSize: 18,
          fontWeight: 300,
          fontStyle: "italic",
          color: "rgba(255,159,67,0.65)",
          letterSpacing: 1.5,
          textAlign: "center",
        }}>Click destination for local information</div>
      </div>

      {/* Fallback if Mapbox fails */}
      {mapFailed && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,4,12,0.95)",
        }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "'Inter',system-ui,-apple-system,sans-serif" }}>
            Map unavailable — tap phases below
          </div>
        </div>
      )}

      {/* Back button when dot selected */}
      {selectedId !== null && (
        <button
          onClick={handleBack}
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
            zIndex: 50,
            animation: `imLabelIn 300ms ${EASE} both`,
          }}
        >
          ← Back
        </button>
      )}

      {/* Phase count badge */}
      <div style={{
        position: "absolute",
        bottom: isMobile ? 72 : 16,
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
        zIndex: 50,
      }}>
        {phaseCoords.length} PHASES · TAP A DOT
      </div>
    </div>
  );
});

export default IntelMap;
