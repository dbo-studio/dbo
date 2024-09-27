import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';

export const PaginationSettingStyled = styled(Box)(({ theme }) => ({
  background: theme.palette.background.subdued,
  borderRadius: variables.radius.medium,
  border: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(1)
}));
