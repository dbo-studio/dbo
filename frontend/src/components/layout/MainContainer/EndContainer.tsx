import DBFields from '@/components/common/DBFields/DBFields';
import { useWindowSize } from '@/hooks/useWindowSize.hook';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box } from '@mui/material';
import type { JSX } from 'react';
import ResizableXBox from '../../base/ResizableBox/ResizableXBox';
import { EndContainerStyled } from './Container.styled';

export default function EndContainer(): JSX.Element {
  const windowSize = useWindowSize();
  const { sidebar, updateSidebar } = useSettingStore();

  return (
    <ResizableXBox
      onChange={(width: number): void => updateSidebar({ rightWidth: width })}
      width={sidebar.rightWidth}
      direction='ltr'
      maxWidth={500}
    >
      <EndContainerStyled maxHeight={windowSize.height} minHeight={windowSize.height} height={windowSize.height}>
        <Box role='tabpanel'>
          <DBFields />
        </Box>
      </EndContainerStyled>
    </ResizableXBox>
  );
}
