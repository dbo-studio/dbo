import { getAppFontFamily, getEditorFontFamily } from '@/core/fonts';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box, Typography, alpha, styled } from '@mui/material';
import type { JSX } from 'react';
import EditorTheme from './EditorTheme/EditorTheme';
import Font from './Font/Font';
import Theme from './Theme/Theme';

const PreviewCardStyled = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 4,
  overflow: 'hidden',
  marginBottom: theme.spacing(2),
  background: theme.palette.background.subdued
}));

const PreviewChromeStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1, 1.5),
  borderBottom: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.default
}));

const PreviewEditorStyled = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5),
  fontSize: 13,
  lineHeight: 1.5,
  background: alpha(theme.palette.background.default, 0.6)
}));

function AppearancePreview(): JSX.Element {
  const themeSettings = useSettingStore((state) => state.theme);
  const appFont = getAppFontFamily(themeSettings.appFont);
  const editorFont = getEditorFontFamily(themeSettings.editorFont);

  return (
    <PreviewCardStyled data-settings-id='appearance.theme'>
      <PreviewChromeStyled sx={{ fontFamily: appFont }}>
        <Typography variant='caption' color='textSecondary'>
          {locales.application_font_preview}
        </Typography>
        <Typography variant='subtitle2' color='textTitle' sx={{ fontFamily: appFont }}>
          DBO Studio
        </Typography>
      </PreviewChromeStyled>
      <PreviewEditorStyled
        data-settings-id='appearance.editor'
        sx={{ fontFamily: editorFont, fontSize: themeSettings.editorFontSize }}
      >
        <Typography component='span' variant='body2' sx={{ fontFamily: 'inherit', fontSize: 'inherit' }}>
          SELECT * FROM users WHERE active = true;
        </Typography>
      </PreviewEditorStyled>
    </PreviewCardStyled>
  );
}

export default function AppearancePanel(): JSX.Element {
  return (
    <Box>
      <AppearancePreview />
      <Box data-settings-id='appearance.theme' sx={{ mb: 2 }}>
        <Theme />
      </Box>
      <Box data-settings-id='appearance.font' sx={{ mb: 2 }}>
        <Font />
      </Box>
      <Box data-settings-id='appearance.editor'>
        <EditorTheme />
      </Box>
    </Box>
  );
}
