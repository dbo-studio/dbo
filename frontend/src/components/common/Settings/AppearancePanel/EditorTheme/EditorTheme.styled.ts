import { variables } from '@/core/theme/variables';
import { Box, FormControl, Typography, styled } from '@mui/material';

export const EditorThemePreviewStyled = styled(FormControl)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  padding: theme.spacing(0.5)
}));

export const EditorThemePreviewBoxStyled = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  padding: theme.spacing(2),
  border: '1px solid',
  borderColor: theme.palette.divider,
  borderRadius: variables.radius.medium,
  backgroundColor: theme.palette.background.paper
}));

export const EditorThemePreviewTextStyled = styled(Typography)<{ fontSize: number }>(({ fontSize }) => ({
  fontSize: `${fontSize}px`,
  fontFamily: 'monospace'
}));

export const EditorThemeSliderStyled = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(4),
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  marginBottom: theme.spacing(4)
}));
