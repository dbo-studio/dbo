import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';

export const SqlEditorContainerStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  width: '100%',
  height: 250,
  minHeight: 250,
  border: 1,
  borderColor: theme.palette.divider,
  borderRadius: variables.radius.medium
}));
