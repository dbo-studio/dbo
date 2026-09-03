import { Box, Typography, useTheme } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { type JSX, useEffect, useMemo, useRef, useState } from 'react';
import { boundsFromGeometry, parseWkt } from '@/core/utils/wkt';
import locales from '@/locales';

type GeometryMapProps = {
  wkt: string;
  height?: number | string;
};

/** Lucide MapPin as a Leaflet DivIcon (matches app icon set). */
function createMapPinIcon(color: string): L.DivIcon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      style="filter: drop-shadow(0 1px 2px rgba(0,0,0,.35));">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  `.trim();

  return L.divIcon({
    className: 'dbo-map-pin',
    html: svg,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
}

function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const onOnline = (): void => setOnline(true);
    const onOffline = (): void => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return (): void => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return online;
}

export default function GeometryMap({ wkt, height = '100%' }: GeometryMapProps): JSX.Element {
  const theme = useTheme();
  const pinColor = theme.palette.primary.main;
  const pinIcon = useMemo(() => createMapPinIcon(pinColor), [pinColor]);
  const online = useOnlineStatus();

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.Layer | null>(null);
  const [debouncedWkt, setDebouncedWkt] = useState(wkt);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedWkt(wkt), 300);
    return (): void => window.clearTimeout(timer);
  }, [wkt]);

  const parsed = parseWkt(debouncedWkt);
  const canDraw = online && parsed !== null && parsed.type !== 'unsupported';

  useEffect(() => {
    if (!online) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerRef.current = null;
      }
      return;
    }

    if (!containerRef.current) {
      return;
    }

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    const geometry = parseWkt(debouncedWkt);
    if (!geometry || geometry.type === 'unsupported') {
      requestAnimationFrame(() => {
        map.invalidateSize();
      });
      return;
    }

    if (geometry.type === 'Point') {
      layerRef.current = L.marker([geometry.coordinates.lat, geometry.coordinates.lng], {
        icon: pinIcon
      }).addTo(map);
    } else if (geometry.type === 'LineString') {
      layerRef.current = L.polyline(
        geometry.coordinates.map((c) => [c.lat, c.lng] as [number, number]),
        {
          color: pinColor
        }
      ).addTo(map);
    } else if (geometry.type === 'Polygon') {
      layerRef.current = L.polygon(
        geometry.coordinates.map((ring) => ring.map((c) => [c.lat, c.lng] as [number, number])),
        { color: pinColor }
      ).addTo(map);
    }

    const points = boundsFromGeometry(geometry);
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 12);
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), { padding: [24, 24] });
    }

    requestAnimationFrame(() => {
      map.invalidateSize();
    });
  }, [debouncedWkt, pinIcon, pinColor, online]);

  useEffect(() => {
    return (): void => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerRef.current = null;
      }
    };
  }, []);

  const fallbackMessage = !online
    ? locales.map_unavailable_offline
    : debouncedWkt.trim()
      ? locales.could_not_render_wkt
      : locales.enter_wkt_to_preview;

  return (
    <Box sx={{ position: 'relative', height, minHeight: 180, width: '100%' }}>
      {online && (
        <Box
          ref={containerRef}
          data-testid='value-panel-geometry-map'
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: 1,
            overflow: 'hidden',
            border: 1,
            borderColor: 'divider',
            zIndex: 0,
            '& .dbo-map-pin': {
              background: 'transparent',
              border: 'none'
            }
          }}
        />
      )}
      {!canDraw && (
        <Box
          data-testid='value-panel-geometry-map-fallback'
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 1,
            border: 1,
            borderColor: 'divider',
            backgroundColor: 'background.default',
            p: 2
          }}
        >
          <Typography variant='body2' color='text.secondary'>
            {fallbackMessage}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
