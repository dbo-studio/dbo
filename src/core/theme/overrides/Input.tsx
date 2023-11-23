import { Components, Theme } from "@mui/material/styles";

export default function Input(theme: Theme): Components {
  return {
    MuiInputBase: {
      styleOverrides: {
        root: {
          height: 32,
          border: `1px solid ${theme.palette.divider}`,
          color: theme.palette.text.primary,
          borderRadius: 5,
          padding: "0 8px",
          "&.Mui-disabled": {
            "& svg": { color: theme.palette.text.disabled },
          },
          "&.Mui-focused": {
            borderColor: theme.palette.action.active,
          },
          ":before": {
            borderBottom: "none !important",
          },
          ":after": {
            borderBottom: "none !important",
          },
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
