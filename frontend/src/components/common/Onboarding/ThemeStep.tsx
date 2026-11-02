import SyntaxHighlighter from '@/components/base/SyntaxHighlighter/SyntaxHighlighter';
import { ThemeModeEnum } from '@/core/enums';
import { paletteMap } from '@/core/theme';
import { getAllThemes } from '@/core/theme/themeRegistry';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box, Typography } from '@mui/material';
import { Moon, Sun } from 'lucide-react';
import type { JSX } from 'react';
import { ChoiceCardStyled, MockBarStyled } from './Onboarding.styled';

const SAMPLE_SQL = `SELECT u.name, COUNT(o.id) AS orders
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.active = true
GROUP BY u.name
ORDER BY orders DESC;`;

const MODES = [
  { isDark: false, label: locales.light, Icon: Sun },
  { isDark: true, label: locales.dark, Icon: Moon }
];

type Swatch = { primary: string; secondary: string; surface: string };

/** The three colors that tell palettes apart, for the mode being previewed. */
const swatchOf = (themeId: string, isDark: boolean): Swatch => {
  const palette = paletteMap[themeId]?.(isDark ? ThemeModeEnum.Dark : ThemeModeEnum.Light) as
    { primary: { main: string }; secondary: { main: string }; background: { paper: string } } | undefined;

  return {
    primary: palette?.primary.main ?? 'transparent',
    secondary: palette?.secondary.main ?? 'transparent',
    surface: palette?.background.paper ?? 'transparent'
  };
};

/** Picks light or dark and a palette. The whole app, this screen included, follows at once. */
export default function ThemeStep(): JSX.Element {
  const theme = useSettingStore((state) => state.theme);
  const updateTheme = useSettingStore((state) => state.updateTheme);
  const isDark = theme.isDark === true;

  const setMode = (nextDark: boolean): void => {
    updateTheme({ isDark: nextDark, editorTheme: nextDark ? 'github-dark' : 'github-light' });
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 540, display: 'grid', gap: 3 }} data-testid='onboarding-theme'>
      <Box>
        <Typography variant='overline' color='text.secondary'>
          {locales.onboarding_theme_mode}
        </Typography>
        <Box sx={{ pt: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          {MODES.map(({ isDark: modeDark, label, Icon }) => (
            <ChoiceCardStyled
              key={label}
              selected={isDark === modeDark}
              onClick={(): void => setMode(modeDark)}
              data-testid={`onboarding-mode-${modeDark ? 'dark' : 'light'}`}
              sx={{ flexDirection: 'row', alignItems: 'center', gap: 1.5, px: 2, py: 1.75 }}
            >
              <Icon size={20} />
              <Typography variant='subtitle2'>{label}</Typography>
            </ChoiceCardStyled>
          ))}
        </Box>
      </Box>
      <Box>
        <Typography variant='overline' color='text.secondary'>
          {locales.onboarding_theme_palette}
        </Typography>
        <Box sx={{ pt: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 1.5 }}>
          {getAllThemes().map((item) => {
            const swatch = swatchOf(item.id, isDark);

            return (
              <ChoiceCardStyled
                key={item.id}
                selected={theme.themeName === item.id}
                onClick={(): void => updateTheme({ themeName: item.id })}
                data-testid={`onboarding-palette-${item.id}`}
                sx={{ gap: 1.25 }}
              >
                <Box sx={{ display: 'flex' }}>
                  {[swatch.surface, swatch.primary, swatch.secondary].map((color, index) => (
                    <Box
                      key={`${item.id}-${color}-${index === 0 ? 'surface' : index === 1 ? 'primary' : 'secondary'}`}
                      sx={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        backgroundColor: color,
                        border: 1,
                        borderColor: 'divider',
                        ml: index === 0 ? 0 : -0.75
                      }}
                    />
                  ))}
                </Box>
                <Typography variant='subtitle2'>{item.name}</Typography>
              </ChoiceCardStyled>
            );
          })}
        </Box>
      </Box>
      <Box
        sx={{ border: 1, borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}
        data-testid='onboarding-editor'
      >
        <MockBarStyled>
          <span />
          <span />
          <span />
        </MockBarStyled>
        <SyntaxHighlighter value={SAMPLE_SQL} />
      </Box>
    </Box>
  );
}
