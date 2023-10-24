import DBDataGrid from "@/src/components/db-data-grid";
import TextEditor from "@/src/components/text-editor/TextEditor";
import styled from "@emotion/styled";
import { Box, useTheme } from "@mui/material";

export default function CenterContainer() {
  const theme = useTheme();

  const DBContainerStyle = styled(Box)({
    borderTop: `1px solid ${theme.palette.divider}`,
    borderBottom: `1px solid ${theme.palette.divider}`,
    height: "100vh",
    overflow: "auto",
  });

  return (
    <DBContainerStyle>
      <TextEditor />
      <DBDataGrid />
    </DBContainerStyle>
  );
}
