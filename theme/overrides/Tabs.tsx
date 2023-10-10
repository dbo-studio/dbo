// ----------------------------------------------------------------------

import { Components, Theme } from "@mui/material/styles";

export default function Tabs(theme: Theme): Components {
  return {
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
  };
}
