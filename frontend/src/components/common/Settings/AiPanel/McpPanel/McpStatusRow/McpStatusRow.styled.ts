import { variables } from '@/core/theme/variables';
import { type Theme, alpha } from '@mui/material';

export const monoChipSx = (theme: Theme) => ({
  maxWidth: '100%',
  height: 'auto',
  '& .MuiChip-label': {
    fontFamily: theme.editorFontFamily,
    fontSize: variables.fontSize.sm,
    whiteSpace: 'normal',
    wordBreak: 'break-all',
    py: 0.5
  }
});