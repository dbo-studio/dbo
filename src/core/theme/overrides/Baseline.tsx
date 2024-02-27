import { Components } from '@mui/material/styles';

export default function Baseline(): Components {
  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          position: 'fixed',
          right: 0,
          left: 0,
          top: 0,
          bottom: 0
        }
      }
    }
  };
}
