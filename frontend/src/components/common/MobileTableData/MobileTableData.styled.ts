import { Box, Fab, styled } from '@mui/material';

export const MobileTableDataStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  backgroundColor: theme.palette.background.default
}));

export const MobileTableDataBodyStyled = styled(Box)({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column'
});

export const MobileTableDataCardsStyled = styled(Box)(({ theme }) => ({
  flex: 1,
  backgroundColor: theme.palette.background.subdued,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  // Bottom padding keeps the last card clear of the floating add button.
  padding: theme.spacing(1.5, 1.5, 10)
}));

export const MobileTableDataCenterStyled = styled(Box)(({ theme }) => ({
  margin: 'auto',
  padding: theme.spacing(3),
  textAlign: 'center'
}));

export const MobileTableDataFooterStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(0.5, 1),
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default
}));

export const MobileTableDataPaginationStyled = styled(Box)({
  flex: 1,
  minWidth: 0,
  overflowX: 'auto'
});

export const MobileTableDataFabStyled = styled(Fab)(({ theme }) => ({
  position: 'absolute',
  right: theme.spacing(2),
  bottom: theme.spacing(9),
  zIndex: 2
}));

// Same small uppercase label as the desktop sidebar section headers.
export const MobileTableDataSectionTitleStyled = styled(Box)(({ theme }) => ({
  margin: theme.spacing(2, 0, 1),
  fontSize: 11,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: theme.palette.text.subdued
}));
