import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';

export const HexValueColumnStyled = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0
}));

export const HexPreviewStyled = styled(Box)(() => ({
  padding: 8,
  overflow: 'auto',
  flex: 1,
  fontFamily: 'monospace',
  fontSize: variables.fontSize.sm
}));
