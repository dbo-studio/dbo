import { Box, keyframes, styled } from '@mui/material';

const pulse = keyframes`
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
`;

export const LivePulseDotStyled = styled(Box)(({ theme }) => ({
  width: 6,
  height: 6,
  borderRadius: '50%',
  flexShrink: 0,
  backgroundColor: theme.palette.primary.main,
  animation: `${pulse} 1.4s ease-in-out infinite`
}));
