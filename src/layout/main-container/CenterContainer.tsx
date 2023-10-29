import EditorTab from "@/components/editor-tab";
import styled from "@emotion/styled";
import { Box, Theme, useTheme } from "@mui/material";

export default function CenterContainer() {
  const theme: Theme = useTheme();

  const DBContainerStyle = styled(Box)({
    borderTop: `1px solid ${theme.palette.divider}`,
    borderBottom: `1px solid ${theme.palette.divider}`,
    height: "100vh",
    overflow: "auto",
  });

  return (
    <DBContainerStyle>
      <EditorTab />
    </DBContainerStyle>
  );
}
