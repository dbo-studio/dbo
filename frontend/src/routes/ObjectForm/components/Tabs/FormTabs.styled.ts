import { Box, styled } from '@mui/material';

export const FormTabsStyled = styled(Box)(({ theme }) => ({
  borderRight: `1px solid ${theme.palette.divider}`,
  padding: `${theme.spacing(2)} ${theme.spacing(1)} ${theme.spacing(1)} ${theme.spacing(1)}`,
  minWidth: '220px',
  '& .MuiTabs-list': {
    flexDirection: 'column',
    alignItems: 'flex-start',
    '& .MuiTab-root': {
      marginBottom: theme.spacing(0.5),
      width: '100%',
      alignItems: 'flex-start'
    }
  }
}));
