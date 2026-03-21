import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/system';

export const InlineSqlEditorStyled = styled(Box)(({ theme }) => ({
  border: `1px solid  ${theme.palette.divider}`,
  height: 24,
  padding: '1px',
  borderRadius: variables.radius.medium
}));
