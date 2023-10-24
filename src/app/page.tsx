"use client";

import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

import AppHeader from "@/src/layout/app-header";
import MainContainer from "@/src/layout/main-container";
import ThemeProvider from "@/src/theme/index";

export default function Home() {
  return (
    <ThemeProvider>
      <AppHeader />
      <MainContainer />
    </ThemeProvider>
  );
}
