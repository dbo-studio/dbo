import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';

export const SortItemStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  // Phones: stack as a card, matching the filter cards.
  [theme.breakpoints.down('sm')]: {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    gridTemplateAreas: `
      "active column actions"
      ". direction ."
    `,
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(1),
    marginBottom: theme.spacing(1),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: variables.radius.medium,
    backgroundColor: theme.palette.background.default,
    '& > *': {
      margin: '0 !important',
      minWidth: 0
    },
    '& .sort-active': { gridArea: 'active' },
    '& .sort-column': { gridArea: 'column' },
    '& .sort-direction': { gridArea: 'direction' },
    '& .sort-actions': { gridArea: 'actions', display: 'flex' }
  }
}));
