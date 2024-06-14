'use client';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import { useWindowSize } from '@/hooks/useWindowSize.hook';
import { Box, styled } from '@mui/material';
import { useEffect } from 'react';

const Wrapper = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  overflow: 'hidden'
}));

const Page = () => {
  const windowSize = useWindowSize(true);

  useEffect(() => {
    window.electronAPI.receive('message', (data: any) => {
      console.log(`Received from main: ${data}`);
    });
  }, []);

  // const onSayHiClick = () => {
  //   window.electronAPI.send('hello from new nextjs');
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
