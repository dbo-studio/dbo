import { variables } from '@/src/core/theme/variables';
import { Box, styled } from '@mui/material';

export const ConnectionBoxStyled = styled(Box)(({ theme }) => ({
  background: '#E6F9F7',
  height: '32px',
  textAlign: 'center',
  borderRadius: variables.radius.medium,
  display: 'flex',
  alignItems: 'center',
  padding: `0 ${theme.spacing(2)}`,
  border: '1px solid #C0E3D9'
}));
