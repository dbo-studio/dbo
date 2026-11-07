import type { CSSObject } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';

/**
 * The only place the mobile look is defined. Mobile styles must read these tokens and helpers,
 * never a literal radius, shadow or tint, so every surface stays in step.
 * Controls (buttons, inputs) are deliberately absent: they keep the desktop radius.
 */
export const mobileRadius = {
  /** Icon chips, small inner elements. */
  chip: 12,
  /** Cards, rows, trays. */
  card: 16,
  /** Sheets, dialogs, the floating tab bar. */
  sheet: 28
} as const;

const GLASS_BLUR = 'blur(24px) saturate(160%)';

export const mobileElevation = (theme: Theme, level: 'sm' | 'md' | 'lg'): string => {
  const black = theme.palette.common.black;
  return {
    sm: `0 2px 10px ${alpha(black, 0.08)}`,
    md: `0 6px 20px ${alpha(black, 0.16)}`,
    lg: `0 12px 40px ${alpha(black, 0.3)}`
  }[level];
};

/** Neutral tinted card (rows, trays). Not `background.subdued`: that token is bluish and vanishes on white. */
export const cardSurface = (theme: Theme): CSSObject => ({
  borderRadius: mobileRadius.card,
  backgroundColor: alpha(theme.palette.text.title, 0.05)
});

/** Pressed state for a tappable `cardSurface`. */
export const cardPressed = (theme: Theme): CSSObject => ({ backgroundColor: alpha(theme.palette.text.title, 0.1) });

/** White card lifted off a tinted background. */
export const raisedSurface = (theme: Theme): CSSObject => ({
  borderRadius: mobileRadius.card,
  backgroundColor: theme.palette.background.default,
  boxShadow: mobileElevation(theme, 'sm')
});

/** Opaque floating sheet: translucent sheets over the dimmed backdrop turn muddy grey. */
export const sheetSurface = (theme: Theme): CSSObject => ({
  backgroundColor: theme.palette.background.default,
  backgroundImage: 'none',
  borderRadius: mobileRadius.sheet,
  boxShadow: mobileElevation(theme, 'lg')
});

/** Sheet docked to the bottom edge (dialogs): only the top corners are rounded. */
export const dockedSheetShape: CSSObject = { borderRadius: `${mobileRadius.sheet}px ${mobileRadius.sheet}px 0 0` };

/** Frosted translucent surface for the floating header and tab bar. */
export const glassSurface = (theme: Theme): CSSObject => ({
  backgroundColor: alpha(theme.palette.background.paper, 0.72),
  backdropFilter: GLASS_BLUR,
  WebkitBackdropFilter: GLASS_BLUR
});

/** Tinted square behind a leading icon. */
export const iconChip = (theme: Theme, tone: 'primary' | 'error' = 'primary'): CSSObject => ({
  display: 'flex',
  flexShrink: 0,
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  borderRadius: mobileRadius.chip,
  backgroundColor: alpha(theme.palette[tone].main, 0.12),
  // lucide icons set their own inline color
  '& svg': { color: `${tone === 'primary' ? theme.palette.text.link : theme.palette.error.main} !important` }
});

/** Selected tappable surface: tinted fill plus a ring. */
export const selectedSurface = (theme: Theme): CSSObject => ({
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  boxShadow: `inset 0 0 0 1.5px ${alpha(theme.palette.primary.main, 0.55)}`
});

/** Segmented-control selected chip. */
export const segmentSelected = (theme: Theme): CSSObject => ({
  backgroundColor: theme.palette.background.paper,
  boxShadow: mobileElevation(theme, 'sm')
});
