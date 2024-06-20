'use client';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import { ChannelName } from '@/core/constants';
import { tools } from '@/core/utils';
import { useWindowSize } from '@/hooks/useWindowSize.hook';
import { changeUrl } from '@/services/api/intialize';
import { Box, styled } from '@mui/material';
import { useEffect, useState } from 'react';
import api from '../api';
import ConfirmModal from '../components/base/Modal/ConfirmModal';
import AppHeader from '../components/layout/AppHeader/AppHeader';
import MainContainer from '../components/layout/MainContainer/MainContainer';

const Wrapper = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  overflow: 'hidden'
}));

const Page = () => {
  const windowSize = useWindowSize(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (tools.isElectron()) {
      api.electron.getPort();
      window.electron.receive(ChannelName, (data: any) => {
        changeUrl(data.data);
        setLoaded(true);
      });
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

export default Page;
