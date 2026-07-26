import SelectInput from '@/components/base/SelectInput/SelectInput';
import { SelectInputOption } from '@/components/base/SelectInput/types';
import {
  APP_FONT_OPTIONS,
  EDITOR_FONT_OPTIONS,
  ensureFont,
  getAppFontFamily,
  getEditorFontFamily,
  prefetchFonts
} from '@/core/fonts';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box, CircularProgress, Divider, FormControl, Typography } from '@mui/material';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';
import { FontPreviewBoxStyled } from './Font.styled';

function fontOptionLabel(option: SelectInputOption): JSX.Element {
  const fontFamily = typeof option.fontFamily === 'string' ? option.fontFamily : undefined;
  return <span style={{ fontFamily }}>{option.label}</span>;
}

export default function Font(): JSX.Element {
  const theme = useSettingStore((state) => state.theme);
  const updateTheme = useSettingStore((state) => state.updateTheme);
  const appFontId = theme.appFont;
  const editorFontId = theme.editorFont;
  const [loadingApp, setLoadingApp] = useState(false);
  const [loadingEditor, setLoadingEditor] = useState(false);

  const handleChangeAppFont = async (value: string) => {
    if (!value || value === appFontId) {
      return;
    }
    setLoadingApp(true);
    try {
      await ensureFont(value);
      updateTheme({ appFont: value });
    } catch {
      toast.error(locales.font_load_failed);
    } finally {
      setLoadingApp(false);
    }
  };

  const handleChangeEditorFont = async (value: string) => {
    if (!value || value === editorFontId) {
      return;
    }
    setLoadingEditor(true);
    try {
      await ensureFont(value);
      updateTheme({ editorFont: value });
    } catch {
      toast.error(locales.font_load_failed);
    } finally {
      setLoadingEditor(false);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          mb: 1,
          mt: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <Typography variant='body1'>{locales.application_font}</Typography>
        {loadingApp && <CircularProgress size={14} />}
      </Box>
      <Divider />
      <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
        <SelectInput
          value={appFontId}
          options={APP_FONT_OPTIONS}
          disabled={loadingApp}
          formatOptionLabel={fontOptionLabel}
          onMenuOpen={(): void => {
            prefetchFonts(APP_FONT_OPTIONS.map((option) => option.value as string));
          }}
          onChange={(value): void => {
            void handleChangeAppFont((value as SelectInputOption)?.value as string);
          }}
        />
      </FormControl>
      <FontPreviewBoxStyled>
        <Typography variant='body2' color='textText' sx={{ fontFamily: getAppFontFamily(appFontId) }}>
          {locales.application_font_preview}
        </Typography>
      </FontPreviewBoxStyled>

      <Box
        sx={{
          mb: 1,
          mt: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <Typography variant='body1'>{locales.editor_font}</Typography>
        {loadingEditor && <CircularProgress size={14} />}
      </Box>
      <Divider />
      <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
        <SelectInput
          value={editorFontId}
          options={EDITOR_FONT_OPTIONS}
          disabled={loadingEditor}
          formatOptionLabel={fontOptionLabel}
          onMenuOpen={(): void => {
            prefetchFonts(EDITOR_FONT_OPTIONS.map((option) => option.value as string));
          }}
          onChange={(value): void => {
            void handleChangeEditorFont((value as SelectInputOption)?.value as string);
          }}
        />
      </FormControl>
      <FontPreviewBoxStyled>
        <Typography variant='body2' color='textText' sx={{ fontFamily: getEditorFontFamily(editorFontId) }}>
          {locales.editor_font_preview}
        </Typography>
      </FontPreviewBoxStyled>
    </Box>
  );
}
