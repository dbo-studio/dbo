import { useParamParser, useSetupDesktop, useWindowSize } from '@/hooks';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Grid } from '@mui/material';
import ConfirmModal from '../base/Modal/ConfirmModal';
import AppHeader from './AppHeader/AppHeader';
import { LayoutStyled } from './Layout.styled';
import CenterContainer from './MainContainer/CenterContainer';
import EndContainer from './MainContainer/EndContainer';
import ExplorerContainer from './MainContainer/ExplorerContainer';
import StartContainer from './MainContainer/StartContainer';

export default function Layout() {
  const windowSize = useWindowSize(true);
  const done = useSetupDesktop();
  const { sidebar } = useSettingStore();
  const { getTabs, getSelectedTab } = useTabStore();
  useParamParser();

  return done ? (
    <>
      <LayoutStyled maxHeight={windowSize.height} minHeight={windowSize.height} height={windowSize.height}>
        <ConfirmModal />
        <AppHeader />
        <Grid container spacing={0}>
          <Grid>
            <StartContainer />
          </Grid>
          {sidebar.showLeft && (
            <Grid>
              <ExplorerContainer />
            </Grid>
          )}
          <Grid flex={1} minWidth={0}>
            <CenterContainer selectedTab={getSelectedTab()} tabs={getTabs()} />
          </Grid>
          {sidebar.showRight && (
            <Grid>
              <EndContainer />
            </Grid>
          )}
        </Grid>
      </LayoutStyled>
    </>
  ) : null;
}
