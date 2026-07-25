import { Box, styled } from '@mui/material';

export const GeneralFormStyled = styled(Box)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(1.5, 2),
  flexShrink: 0
}));

export const GeneralFormFieldsGridStyled = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: theme.spacing(1.5, 2),
  alignItems: 'start'
}));

export const GeneralFormFieldStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'fullWidth'
})<{ fullWidth?: boolean }>(({ fullWidth }) => ({
  width: '100%',
  minWidth: 0,
  ...(fullWidth ? { gridColumn: '1 / -1' } : {})
}));
