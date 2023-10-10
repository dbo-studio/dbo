import { Components, Theme } from "@mui/material/styles";

export default function Table(theme: Theme): Components {
  return {
    MuiTableCell: {
      styleOverrides: {
        head: {
          color: theme.palette.text.secondary,
          backgroundColor: theme.palette.background.default,
        },
      },
    },
  };
}
