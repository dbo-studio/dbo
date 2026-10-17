import { Box, InputBase, styled } from '@mui/material';
import { variables } from '@/core/theme/variables';

export const DiagramToolbarStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  padding: `${theme.spacing(0.75)} ${theme.spacing(1)}`,
  borderTop: `1px solid ${theme.palette.divider}`,
  borderBottom: `1px solid ${theme.palette.divider}`,
  minHeight: 40
}));

export const DiagramSearchStyled = styled(InputBase)({
  flex: 1,
  maxWidth: 240,
  fontSize: variables.fontSize.md
});

export const ToolbarSpacerStyled = styled(Box)({
  flex: 1
});
