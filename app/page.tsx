"use client";

import "@elastic/eui/dist/eui_theme_light.css";

import { EuiProvider } from "@elastic/eui";
import AppHeader from "@/components/layout/app-header";
import MainContainer from "@/components/layout/main-container";
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
    <EuiProvider colorMode="light">
      <GlobalStyles>
        <AppHeader />
        <MainContainer />
      </GlobalStyles>
    </EuiProvider>
  );
}
