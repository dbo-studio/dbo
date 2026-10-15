import { variables } from '@/core/theme/variables';
import { Box, InputBase, styled } from '@mui/material';
import type { RowFieldInputStyledProps } from '../types';

export const RowFieldStyled = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(1.5)
}));

export const RowFieldLabelRowStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  marginBottom: theme.spacing(0.5)
}));

export const RowFieldMetaStyled = styled('span')({
  opacity: 0.6
});

export const RowFieldInputStyled = styled(InputBase, {
  shouldForwardProp: (prop) => prop !== 'muted'
})<RowFieldInputStyledProps>(({ theme, muted }) => ({
  // Keeps the design-system field (1px divider border, 5px radius, default background) and only lets it grow with multiline text.
  height: 'auto',
  minHeight: 40,
  padding: theme.spacing(0.75, 1.25),
  borderRadius: variables.radius.medium,
  opacity: muted ? 0.6 : 1,
  '& .MuiInputBase-input': {
    border: 'none',
    padding: 0
  }
}));

export const RowEditSheetRemoveStyled = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1)
}));
