import DBDataGrid from "@/components/db-data-grid";
import styled from "@emotion/styled";
import { Box, useTheme } from "@mui/material";

export default function CenterContainer() {
  const theme = useTheme();

  const DBContainerStyle = styled(Box)({
    padding: "8px",
    borderTop: `1px solid ${theme.palette.divider}`,
    borderBottom: `1px solid ${theme.palette.divider}`,
    height: "100vh",
    overflow: "auto",
    paddingBottom: "80px",
  });

  return (
    <DBContainerStyle>
      <DBDataGrid />
    </DBContainerStyle>
  );
}
