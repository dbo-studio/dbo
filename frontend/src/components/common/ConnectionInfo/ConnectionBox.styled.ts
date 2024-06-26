import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';
import { ConnectionBoxStyledProps } from './types';

export const ConnectionBoxStyled = styled(Box)<ConnectionBoxStyledProps>(({ theme, active }) => ({
  background: active == 'true' ? '#E6F9F7' : theme.palette.grey[300],
  height: '32px',
  textAlign: 'center',
  borderRadius: variables.radius.medium,
  display: 'flex',
  alignItems: 'center',
  padding: `0 ${theme.spacing(2)}`,
  border: '1px solid #C0E3D9'
}));
