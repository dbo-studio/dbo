import { styled } from '@mui/material';
import { keyframes } from '@mui/system';

const l1 = keyframes`
  to {
    clip-path: inset(0 -34% 0 0);
  }
`;

const Loader = styled('div')(({ theme }) => ({
  width: '15px',
  aspectRatio: '4',
  background: `radial-gradient(circle closest-side, ${theme.palette.text.warning} 90%, transparent) 0/calc(100%/3) 100% space`,
  clipPath: 'inset(0 100% 0 0)',
  animation: `${l1} 1s steps(4) infinite`,
  marginLeft: theme.spacing(1),
  marginTop: '2px'
}));

export default Loader;
