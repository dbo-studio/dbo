import { getAppFontFamily, getEditorFontFamily } from '@/core/fonts';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Typography } from '@mui/material';
import type { JSX } from 'react';
import { PreviewCardStyled, PreviewChromeStyled, PreviewEditorStyled } from './AppearancePreview.styled';

export default function AppearancePreview(): JSX.Element {
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