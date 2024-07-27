import { styled } from '@mui/material';

export const QueryPreviewStyled = styled('div')(({ theme }) => ({
  borderBottom: `1px solid  ${theme.palette.divider}`,
  pre: {
    margin: 0,
    padding: theme.spacing(1),
    fontSize: theme.typography.body2.fontSize
  }
}));
