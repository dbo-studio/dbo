import Connections from "@/src/components/connections";
import styled from "@emotion/styled";
import { Box, useTheme } from "@mui/material";

export default function StartContainer() {
  const theme = useTheme();

  const StartContainerStyle = styled(Box)({
    borderTop: `1px solid ${theme.palette.divider}`,
    borderLeft: `1px solid ${theme.palette.divider}`,
    height: "100vh",
    overflow: "auto",
    maxWidth: "98px",
  });

  return (
    <StartContainerStyle>
      <Connections />
    </StartContainerStyle>
  );
}
