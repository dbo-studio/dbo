import { Components, Theme } from "@mui/material/styles";

// ----------------------------------------------------------------------

export default function Input(theme: Theme): Components {
  return {
    MuiInputBase: {
      styleOverrides: {
        root: {
          "&.Mui-disabled": {
            "& svg": { color: theme.palette.text.disabled },
          },
          height: 32,
          border: `1px solid ${theme.palette.divider}`,
          color: theme.palette.text.primary,
          borderRadius: 4,
          padding: "0 8px",
        },
        input: {
          "&::placeholder": {
            color: theme.palette.text.primary,
          },
        },
      },
    },
  };
}
