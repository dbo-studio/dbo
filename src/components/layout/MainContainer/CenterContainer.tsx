import styled from '@emotion/styled';
import { Box, Theme, useTheme } from '@mui/material';
import EditorTab from '../../common/EditorTab/EditorTab';

export default function CenterContainer() {
  const theme: Theme = useTheme();

  const CenterContainerStyle = styled(Box)({
    borderTop: `1px solid ${theme.palette.divider}`,
    borderBottom: `1px solid ${theme.palette.divider}`,
    maxHeight: '100vh',
    minHeight: '100vh',
    height: '100vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  });

  return (
    <CenterContainerStyle>
      <EditorTab />
    </CenterContainerStyle>
  );
}
