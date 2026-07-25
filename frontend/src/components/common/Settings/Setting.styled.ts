import { Grid, styled } from '@mui/material';

export const SettingsContentStyled = styled(Grid)(() => ({
  maxHeight: 400,
  overflow: 'auto'
})) as typeof Grid;

export const SettingsContentGridStyled = styled(Grid)(({ isMobile }: { isMobile: boolean }) => ({
  width: isMobile ? '100vw' : 'min(850px, 95vw)',
  maxWidth: '100vw',
  height: isMobile ? '100dvh' : undefined,
  maxHeight: isMobile ? '100dvh' : '90dvh',
  flex: 1
}));
