import { alpha, Box, styled } from '@mui/material';

export const SettingRowStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(1.5),
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.divider}`,
  scrollMarginTop: theme.spacing(2),
  '&[data-highlighted="true"]': {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
    borderRadius: 4,
    marginLeft: theme.spacing(-1),
    marginRight: theme.spacing(-1),
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1)
  }
}));

export const SettingGroupStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  marginBottom: theme.spacing(1.5)
}));
