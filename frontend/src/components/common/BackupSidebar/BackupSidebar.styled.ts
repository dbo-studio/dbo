import { styled } from '@mui/material';

export const ScheduleDotStyled = styled('span', {
  shouldForwardProp: (prop) => prop !== 'tone'
})<{ tone: 'success' | 'error' | 'idle' }>(({ theme, tone }) => ({
  display: 'inline-block',
  width: 7,
  height: 7,
  margin: theme.spacing(0, 0.25),
  flexShrink: 0,
  borderRadius: '50%',
  background: tone === 'idle' ? theme.palette.text.disabled : theme.palette[tone].main
}));
