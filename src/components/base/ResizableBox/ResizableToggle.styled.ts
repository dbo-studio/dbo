import { styled } from "@mui/material";
import { ResizableToggleStyledProps } from "./types";

export const ResizableToggleStyled = styled("div")<ResizableToggleStyledProps>(
  ({ theme, direction }) => ({
    position: "absolute",
    width: "10px",
    height: "100%",
    background: "transparent",
    cursor: "col-resize",
    left: direction == "ltr" ? 0 : "unset",
    right: direction == "rtl" ? 0 : "unset",
    top: direction == "ttb" ? 0 : "unset",
    bottom: direction == "btt" ? 0 : "unset",
    zIndex: 2,
  }),
);
