import LockedBanner from './LockedBanner';
import Panels from '@/components/common/Panels/Panels';
import BottomPanel from '@/components/layout/BottomPanel/BottomPanel';
import { Box } from '@mui/material';
import type { JSX } from 'react';
import { CenterContainerStyled } from './Container.styled';

export default function CenterContainer(): JSX.Element {
  return (
    <CenterContainerStyled>
      <LockedBanner />
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Panels />
      </Box>
      <BottomPanel />
    </CenterContainerStyled>
  );
}
