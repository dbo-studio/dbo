import type { Components, Theme } from '@mui/material/styles';
import { scrollbarStyles } from '../scrollbar';

export default function Baseline(theme: Theme): Components {
  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          // Linux (FreeType) hints glyphs to whole pixels, which crowds small UI text such as
          // buttons; geometricPrecision keeps sub-pixel glyph positions like macOS does.
          textRendering: 'geometricPrecision',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          fontKerning: 'normal',
          position: 'fixed',
          right: 0,
          left: 0,
          top: 0,
          bottom: 0,
          ...scrollbarStyles(theme)
        }
      }
    }
  };
}
