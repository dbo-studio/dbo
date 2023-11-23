"use client";

import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

import { Box, styled } from "@mui/material";
import AppHeader from "../layout/app-header";
import MainContainer from "../layout/main-container";

const Wrapper = styled(Box)(({ theme }) => ({
  height: "100vh",
  backgroundColor: theme.palette.background.default,
  maxHeight: "100vh",
  overflow: "hidden",
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
