import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import { useSetupDesktop, useWindowSize } from '@/hooks';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Grid } from '@mui/material';
import { Fragment } from 'react/jsx-runtime';
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

  return done ? (
    <Fragment>
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
            <CenterContainer />
          </Grid>
          {sidebar.showRight && (
            <Grid>
              <EndContainer />
            </Grid>
          )}
        </Grid>
      </LayoutStyled>
    </Fragment>
  ) : null;
}
