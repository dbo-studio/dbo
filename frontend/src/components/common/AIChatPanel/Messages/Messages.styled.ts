import { Box, styled } from "@mui/material";

export const MessagesStyled = styled(Box)(() => ({
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
    overflowY: "auto"
}));