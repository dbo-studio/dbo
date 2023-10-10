import { Components, Theme } from "@mui/material/styles";

export default function TreeView(theme: Theme): Components {
  return {
    MuiTreeItem: {
      styleOverrides: {
        root: {
          // Customize your TreeView style here
          backgroundColor: "lightblue", // Example background color
          color: "black", // Example text color
        },
      },
    },
  };
}
