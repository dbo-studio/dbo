import { useParamParser, useWindowSize } from '@/hooks';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Grid2 } from '@mui/material';
import ConfirmModal from '../base/Modal/ConfirmModal/ConfirmModal.tsx';
import AppHeader from './AppHeader/AppHeader';
import { LayoutStyled } from './Layout.styled';
import CenterContainer from './MainContainer/CenterContainer';
import EndContainer from './MainContainer/EndContainer';
import ExplorerContainer from './MainContainer/ExplorerContainer';
import StartContainer from './MainContainer/StartContainer';

export default function Layout() {
  const windowSize = useWindowSize(true);
  const { sidebar } = useSettingStore();
  const currentConnection = useConnectionStore((state) => state.currentConnection);
  useParamParser();

  return (
    <LayoutStyled maxHeight={windowSize.height} minHeight={windowSize.height} height={windowSize.height}>
      <ConfirmModal />
      <AppHeader />
      <Grid2 container spacing={0}>
        <Grid2>
          <StartContainer />
        </Grid2>
        {sidebar.showLeft && currentConnection && (
          <Grid2>
            <ExplorerContainer />
          </Grid2>
        )}
        {currentConnection && (
          <Grid2 flex={1} minWidth={0}>
            <CenterContainer />
          </Grid2>
        )}

        {sidebar.showRight && currentConnection && (
          <Grid2>
            <EndContainer />
          </Grid2>
        )}
      </Grid2>
    </LayoutStyled>
  );
}
