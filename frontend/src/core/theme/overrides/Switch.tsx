import type { Components, Theme } from '@mui/material/styles';

export default function Switch(theme: Theme): Components {
  return {
    MuiSwitch: {
      styleOverrides: {
        track: {
          opacity: 1,
          backgroundColor: theme.palette.background.paper
        }
      }
    }
  };
}
