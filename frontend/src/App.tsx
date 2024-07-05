import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import { useWindowSize } from '@/hooks';
import { Box, styled } from '@mui/material';
import ConfirmModal from './components/base/Modal/ConfirmModal';
import AppHeader from './components/layout/AppHeader/AppHeader';
import MainContainer from './components/layout/MainContainer/MainContainer';
import { useSetupDesktop } from './hooks/useSetupDesktop';

const Wrapper = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  overflow: 'hidden'
}));

const App = () => {
  const windowSize = useWindowSize(true);
  const done = useSetupDesktop();

  return done ? (
    <Wrapper maxHeight={windowSize.height} minHeight={windowSize.height} height={windowSize.height}>
      <ConfirmModal />
      <AppHeader />
      <MainContainer />
    </Wrapper>
  ) : null;
};

export default App;
