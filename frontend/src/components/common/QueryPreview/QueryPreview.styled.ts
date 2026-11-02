import { styled } from '@mui/material';

export const QueryPreviewStyled = styled('div')(({ theme }) => ({
  position: 'relative',
  borderBottom: `1px solid  ${theme.palette.divider}`
}));

export const QueryPreviewEditButtonStyled = styled('div')(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(0.5),
  right: theme.spacing(0.5),
  zIndex: 1
}));
