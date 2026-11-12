import { ThemeModeEnum } from '@/core/enums';
import { paletteMap } from '@/core/theme';
import { getAllThemes } from '@/core/theme/themeRegistry';
import { variables } from '@/core/theme/variables';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box, Typography, alpha } from '@mui/material';
import { Check, Moon, Sun } from 'lucide-react';
import type { JSX } from 'react';
import { ChoiceCardStyled } from './Onboarding.styled';

const MODES = [
  { isDark: false, label: locales.light, Icon: Sun },
  { isDark: true, label: locales.dark, Icon: Moon }
];

type Swatch = { surface: string; panel: string; primary: string; secondary: string; text: string };

/** The colors of a palette in the mode being previewed. */
const swatchOf = (themeId: string, isDark: boolean): Swatch => {
  const palette = paletteMap[themeId]?.(isDark ? ThemeModeEnum.Dark : ThemeModeEnum.Light) as
    | {
        primary: { main: string };
        secondary: { main: string };
        background: { default: string; paper: string };
        text: { text: string };
      }
    | undefined;

  return {
    surface: palette?.background.default ?? 'transparent',
    panel: palette?.background.paper ?? 'transparent',
    primary: palette?.primary.main ?? 'transparent',
    secondary: palette?.secondary.main ?? 'transparent',
    text: palette?.text.text ?? 'transparent'
  };
};

/** A miniature of the app in a palette: title bar, sidebar, tab and a few lines of code. */
function PalettePreview({ swatch }: { swatch: Swatch }): JSX.Element {
  const line = (width: string, color: string): JSX.Element => (
    <Box sx={{ height: 4, width, borderRadius: 2, backgroundColor: color }} />
  );

  return (
    <Box
      aria-hidden
      sx={{
        display: 'grid',
        gridTemplateColumns: '26% 1fr',
        height: 48,
        overflow: 'hidden',
        borderRadius: variables.radius.medium,
        border: 1,
        borderColor: 'divider',
        backgroundColor: swatch.surface
      }}
    >
      <Box sx={{ backgroundColor: swatch.panel, p: 0.75, display: 'grid', gap: 0.5, alignContent: 'start' }}>
        {line('80%', alpha(swatch.text, 0.35))}
        {line('55%', swatch.primary)}
        {line('70%', alpha(swatch.text, 0.35))}
      </Box>
      <Box sx={{ p: 0.75, display: 'grid', gap: 0.5, alignContent: 'start' }}>
        {line('40%', swatch.primary)}
        {line('85%', alpha(swatch.text, 0.4))}
        {line('65%', swatch.secondary)}
        {line('75%', alpha(swatch.text, 0.4))}
      </Box>
    </Box>
  );
}

/** Light or dark, then a palette shown as a tiny app. The whole app, this dialog included, follows at once. */
export default function ThemeStep(): JSX.Element {
  const theme = useSettingStore((state) => state.theme);
  const updateTheme = useSettingStore((state) => state.updateTheme);
  const isDark = theme.isDark === true;

  const setMode = (nextDark: boolean): void => {
    updateTheme({ isDark: nextDark, editorTheme: nextDark ? 'github-dark' : 'github-light' });
  };

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }} data-testid='onboarding-theme'>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
        {MODES.map(({ isDark: modeDark, label, Icon }) => (
          <ChoiceCardStyled
            key={label}
            selected={isDark === modeDark}
            onClick={(): void => setMode(modeDark)}
            data-testid={`onboarding-mode-${modeDark ? 'dark' : 'light'}`}
            sx={{ flexDirection: 'row', alignItems: 'center', gap: 1.25, px: 1.5, py: 1.25 }}
          >
            <Icon size={18} />
            <Typography variant='subtitle2'>{label}</Typography>
          </ChoiceCardStyled>
        ))}
      </Box>
      <Box>
        <Typography variant='overline' color='text.secondary'>
          {locales.onboarding_theme_palette}
        </Typography>
        <Box sx={{ pt: 0.5, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1 }}>
          {getAllThemes().map((item) => {
            const selected = theme.themeName === item.id;

            return (
              <ChoiceCardStyled
                key={item.id}
                selected={selected}
                onClick={(): void => updateTheme({ themeName: item.id })}
                data-testid={`onboarding-palette-${item.id}`}
              >
                <PalettePreview swatch={swatchOf(item.id, isDark)} />
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5 }}>
                  <Typography variant='caption' sx={{ fontWeight: 600 }}>
                    {item.name}
                  </Typography>
                  {selected && <Check size={14} />}
                </Box>
              </ChoiceCardStyled>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
