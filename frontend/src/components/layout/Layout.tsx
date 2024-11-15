import { useParamParser, useWindowSize } from '@/hooks';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Grid2 } from '@mui/material';
import ConfirmModal from '../base/Modal/ConfirmModal';
import AppHeader from './AppHeader/AppHeader';
import { LayoutStyled } from './Layout.styled';
import CenterContainer from './MainContainer/CenterContainer';
import EndContainer from './MainContainer/EndContainer';
import ExplorerContainer from './MainContainer/ExplorerContainer';
import StartContainer from './MainContainer/StartContainer';

export default function Layout() {
  const windowSize = useWindowSize(true);
  const { sidebar } = useSettingStore();
  useParamParser();

  return (
    <LayoutStyled maxHeight={windowSize.height} minHeight={windowSize.height} height={windowSize.height}>
      <ConfirmModal />
      <AppHeader />
      <Grid2 container spacing={0}>
        <Grid2>
          <StartContainer />
        </Grid2>
        {sidebar.showLeft && (
          <Grid2>
            <ExplorerContainer />
          </Grid2>
        )}
        <Grid2 flex={1} minWidth={0}>
          <CenterContainer />
        </Grid2>
        {sidebar.showRight && (
          <Grid2>
            <EndContainer />
          </Grid2>
        )}
      </Grid2>
    </LayoutStyled>
  );
}
