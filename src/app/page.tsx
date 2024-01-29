'use client';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import { Box, styled } from '@mui/material';
import AppHeader from '../components/layout/AppHeader/AppHeader';
import MainContainer from '../components/layout/MainContainer/MainContainer';
import { tools } from '../core/utils';

const Wrapper = styled(Box)(({ theme }) => ({
  height: tools.screenFullHeight(),
  backgroundColor: theme.palette.background.default,
  maxHeight: tools.screenFullHeight(),
  overflow: 'hidden'
}));

const Page = () => {
  return (
    <Wrapper>
      <AppHeader />
      <MainContainer />
    </Wrapper>
  );
};

export default Page;
