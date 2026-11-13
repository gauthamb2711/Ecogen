import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapPinItem {
  id: string;
  kind: 'campaign' | 'report';
  title: string;
  subtitle: string;
  status: string;
  lat: number;
  lng: number;
  verified: boolean;
}

interface RealImpactMapProps {
  pins: MapPinItem[];
  selectedPinId: string | null;
  onSelectPin: (id: string) => void;
  draftReportCoords: { lat: number; lng: number } | null;
  onPickReportCoords: (lat: number, lng: number) => void;
  focusCoords?: { lat: number; lng: number } | null;
}

type MapBasemap = 'street' | 'satellite';

const BASEMAPS: Record<MapBasemap, { url: string; attribution: string; maxZoom: number }> = {
  street: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
  },
};

export function RealImpactMap({
  pins,
  selectedPinId,
  onSelectPin,
  draftReportCoords,
  onPickReportCoords,
  focusCoords,
}: RealImpactMapProps) {
  const [basemap, setBasemap] = useState<MapBasemap>('street');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const draftMarkerRef = useRef<L.CircleMarker | null>(null);
  const hasFittedInitialRef = useRef(false);

  const onSelectPinRef = useRef(onSelectPin);
  onSelectPinRef.current = onSelectPin;

  const onPickCoordsRef = useRef(onPickReportCoords);
  onPickCoordsRef.current = onPickReportCoords;

  // Initialize Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [22, 12],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
    });

    const initialCfg = BASEMAPS.street;
    const tileLayer = L.tileLayer(initialCfg.url, {
      attribution: initialCfg.attribution,
      maxZoom: initialCfg.maxZoom,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = Number(e.latlng.lat.toFixed(4));
      const lng = Number(e.latlng.lng.toFixed(4));
      onPickCoordsRef.current(lat, lng);
    });

    mapRef.current = map;

    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      markersLayerRef.current = null;
      draftMarkerRef.current = null;
      hasFittedInitialRef.current = false;
    };
  }, []);

  // Switch Street / Satellite tile layers cleanly
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }
    const cfg = BASEMAPS[basemap];
    tileLayerRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(map);
    tileLayerRef.current.bringToBack();
  }, [basemap]);

  // Sync campaign & issue pins
  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const boundsCoords: [number, number][] = [];

    pins.forEach((pin) => {
      if (!Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) return;
      boundsCoords.push([pin.lat, pin.lng]);

      const isSelected = pin.id === selectedPinId;
      const isCampaign = pin.kind === 'campaign';

      const marker = L.circleMarker([pin.lat, pin.lng], {
        radius: isSelected ? 10 : 7,
        color: '#0F2E1E',
        weight: isSelected ? 3 : 2,
        fillColor: isCampaign ? '#A3E635' : '#F59E0B',
        fillOpacity: 0.95,
      });

      const badgeLabel = isCampaign ? 'Community Campaign' : 'Issue Report';
      const statusText = pin.status.replace('_', ' ');

      const popupEl = document.createElement('div');
      popupEl.className = 'text-xs space-y-1 max-w-[220px]';

      const metaDiv = document.createElement('div');
      metaDiv.style.color = '#4B5E53';
      metaDiv.textContent = `${badgeLabel} · ${statusText}`;

      const titleDiv = document.createElement('div');
      titleDiv.style.fontWeight = '700';
      titleDiv.style.color = '#0F2E1E';
      titleDiv.textContent = pin.title;

      const subDiv = document.createElement('div');
      subDiv.style.color = '#394B40';
      subDiv.textContent = pin.subtitle;

      popupEl.appendChild(metaDiv);
      popupEl.appendChild(titleDiv);
      popupEl.appendChild(subDiv);

      marker.bindPopup(popupEl);
      marker.on('click', (ev) => {
        L.DomEvent.stopPropagation(ev);
        onSelectPinRef.current(pin.id);
        marker.openPopup();
      });

      marker.addTo(layer);
    });

    if (!hasFittedInitialRef.current && boundsCoords.length > 0) {
      map.fitBounds(L.latLngBounds(boundsCoords), { padding: [36, 36], maxZoom: 6 });
      hasFittedInitialRef.current = true;
    }
  }, [pins, selectedPinId]);

  // Sync draft report coordinate marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (draftMarkerRef.current) {
      draftMarkerRef.current.remove();
      draftMarkerRef.current = null;
    }

    if (
      draftReportCoords &&
      Number.isFinite(draftReportCoords.lat) &&
      Number.isFinite(draftReportCoords.lng)
    ) {
      const marker = L.circleMarker([draftReportCoords.lat, draftReportCoords.lng], {
        radius: 9,
        color: '#991B1B',
        weight: 2.5,
        dashArray: '4 2',
        fillColor: '#EF4444',
        fillOpacity: 0.75,
      }).addTo(map);
      marker.bindTooltip('New Report Location', { direction: 'top' });
      draftMarkerRef.current = marker;
    }
  }, [draftReportCoords]);

  // Pan/zoom when focusCoords changes (e.g. from location preset or GPS button)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusCoords) return;
    if (Number.isFinite(focusCoords.lat) && Number.isFinite(focusCoords.lng)) {
      map.setView([focusCoords.lat, focusCoords.lng], Math.max(map.getZoom(), 9), {
        animate: true,
      });
    }
  }, [focusCoords]);

  const handleFitAll = () => {
    const map = mapRef.current;
    if (!map || pins.length === 0) return;
    const coords = pins
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .map((p) => [p.lat, p.lng] as [number, number]);
    if (coords.length > 0) {
      map.fitBounds(L.latLngBounds(coords), { padding: [36, 36], maxZoom: 6 });
    }
  };

  return (
    <div className="relative">
      <div
        ref={containerRef}
        data-testid="real-impact-map"
        aria-label="Interactive real-world environmental impact map"
        className="w-full h-[420px] rounded-xl overflow-hidden border border-[#DDE3DD] bg-[#EAECE7] z-0"
      />
      <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5">
        <div className="flex bg-white/95 rounded-lg border border-[#DDE3DD] p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => setBasemap('street')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
              basemap === 'street' ? 'bg-[#0F2E1E] text-white' : 'text-[#394B40]'
            }`}
          >
            Street
          </button>
          <button
            type="button"
            onClick={() => setBasemap('satellite')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
              basemap === 'satellite' ? 'bg-[#0F2E1E] text-white' : 'text-[#394B40]'
            }`}
          >
            Satellite
          </button>
        </div>
        <button
          type="button"
          onClick={handleFitAll}
          className="px-3 py-1.5 bg-white/95 hover:bg-white text-[#0F2E1E] text-xs font-semibold rounded-lg border border-[#DDE3DD] shadow-sm cursor-pointer"
        >
          Fit All Pins
        </button>
      </div>
    </div>
  );
}
