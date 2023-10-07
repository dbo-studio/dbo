"use client";

import "@elastic/eui/dist/eui_theme_light.css";
import "bootstrap/dist/css/bootstrap-grid.min.css";

import { EuiProvider } from "@elastic/eui";
import AppHeader from "@/components/layout/app-header";
import MainContainer from "@/components/layout/main-container";

export default function Home() {
  return (
    <EuiProvider colorMode="light">
      <AppHeader />
      <MainContainer />
    </EuiProvider>
  );
}
