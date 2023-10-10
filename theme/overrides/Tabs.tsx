import { Components, Theme } from "@mui/material/styles";

export default function Tabs(theme: Theme): Components {
  return {
    MuiTabs: {
      styleOverrides: {
        root: {
          display: "flex",
          alignItems: "center",
          padding: 0,
          minHeight: "30px",
        },
        indicator: {
          display: "none",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          minHeight: 30,
          height: 30,
          borderRadius: 4,
          "& .MuiTabs-indicator": {
            display: "none",
            background: "#fff",
          },
          "& .MuiTabs-indicatorSpan": {
            maxWidth: 40,
            width: "100%",
            backgroundColor: "red",
          },
          "&.Mui-selected": {
            border: `1px solid ${theme.palette.divider}`,
            color: theme.palette.text.primary,
            fontWeight: theme.typography.fontWeightMedium,
            backgroundColor: theme.palette.background.paper,
          },
        },
      },
    },
  };
}
