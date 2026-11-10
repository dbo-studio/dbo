import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';

export const FilterItemStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  // Phones: the single row doesn't fit, so each filter becomes a card.
  [theme.breakpoints.down('sm')]: {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr) minmax(0, 1fr) auto',
    gridTemplateAreas: `
      "active column column actions"
      "operator operator value value"
      "next next . ."
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
    '& .filter-active': { gridArea: 'active' },
    '& .filter-column': { gridArea: 'column' },
    '& .filter-operator': { gridArea: 'operator' },
    '& .filter-value': { gridArea: 'value' },
    '& .filter-next': { gridArea: 'next' },
    '& .filter-actions': { gridArea: 'actions', display: 'flex' }
  }
}));
