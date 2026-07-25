export const LAYOUT_BREAKPOINTS = {
  mobile: 600,
  tablet: 1024,
  compact: 1280
} as const;

export type LayoutMode = 'desktop' | 'compact' | 'tablet' | 'mobile';
