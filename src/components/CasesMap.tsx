import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';
import { CaseRecord } from '../types';

interface CasesMapProps {
  cases: CaseRecord[];
  selectedCaseId?: string | null;
  onSelectCase?: (caseId: string) => void;
  onMapClickCoordinates?: (lat: number, lng: number) => void;
  heightClass?: string;
}

function getMarkerColor(c: CaseRecord): string {
  if (c.priority === 'critical' || c.offenceCategory === 'robbery' || c.offenceCategory === 'homicide') {
    return '#dc2626'; // rose/red
  }
  if (c.status === 'under_investigation' || c.priority === 'urgent') {
    return '#d97706'; // amber
  }
  if (c.status === 'bail_granted' || c.status === 'closed_withdrawn') {
    return '#059669'; // emerald
  }
  return '#0A2A66'; // GPS Navy
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const CasesMap: React.FC<CasesMapProps> = ({
  cases,
  selectedCaseId = null,
  onSelectCase,
  onMapClickCoordinates,
  heightClass = 'h-[380px] sm:h-[430px]',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map());
  const onSelectCaseRef = useRef(onSelectCase);
  const onMapClickRef = useRef(onMapClickCoordinates);

  onSelectCaseRef.current = onSelectCase;
  onMapClickRef.current = onMapClickCoordinates;

  const geoCases = cases.filter(
    c =>
      typeof c.latitude === 'number' &&
      Number.isFinite(c.latitude) &&
      typeof c.longitude === 'number' &&
      Number.isFinite(c.longitude)
  );

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [5.6037, -0.1870], // Accra, Ghana default center
      zoom: 7,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapRef.current = map;
    markersLayerRef.current = layerGroup;

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClickRef.current) {
        onMapClickRef.current(
          Number(e.latlng.lat.toFixed(6)),
          Number(e.latlng.lng.toFixed(6))
        );
      }
    });

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      markerMapRef.current.clear();
    };
  }, []);

  // Render / update markers when geoCases changes
  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    markerMapRef.current.clear();

    if (geoCases.length === 0) {
      map.setView([5.6037, -0.1870], 7);
      return;
    }

    const bounds = L.latLngBounds([]);

    geoCases.forEach(c => {
      const lat = c.latitude as number;
      const lng = c.longitude as number;
      const color = getMarkerColor(c);
      const isSelected = selectedCaseId === c.id;

      const icon = L.divIcon({
        className: 'gps-case-pin',
        html: `
          <div style="
            width: ${isSelected ? '32px' : '26px'};
            height: ${isSelected ? '32px' : '26px'};
            border-radius: 9999px;
            background: ${color};
            border: 3px solid ${isSelected ? '#C9A227' : '#ffffff'};
            box-shadow: 0 4px 10px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            font-family: monospace;
          ">•</div>
        `,
        iconSize: isSelected ? [32, 32] : [26, 26],
        iconAnchor: isSelected ? [16, 16] : [13, 13],
        popupAnchor: [0, -14],
      });

      const marker = L.marker([lat, lng], { icon });
      const suspectLabel =
        c.suspects.length > 0
          ? c.suspects.map(s => s.fullName).join(', ')
          : 'Unidentified';

      const popupContainer = document.createElement('div');
      popupContainer.style.minWidth = '210px';
      popupContainer.style.maxWidth = '260px';
      popupContainer.innerHTML = `
        <div style="font-family: system-ui, sans-serif; line-height: 1.4;">
          <div style="font-family: monospace; font-size: 11px; font-weight: 800; color: #0A2A66;">
            ${escapeHtml(c.docketNumber)}
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 2px 0 6px;">
            ${escapeHtml(c.offenceTitle)}
          </div>
          <div style="font-size: 11px; color: #334155; margin-bottom: 3px;">
            <strong>Victim:</strong> ${escapeHtml(c.complainant.fullName)}
          </div>
          <div style="font-size: 11px; color: #334155; margin-bottom: 3px;">
            <strong>Suspect:</strong> ${escapeHtml(suspectLabel)}
          </div>
          ${
            c.narrative
              ? `<div style="font-size: 11px; color: #475569; margin: 4px 0 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                  ${escapeHtml(c.narrative)}
                </div>`
              : ''
          }
          <div style="font-family: monospace; font-size: 10px; background: #eff6ff; color: #0A2A66; padding: 3px 6px; border-radius: 4px; border: 1px solid #bfdbfe; margin-bottom: 6px;">
            GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}
          </div>
        </div>
      `;

      if (onSelectCaseRef.current) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'Inspect Full Case →';
        btn.style.cssText =
          'width: 100%; background: #0A2A66; color: #fff; border: none; border-radius: 6px; padding: 6px 10px; font-size: 11px; font-weight: 700; cursor: pointer;';
        btn.onclick = () => {
          onSelectCaseRef.current?.(c.id);
        };
        popupContainer.appendChild(btn);
      }

      marker.bindPopup(popupContainer);
      marker.addTo(layer);
      markerMapRef.current.set(c.id, marker);
      bounds.extend([lat, lng]);
    });

    if (geoCases.length === 1) {
      map.setView([geoCases[0].latitude as number, geoCases[0].longitude as number], 13);
    } else if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 14 });
    }
  }, [cases, selectedCaseId]);

  // Fly to selected case and open its popup when selectedCaseId updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedCaseId) return;
    const marker = markerMapRef.current.get(selectedCaseId);
    const target = geoCases.find(c => c.id === selectedCaseId);
    if (marker && target && typeof target.latitude === 'number' && typeof target.longitude === 'number') {
      map.flyTo([target.latitude, target.longitude], Math.max(map.getZoom(), 14), {
        duration: 0.6,
      });
      marker.openPopup();
    }
  }, [selectedCaseId]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-[#0A2A66] text-white border-b-2 border-[#C9A227] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-[#C9A227]" />
          <div>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wide">
              Live GPS Case Map
            </h3>
            <p className="text-[11px] text-blue-200">
              {geoCases.length} of {cases.length} case{cases.length === 1 ? '' : 's'} plotted with GPS coordinates
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-[10px] font-semibold">
          <span className="flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0A2A66] border border-white mr-1" />
            Lodged
          </span>
          <span className="flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600 border border-white mr-1" />
            Investigating
          </span>
          <span className="flex items-center">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 border border-white mr-1" />
            Critical / Robbery
          </span>
          {onMapClickCoordinates && (
            <span className="hidden sm:flex items-center text-amber-300">
              <Navigation className="w-3 h-3 mr-1" />
              Click map to set GPS coords
            </span>
          )}
        </div>
      </div>

      <div className={`relative w-full ${heightClass}`}>
        <div ref={containerRef} className="w-full h-full z-0" />
        {geoCases.length === 0 && (
          <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 shadow">
            No cases with GPS coordinates yet. Add latitude &amp; longitude on a case to plot it on the map.
          </div>
        )}
      </div>
    </div>
  );
};
