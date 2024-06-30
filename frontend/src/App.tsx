import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import { useWindowSize } from '@/hooks';
import { Box, styled } from '@mui/material';
import { invoke } from '@tauri-apps/api';
import { useEffect, useState } from 'react';
import ConfirmModal from './components/base/Modal/ConfirmModal';
import AppHeader from './components/layout/AppHeader/AppHeader';
import MainContainer from './components/layout/MainContainer/MainContainer';
import { changeUrl } from './core/services/api/intialize';
import { tools } from './core/utils';

const Wrapper = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  overflow: 'hidden'
}));

const App = () => {
  const windowSize = useWindowSize(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (tools.isTauri()) {
      invoke('get_backend_host').then((response) => {
        if (response == '') {
          alert('cant found empty port!');
          return;
        }
        changeUrl(response as string);
        setLoaded(true);
      });

      // api.electron.getPort();
      // window.electron.receive(ChannelName, (data: any) => {
      //   changeUrl(data.data);
      //   setLoaded(true);
      // });
    } else {
      setLoaded(true);
    }
  }, []);

  return loaded ? (
    <Wrapper maxHeight={windowSize.height} minHeight={windowSize.height} height={windowSize.height}>
      <ConfirmModal />
      <AppHeader />
      <MainContainer />
    </Wrapper>
  ) : null;
};

export default App;
