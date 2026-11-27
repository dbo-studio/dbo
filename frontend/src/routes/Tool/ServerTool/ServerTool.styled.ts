import { Box, styled } from '@mui/material';

export const ServerToolStyled = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0
});

export const ServerToolBodyStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: theme.spacing(2)
}));

export const ServerSplitStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  gap: theme.spacing(3)
}));

export const ServerPaneStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minWidth: 340,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2)
}));

/** Labelled inputs on one line; the button sits on the inputs' baseline (their bottom edge). */
export const ServerFormStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'stacked'
})<{ stacked?: boolean }>(({ theme, stacked }) => ({
  display: 'flex',
  flexDirection: stacked ? 'column' : 'row',
  alignItems: stacked ? 'stretch' : 'flex-end',
  flexWrap: 'wrap',
  gap: theme.spacing(1.5),
  '& > :not(button)': { flex: stacked ? undefined : '1 1 160px', minWidth: 0 },
  '& > button': { flexShrink: 0, alignSelf: stacked ? 'flex-start' : 'flex-end' }
}));
