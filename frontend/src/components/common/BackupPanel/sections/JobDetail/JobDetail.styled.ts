import { Box, styled } from '@mui/material';

export const JobDetailRootStyled = styled(Box)({});

export const JobDetailToolbarStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(1)
}));

export const JobDetailRunBlockStyled = styled(Box)(({ theme }) => ({
  borderTop: `1px solid ${theme.palette.divider}`
}));

export const JobDetailRunRowStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  paddingTop: theme.spacing(0.75),
  paddingBottom: theme.spacing(0.75)
}));

export const JobDetailRunMetaStyled = styled(Box)({
  flex: 1.5
});

export const JobDetailRunNoteStyled = styled(Box)({
  flex: 3,
  minWidth: 0
});

export const JobDetailRunLogStyled = styled(Box)(({ theme }) => ({
  margin: 0,
  marginBottom: theme.spacing(1),
  padding: theme.spacing(1),
  whiteSpace: 'pre-wrap',
  backgroundColor: theme.palette.action.hover,
  typography: 'caption'
}));