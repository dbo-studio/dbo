import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { getAllThemes } from '@/core/theme/themeRegistry';
import { Box, Typography } from '@mui/material';
import { Check, Moon, Sun } from 'lucide-react';
import type { JSX } from 'react';
import { ChoiceCardStyled } from './Onboarding.styled';
import PalettePreview from './PalettePreview/PalettePreview';
import { swatchOf } from './PalettePreview/themePaletteSwatch';

const MODES = [
  { isDark: false, label: locales.light, Icon: Sun },
  { isDark: true, label: locales.dark, Icon: Moon }
];

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
