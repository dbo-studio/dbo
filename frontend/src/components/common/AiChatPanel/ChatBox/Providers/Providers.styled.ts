import { Box, Button, styled } from '@mui/material';

export const ProvidersStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  flex: 1,
  minWidth: 0
}));

export const ModelButtonStyled = styled(Button)(({ theme }) => ({
  minWidth: 0,
  maxWidth: '100%',
  height: 24,
  padding: theme.spacing(0, 0.75),
  textTransform: 'none',
  fontWeight: 400,
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
  gap: theme.spacing(0.5),
  '& .model-label': {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  }
}));
