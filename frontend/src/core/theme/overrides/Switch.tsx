import { alpha } from '@mui/material/styles';
import type { Components, Theme } from '@mui/material/styles';

export default function Switch(theme: Theme): Components {
  return {
    MuiSwitch: {
      styleOverrides: {
        track: {
          opacity: 1,
          backgroundColor: alpha(theme.palette.text.secondary, 0.35)
        }
      }
    }
  };
}
