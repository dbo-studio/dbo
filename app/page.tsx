"use client";

import "@elastic/eui/dist/eui_theme_light.css";
import "bootstrap/dist/css/bootstrap-grid.min.css";

import { EuiProvider } from "@elastic/eui";
import AppHeader from "@/components/layout/appHedaer/AppHeader";

export default function Home() {
  return (
    <EuiProvider colorMode="light">
      <AppHeader />
    </EuiProvider>
  );
}
