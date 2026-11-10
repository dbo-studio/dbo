import { Box, keyframes, styled } from '@mui/material';
import type { ScreenStackStyledProps } from '../types';

const slideIn = keyframes`
  from { transform: translateX(24%); opacity: 0.4; }
  to { transform: none; opacity: 1; }
`;

export const ScreenStackStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'animated'
})<ScreenStackStyledProps>(({ animated }) => ({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  ...(animated && {
    animation: `${slideIn} 220ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none'
    }
  })
}));
