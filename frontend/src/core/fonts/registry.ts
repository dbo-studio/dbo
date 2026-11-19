import type { FontEntry, FontFaceSpec } from './types';

const ARABIC_FALLBACK = '"Vazirmatn"';
/** Arabic + Persian letters; with this range the face can lead the stack. */
const ARABIC_UNICODE_RANGE = 'U+0600-06FF, U+0750-077F, U+0870-08FF, U+FB50-FDFF, U+FE70-FEFF';

function appStack(cssFamily: string): string {
  return `${ARABIC_FALLBACK}, "${cssFamily}", sans-serif`;
}

function editorStack(cssFamily: string): string {
  return `${ARABIC_FALLBACK}, "${cssFamily}", monospace`;
}

function variableFaces(id: string): FontFaceSpec[] {
  return [{ weight: '100 900', path: `${id}/variable.woff2` }];
}

function staticFaces(id: string, weights: readonly string[]): FontFaceSpec[] {
  return weights.map((weight) => ({
    weight,
    path: `${id}/${weight}.woff2`
  }));
}

function appFont(
  id: string,
  label: string,
  cssFamily: string,
  mode: 'variable' | 'static' = 'variable',
  staticWeights: readonly string[] = ['400', '500', '700']
): FontEntry {
  return {
    id,
    label,
    cssFamily,
    stack: appStack(cssFamily),
    faces: mode === 'variable' ? variableFaces(id) : staticFaces(id, staticWeights)
  };
}

function editorFont(
  id: string,
  label: string,
  cssFamily: string,
  mode: 'variable' | 'static' = 'variable',
  staticWeights: readonly string[] = ['400', '700']
): FontEntry {
  return {
    id,
    label,
    cssFamily,
    stack: editorStack(cssFamily),
    faces: mode === 'variable' ? variableFaces(id) : staticFaces(id, staticWeights)
  };
}

export const SYSTEM_UI_FONT: FontEntry = {
  id: 'system-ui',
  label: 'System UI',
  cssFamily: 'system-ui',
  stack: `${ARABIC_FALLBACK}, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
};

export const ARABIC_FALLBACK_FONT: FontEntry = {
  id: 'vazirmatn',
  label: 'Vazirmatn',
  cssFamily: 'Vazirmatn',
  stack: `"Vazirmatn", sans-serif`,
  faces: [
    {
      weight: '100 900',
      path: 'vazirmatn/variable.woff2',
      unicodeRange: ARABIC_UNICODE_RANGE
    }
  ]
};

/** Curated core UI fonts — keep this list intentional and small. */
export const APP_FONTS: FontEntry[] = [
  SYSTEM_UI_FONT,
  appFont('roboto', 'Roboto', 'Roboto'),
  appFont('inter', 'Inter', 'Inter'),
  appFont('geist-sans', 'Geist Sans', 'Geist Sans', 'static'),
  appFont('ibm-plex-sans', 'IBM Plex Sans', 'IBM Plex Sans'),
  appFont('source-sans-3', 'Source Sans 3', 'Source Sans 3'),
  appFont('noto-sans', 'Noto Sans', 'Noto Sans'),
  appFont('open-sans', 'Open Sans', 'Open Sans'),
  appFont('dm-sans', 'DM Sans', 'DM Sans'),
  appFont('manrope', 'Manrope', 'Manrope'),
  appFont('space-grotesk', 'Space Grotesk', 'Space Grotesk')
];

/** Curated core editor fonts. */
export const EDITOR_FONTS: FontEntry[] = [
  editorFont('jetbrains-mono', 'JetBrains Mono', 'JetBrains Mono'),
  editorFont('cascadia-code', 'Cascadia Code', 'Cascadia Code', 'static'),
  editorFont('fira-code', 'Fira Code', 'Fira Code'),
  editorFont('ibm-plex-mono', 'IBM Plex Mono', 'IBM Plex Mono', 'static'),
  editorFont('source-code-pro', 'Source Code Pro', 'Source Code Pro'),
  editorFont('geist-mono', 'Geist Mono', 'Geist Mono'),
  editorFont('roboto-mono', 'Roboto Mono', 'Roboto Mono'),
  editorFont('hack', 'Hack', 'Hack', 'static'),
  editorFont('inconsolata', 'Inconsolata', 'Inconsolata'),
  editorFont('commit-mono', 'Commit Mono', 'Commit Mono', 'static')
];

export const DEFAULT_APP_FONT_ID = 'inter';
export const DEFAULT_EDITOR_FONT_ID = 'jetbrains-mono';

/** Font folders that should be precached for offline defaults (system-ui has no bundled faces). */
export const PRECACHE_FONT_IDS = [DEFAULT_APP_FONT_ID, DEFAULT_EDITOR_FONT_ID, ARABIC_FALLBACK_FONT.id] as const;

const allById = new Map<string, FontEntry>(
  [...APP_FONTS, ...EDITOR_FONTS, ARABIC_FALLBACK_FONT].map((font) => [font.id, font])
);

export function getFontEntry(id: string): FontEntry | undefined {
  return allById.get(id);
}

export function getAppFontFamily(id: string): string {
  const resolved = id === 'menlo' ? DEFAULT_APP_FONT_ID : id;
  return getFontEntry(resolved)?.stack ?? getFontEntry(DEFAULT_APP_FONT_ID)!.stack;
}

export function getEditorFontFamily(id: string): string {
  return getFontEntry(id)?.stack ?? getFontEntry(DEFAULT_EDITOR_FONT_ID)!.stack;
}

export const APP_FONT_OPTIONS = APP_FONTS.map((font) => ({
  value: font.id,
  label: font.label,
  fontFamily: font.stack
}));

export const EDITOR_FONT_OPTIONS = EDITOR_FONTS.map((font) => ({
  value: font.id,
  label: font.label,
  fontFamily: font.stack
}));
