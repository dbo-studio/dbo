import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';

export const ExplanationMessageStyled = styled(Box)<{ user: string }>(({ theme, user }) => ({
  backgroundColor: user === 'true' ? theme.palette.background.default : theme.palette.background.paper,
  borderRadius: variables.radius.medium,
  border: `1px solid ${user === 'true' ? theme.palette.divider : theme.palette.background.paper}`,
  padding: theme.spacing(1),
  color: theme.palette.text.text,

  '& *': {
    userSelect: 'text',
    WebkitUserSelect: 'text',
    msUserSelect: 'text'
  }
}));
