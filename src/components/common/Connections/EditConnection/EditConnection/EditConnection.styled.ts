import { variables } from '@/src/core/theme/variables';
import { Box, styled } from '@mui/material';

export const EditConnectionStyled = styled(Box)(({ theme }) => ({
  height: '400px',
  width: '400px',
  borderRadius: variables.radius.medium,
  background: theme.palette.background.default,
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  ':focus-visible': {
    outline: 'unset'
  }
}));
