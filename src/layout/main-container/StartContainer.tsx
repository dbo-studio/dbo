import styled from "@emotion/styled";
import { Box, useTheme } from "@mui/material";
import { useState } from "react";

export default function StartContainer() {
  const theme = useTheme();
  const [selectedTabId, setSelectedTabId] = useState(0);

  const StartContainerStyle = styled(Box)({
    padding: theme.spacing(1),
    border: `1px solid ${theme.palette.divider}`,
    height: "100vh",
    overflow: "auto",
  });

  return (
    <StartContainerStyle>
      <Box></Box>
    </StartContainerStyle>
  );
}
