import { Box, styled } from "@mui/material";
import { ConnectionItemStylesProps } from "./types";

export const ConnectionItemStyles = styled(Box)<ConnectionItemStylesProps>(
  ({ theme, selected }) => ({
    cursor: "pointer",
    position: "relative",
    borderBottom: `1px solid ${theme.palette.divider}`,
    borderRight: selected ? "unset" : `1px solid ${theme.palette.divider}`,
    justifyContent: "center",
    display: "flex",
    alignItems: "center",
    flexDirection: "column",
    padding: theme.spacing(2),
    maxHeight: "82px",
    ":hover": {
      background: theme.palette.background.paper,
    },
  }),
);
