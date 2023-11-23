import { AppConfig } from "@/core/utils";
import { useAppSelector } from "@/redux/hooks";
import {
  ThemeProvider as MUIThemeProvider,
  ThemeOptions,
  createTheme,
} from "@mui/material/styles";
import React from "react";
import componentsOverride from "./overrides";
import palette from "./palette";
import typography from "./typography";

type Props = {
  children: React.ReactNode;
};

export default function ThemeProvider({ children }: Props) {
  const status = useAppSelector((state: any) => state.themeReducer.value);

  const themeOptions: ThemeOptions = {
    typography,
    palette: palette(status),
    direction: AppConfig.direction,
  };

  const theme = createTheme(themeOptions);
  theme.components = componentsOverride(theme);

  return <MUIThemeProvider theme={theme}>{children}</MUIThemeProvider>;
}
