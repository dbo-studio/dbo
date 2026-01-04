import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';

export const FontPreviewBoxStyled = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium
}));
