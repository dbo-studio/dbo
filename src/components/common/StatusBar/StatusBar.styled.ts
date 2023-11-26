import { styled } from "@mui/material";

export const StatusBarStyled = styled("div")(({ theme }) => ({
  position: "absolute",
  background: theme.palette.background.default,
  height: "41px",
  width: "100%",
  right: 0,
  left: 0,
  bottom: "100px",
  display: "flex",
  justifyContent: "space-between",
  borderTop: `1px solid ${theme.palette.divider}`,
  alignItems: "center",
  padding: "0 8px",
}));
