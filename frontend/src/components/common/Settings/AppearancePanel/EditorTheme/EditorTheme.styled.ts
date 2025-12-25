import { variables } from '@/core/theme/variables';
import { FormControl } from '@mui/material';
import { styled } from '@mui/system';

export const EditorThemePreviewStyled = styled(FormControl)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  padding: theme.spacing(0.5)
}));
