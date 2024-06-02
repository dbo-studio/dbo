'use client';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import { Box, styled } from '@mui/material';
import ConfirmModal from '../components/base/Modal/ConfirmModal';
import AppHeader from '../components/layout/AppHeader/AppHeader';
import MainContainer from '../components/layout/MainContainer/MainContainer';
import { useWindowSize } from '@/hooks/useWindowSize.hook';

const Wrapper = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  overflow: 'hidden'
}));

const Page = () => {
  const windowSize = useWindowSize(true);

  return (
    <Wrapper maxHeight={windowSize.height} minHeight={windowSize.height} height={windowSize.height}>
      <ConfirmModal />
      <AppHeader />
      <MainContainer />
    </Wrapper>
  );
};

export default Page;
