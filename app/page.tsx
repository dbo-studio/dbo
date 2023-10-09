"use client";

import AppHeader from "@/components/layout/app-header";
import MainContainer from "@/components/layout/main-container";
import ThemeProvider from "@/theme/index";
import styled from "@emotion/styled";

const GlobalStyles = styled.div({
  overflow: "hidden",
  height: "100vh",
  "*:focus:focus-visible": {
    outlineStyle: "none",
  },
});

export default function Home() {
  return (
    <ThemeProvider>
      <GlobalStyles>
        <AppHeader />
        <MainContainer />
      </GlobalStyles>
    </ThemeProvider>
  );
}
