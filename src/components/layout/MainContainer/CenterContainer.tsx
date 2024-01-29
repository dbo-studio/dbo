import { tools } from '@/src/core/utils';
import styled from '@emotion/styled';
import { Box, Theme, useTheme } from '@mui/material';
import EditorTab from '../../common/EditorTab/EditorTab';

export default function CenterContainer() {
  const theme: Theme = useTheme();

  const CenterContainerStyle = styled(Box)({
    borderTop: `1px solid ${theme.palette.divider}`,
    borderBottom: `1px solid ${theme.palette.divider}`,
    maxHeight: tools.screenMaxHeight(),
    minHeight: tools.screenMaxHeight(),
    height: tools.screenMaxHeight(),
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
