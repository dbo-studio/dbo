import { Components, Theme } from '@mui/material/styles';

export default function CheckBox(theme: Theme): Components {
  return {
    MuiCheckbox: {
      styleOverrides: {
        root: {}
      }
    }
  };
}
