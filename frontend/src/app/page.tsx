'use client';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import { useWindowSize } from '@/hooks/useWindowSize.hook';
import { Box, styled } from '@mui/material';
import { useEffect } from 'react';
import api from '../api';
import { tools } from '../core/utils';

const Wrapper = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  overflow: 'hidden'
}));

const Page = () => {
  const windowSize = useWindowSize(true);

  useEffect(() => {
    if (tools.isElectron()) {
      api.electron.getPort();
    }
    // ;

    window.electron.receive(ChannelName, (data: any) => {
      console.log(data);

      console.log(`Received from main: ${data}`);
    });
  }, []);

  // const onSayHiClick = () => {
  //   window.electronAPI.send('message', 'hello from new nextjs');
  // };

  return (
    <Wrapper maxHeight={windowSize.height} minHeight={windowSize.height} height={windowSize.height}>
      {/*<ConfirmModal />*/}
      {/*<AppHeader />*/}
      {/*<MainContainer />*/}
      <p>sdas</p>
    </Wrapper>
  );
};

export default Page;
