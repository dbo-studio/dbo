/** Minimal WKT parsing for Quick Look map rendering (POINT / LINESTRING / POLYGON). */

export type LatLng = { lat: number; lng: number };

export type ParsedGeometry =
  | { type: 'Point'; coordinates: LatLng }
  | { type: 'LineString'; coordinates: LatLng[] }
  | { type: 'Polygon'; coordinates: LatLng[][] }
  | { type: 'unsupported'; raw: string };

const stripSrid = (wkt: string): string => wkt.replace(/^srid=\d+\s*;\s*/i, '').trim();

const parseCoordPair = (raw: string): LatLng | null => {
  const parts = raw.trim().split(/\s+/);
  if (parts.length < 2) {
    return null;
  }
  const lng = Number(parts[0]);
  const lat = Number(parts[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null;
  }
  return { lat, lng };
};

const parseCoordList = (raw: string): LatLng[] => {
  return raw
    .split(',')
    .map((part) => parseCoordPair(part))
    .filter((c): c is LatLng => c !== null);
};

export const parseWkt = (value: string): ParsedGeometry | null => {
  const trimmed = stripSrid(value.trim());
  if (!trimmed) {
    return null;
  }

  const point = trimmed.match(/^POINT\s*\(\s*([^)]+)\s*\)$/i);
  if (point?.[1]) {
    const coord = parseCoordPair(point[1]);
    return coord ? { type: 'Point', coordinates: coord } : { type: 'unsupported', raw: trimmed };
  }

  const line = trimmed.match(/^LINESTRING\s*\(\s*([^)]+)\s*\)$/i);
  if (line?.[1]) {
    const coords = parseCoordList(line[1]);
    return coords.length >= 2 ? { type: 'LineString', coordinates: coords } : { type: 'unsupported', raw: trimmed };
  }

  const polygon = trimmed.match(/^POLYGON\s*\(\s*\(\s*([^)]+)\s*\)\s*\)$/i);
  if (polygon?.[1]) {
    const ring = parseCoordList(polygon[1]);
    return ring.length >= 3 ? { type: 'Polygon', coordinates: [ring] } : { type: 'unsupported', raw: trimmed };
  }

  // Postgres native point leftover
  const paren = trimmed.match(/^\(\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*\)$/);
  if (paren) {
    const lng = Number(paren[1]);
    const lat = Number(paren[2]);
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      return { type: 'Point', coordinates: { lat, lng } };
    }
  }

  return { type: 'unsupported', raw: trimmed };
};

export const boundsFromGeometry = (geometry: ParsedGeometry): LatLng[] => {
  if (geometry.type === 'Point') {
    return [geometry.coordinates];
  }
  if (geometry.type === 'LineString') {
    return geometry.coordinates;
  }
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.flat();
  }
  return [];
};
