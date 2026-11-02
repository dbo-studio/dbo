import { alpha, type Components, type Theme } from '@mui/material/styles';
import { variables } from '../variables';

const COLORS = ['primary', 'secondary', 'success', 'warning', 'error', 'info'] as const;

// Badges are soft: a tinted background and a matching text colour, no hard outline.
export default function Chip(theme: Theme): Components {
  const text = (color: (typeof COLORS)[number]): string =>
    theme.palette.mode === 'dark' ? theme.palette[color].light : theme.palette[color].dark;

  return {
    MuiChip: {
      styleOverrides: {
        root: {
          height: 20,
          borderRadius: 6,
          fontSize: variables.fontSize.xs,
          fontWeight: 500,
          letterSpacing: '0.01em',
          '& .MuiChip-label': { paddingLeft: 7, paddingRight: 7 },
          '& .MuiChip-icon': { marginLeft: 5, marginRight: -2 }
        },
        sizeSmall: { height: 20 }
      },
      variants: [
        {
          props: { variant: 'filled', color: 'default' },
          style: { backgroundColor: theme.palette.action.hover, color: theme.palette.text.secondary }
        },
        {
          props: { variant: 'outlined', color: 'default' },
          style: { borderColor: theme.palette.divider, color: theme.palette.text.secondary }
        },
        ...COLORS.flatMap((color) => [
          {
            props: { variant: 'filled' as const, color },
            style: { backgroundColor: alpha(theme.palette[color].main, 0.14), color: text(color) }
          },
          {
            props: { variant: 'outlined' as const, color },
            style: { borderColor: alpha(theme.palette[color].main, 0.45), color: text(color) }
          }
        ])
      ]
    }
  };
}
