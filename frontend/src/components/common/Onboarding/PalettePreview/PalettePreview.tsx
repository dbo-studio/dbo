import { variables } from '@/core/theme/variables';
import { Box, alpha } from '@mui/material';
import type { JSX } from 'react';
import type { ThemePaletteSwatch } from './themePaletteSwatch';

type PalettePreviewProps = { swatch: ThemePaletteSwatch };

/** A miniature of the app in a palette: title bar, sidebar, tab and a few lines of code. */
export default function PalettePreview({ swatch }: PalettePreviewProps): JSX.Element {
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