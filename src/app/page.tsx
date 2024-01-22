'use client';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import { Box, styled } from '@mui/material';
import useSWR from 'swr';
import AppHeader from '../components/layout/AppHeader/AppHeader';
import MainContainer from '../components/layout/MainContainer/MainContainer';
import { getConnections } from '../core/services';
import { useConnectionStore } from '../store/connectionStore/connection.store';

const Wrapper = styled(Box)(({ theme }) => ({
  height: '100vh',
  backgroundColor: theme.palette.background.default,
  maxHeight: '100vh',
  overflow: 'hidden'
}));

const Page = () => {
  const { data, mutate, error } = useSWR('api_connections_get', getConnections);
  const { updateConnections } = useConnectionStore();

  if (data && !error) {
  }

  return (
    <Wrapper>
      <AppHeader />
      <MainContainer />
    </Wrapper>
  );
};

export default Page;
