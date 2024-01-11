import Connections from '@/src/components/common/Connections/Connections';
import styled from '@emotion/styled';
import { Box, useTheme } from '@mui/material';
import ResizableXBox from '../../base/ResizableBox/ResizableXBox';

export default function StartContainer() {
  const theme = useTheme();

  const StartContainerStyle = styled(Box)({
    borderTop: `1px solid ${theme.palette.divider}`,
    borderLeft: `1px solid ${theme.palette.divider}`,
    height: '100vh',
    overflow: 'auto'
  });

  return (
    <ResizableXBox width={98} direction='rtl'>
      <StartContainerStyle>
        <Connections />
      </StartContainerStyle>
    </ResizableXBox>
  );
}
