"use client";

import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "react-data-grid/lib/styles.css";

import AppHeader from "@/components/layout/app-header";
import MainContainer from "@/components/layout/main-container";
import ThemeProvider from "@/theme/index";

export default function Home() {
  return (
    <ThemeProvider>
      <AppHeader />
      <MainContainer />
    </ThemeProvider>
  );
}
