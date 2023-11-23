import { Components, Theme } from "@mui/material";

type MuiTree = {};

export default function TreeView(theme: Theme): Components | MuiTree {
  return {
    MuiTreeItem: {
      styleOverrides: {
        root: {
          borderRadius: "4px",
          backgroundColor: theme.palette.background,
          color: theme.palette.text.primary,
          "& .MuiTreeItem-content": {
            borderRadius: "4px",
            height: 32,
          },
        },
      },
    },
  };
}
