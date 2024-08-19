import { Components, Theme } from '@mui/material/styles';

export default function Baseline(theme: Theme): Components {
  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          position: 'fixed',
          right: 0,
          left: 0,
          top: 0,
          bottom: 0
        },
        '::-webkit-scrollbar': {
          '-webkit-appearance': 'none',
          width: '7px',
          height: '7px'
        },

        '::-webkit-scrollbar-track': {
          background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          borderRadius: '6px'
        },

        '::-webkit-scrollbar-thumb': {
          '-webkit-box-shadow': '0 0 1px rgba(255,255,255,.5)',
          backgroundColor: '#6b6b6b',
          borderRadius: '6px'
        },
        '::-webkit-scrollbar-thumb:hover': {
          background: '#555'
        }
      }
    }
  };
}
