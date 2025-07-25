import { useCurrentConnection, useWindowSize } from '@/hooks';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Grid } from '@mui/material';
import type { JSX } from 'react';
import ConfirmModal from '../base/Modal/ConfirmModal/ConfirmModal.tsx';
import AppHeader from './AppHeader/AppHeader';
import { LayoutStyled } from './Layout.styled';
import StartContainer from './MainContainer/StartContainer';
import CenterContainer from './MainContainer/CenterContainer.tsx';
import EndContainer from './MainContainer/EndContainer.tsx';
import ExplorerContainer from './MainContainer/ExplorerContainer.tsx';

export default function Layout(): JSX.Element {
  const windowSize = useWindowSize(true);
  const sidebar = useSettingStore((state) => state.sidebar);
  const currentConnection = useCurrentConnection();

  return (
    <LayoutStyled maxHeight={windowSize.height} minHeight={windowSize.height} height={windowSize.height}>
      <ConfirmModal />
      <AppHeader />
      <Grid container spacing={0}>
        <Grid>
          <StartContainer />
        </Grid>
        {sidebar.showLeft && currentConnection && (
          <Grid>
            <ExplorerContainer />
          </Grid>
        )}
        {currentConnection && (
          <Grid flex={1} minWidth={0}>
            <CenterContainer />
          </Grid>
        )}

        {sidebar.showRight && currentConnection && (
          <Grid>
            <EndContainer />
          </Grid>
        )}
      </Grid>
    </LayoutStyled>
  );
}
