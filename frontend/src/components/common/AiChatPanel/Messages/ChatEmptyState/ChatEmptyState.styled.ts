import { variables } from '@/core/theme/variables';
import { ButtonBase, styled } from '@mui/material';

export const StarterGridStyled = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
  gap: theme.spacing(0.75),
  width: '100%'
}));

export const StarterCardStyled = styled(ButtonBase)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  gap: theme.spacing(1),
  padding: theme.spacing(1, 1.25),
  textAlign: 'left',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  fontSize: '0.75rem',
  lineHeight: 1.45,
  transition: theme.transitions.create(['border-color', 'background-color'], { duration: 150 }),
  '& svg': { flexShrink: 0, marginTop: 2, opacity: 0.8 },
  '&:hover, &.Mui-focusVisible': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover
  }
}));
