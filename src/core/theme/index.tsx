import { appConfig } from '@/src/appConfig';
import { ThemeProvider as MUIThemeProvider, ThemeOptions, createTheme } from '@mui/material/styles';
import { ThemeModeEnum } from '../enums';
import componentsOverride from './overrides';
import palette from './palette';
import typography from './typography';

type Props = {
  children: React.ReactNode;
};

export default function ThemeProvider({ children }: Props) {
  // const status = useAppSelector((state: any) => state.themeReducer.value);

  const themeOptions: ThemeOptions = {
    typography,
    palette: palette(ThemeModeEnum.Light),
    direction: appConfig.direction
  };

  const theme = createTheme(themeOptions);
  theme.components = componentsOverride(theme);
  console.log(theme.components.MuiCssBaseline);

  return <MUIThemeProvider theme={theme}>{children}</MUIThemeProvider>;
}
