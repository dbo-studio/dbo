import { alpha, styled } from '@mui/material';
import { variables } from '@/core/theme/variables';

/**
 * Re-skins sonner with the app theme. Sonner renders inside its parent, so selectors on its data
 * attributes reach every toast. Tones come from the palette, never from sonner's rich colors.
 */
export const ToasterRootStyled = styled('div')(({ theme }) => {
  const tone = (color: string): Record<string, unknown> => ({
    boxShadow: `inset 3px 0 0 ${color}, ${theme.shadows[8]}`,
    '[data-icon]': { color }
  });

  return {
    '[data-sonner-toast]': {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1.25),
      width: 'var(--width)',
      padding: theme.spacing(1.25, 1.5),
      paddingRight: theme.spacing(4.5),
      borderRadius: variables.radius.medium,
      border: `1px solid ${theme.palette.divider}`,
      background: theme.palette.background.paper,
      color: theme.palette.text.primary,
      boxShadow: `inset 3px 0 0 ${theme.palette.primary.main}, ${theme.shadows[8]}`,
      fontFamily: theme.typography.fontFamily,
      fontSize: variables.fontSize.lg
    },
    '[data-sonner-toast][data-type="success"]': tone(theme.palette.success.main),
    '[data-sonner-toast][data-type="error"]': tone(theme.palette.error.main),
    '[data-sonner-toast][data-type="warning"]': tone(theme.palette.warning.main),
    '[data-sonner-toast][data-type="info"]': tone(theme.palette.primary.main),
    '[data-sonner-toast] [data-icon]': { display: 'flex', flexShrink: 0, margin: 0 },
    '[data-sonner-toast] [data-content]': { display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 },
    '[data-sonner-toast] [data-title]': { color: theme.palette.textTitle, fontWeight: 500 },
    '[data-sonner-toast] [data-description]': { color: theme.palette.textSubdued, fontSize: variables.fontSize.md },
    '[data-sonner-toast] [data-button]': {
      height: 24,
      padding: theme.spacing(0, 1),
      border: 'none',
      borderRadius: variables.radius.small,
      background: 'transparent',
      color: theme.palette.primary.main,
      fontSize: variables.fontSize.md,
      cursor: 'pointer',
      '&:hover': { background: alpha(theme.palette.primary.main, 0.12) }
    },
    // Close sits inside the card, top right, instead of hanging off its corner.
    '[data-sonner-toast] [data-close-button]': {
      position: 'absolute',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
      cursor: 'pointer',
      top: theme.spacing(0.75),
      right: theme.spacing(0.75),
      left: 'auto',
      transform: 'none',
      width: 20,
      height: 20,
      border: 'none',
      borderRadius: variables.radius.small,
      background: 'transparent',
      color: theme.palette.text.secondary,
      '&:hover': { background: theme.palette.action.hover, color: theme.palette.text.primary }
    }
  };
});
