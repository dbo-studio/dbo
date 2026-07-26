import { ARABIC_FALLBACK_FONT, DEFAULT_APP_FONT_ID, DEFAULT_EDITOR_FONT_ID, getFontEntry } from './registry';
import type { FontFaceSpec } from './types';

const loadCache = new Map<string, Promise<void>>();

function fontUrl(path: string): string {
  const base = import.meta.env.BASE_URL ?? '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}fonts/${path}`;
}

function isVariableWeight(weight: string): boolean {
  return weight.includes(' ');
}

async function loadFace(cssFamily: string, face: FontFaceSpec): Promise<void> {
  const fontFace = new FontFace(cssFamily, `url(${fontUrl(face.path)})`, {
    weight: face.weight,
    style: face.style ?? 'normal',
    display: 'swap'
  });
  const loaded = await fontFace.load();
  document.fonts.add(loaded);
}

/**
 * Load faces progressively: primary (400 or variable) first, then remaining weights.
 */
async function loadFaces(id: string): Promise<void> {
  const entry = getFontEntry(id);
  if (!entry?.faces?.length) {
    return;
  }

  if (typeof document === 'undefined' || typeof FontFace === 'undefined') {
    return;
  }

  const faces = entry.faces;
  const primary = faces.find((face) => isVariableWeight(face.weight) || face.weight === '400') ?? faces[0];
  const rest = faces.filter((face) => face !== primary);

  await loadFace(entry.cssFamily, primary);

  if (rest.length > 0) {
    await Promise.all(rest.map((face) => loadFace(entry.cssFamily, face)));
  }
}

/** Load and register a font by registry id (cached). Rejects if loading fails. */
export function ensureFont(id: string): Promise<void> {
  const entry = getFontEntry(id);
  if (!entry || !entry.faces?.length) {
    return Promise.resolve();
  }

  const cached = loadCache.get(id);
  if (cached) {
    return cached;
  }

  const promise = loadFaces(id).catch((error: unknown) => {
    loadCache.delete(id);
    throw error;
  });
  loadCache.set(id, promise);
  return promise;
}

/** Prefetch several fonts without failing the caller if one errors. */
export function prefetchFonts(ids: string[]): void {
  for (const id of ids) {
    void ensureFont(id).catch(() => {
      // Prefetch is best-effort.
    });
  }
}

export function ensureArabicFallback(): Promise<void> {
  return ensureFont(ARABIC_FALLBACK_FONT.id);
}

export function ensureDefaultFonts(): Promise<void> {
  return Promise.all([
    ensureFont(DEFAULT_APP_FONT_ID).catch((error: unknown) => {
      console.warn('[fonts] failed to load default app font', error);
    }),
    ensureFont(DEFAULT_EDITOR_FONT_ID).catch((error: unknown) => {
      console.warn('[fonts] failed to load default editor font', error);
    }),
    ensureArabicFallback().catch((error: unknown) => {
      console.warn('[fonts] failed to load Arabic fallback', error);
    })
  ]).then(() => undefined);
}
