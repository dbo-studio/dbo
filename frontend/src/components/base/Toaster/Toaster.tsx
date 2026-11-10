import { variables } from '@/core/theme/variables';
import { useTheme } from '@mui/material';
import type { JSX } from 'react';
import { Toaster as Sonner } from 'sonner';

/** App-wide toaster: neutral surface from the MUI theme, status shown by a thin accent bar + icon only. */
export default function Toaster(): JSX.Element {
  const theme = useTheme();
  const { palette } = theme;

  return (
    <Sonner
      position='bottom-right'
      duration={4000}
      closeButton
      theme={palette.mode}
      gap={8}
      style={
        {
          '--normal-bg': palette.background.default,
          '--normal-text': palette.text.text,
          '--normal-border': palette.divider,
          '--border-radius': variables.radius.large,
          '--success-bg': palette.background.default,
          '--success-text': palette.text.text,
          '--success-border': palette.divider,
          '--error-bg': palette.background.default,
          '--error-text': palette.text.text,
          '--error-border': palette.divider,
          '--warning-bg': palette.background.default,
          '--warning-text': palette.text.text,
          '--warning-border': palette.divider,
          '--info-bg': palette.background.default,
          '--info-text': palette.text.text,
          '--info-border': palette.divider,
          fontFamily: theme.typography.fontFamily
        } as React.CSSProperties
      }
      toastOptions={{
        style: {
          fontSize: theme.typography.body2.fontSize,
          boxShadow: variables.shadow.popover,
          padding: '10px 12px'
        }
      }}
    />
  );
}
