import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';
import type { MenuPanelItemStyledProps } from '../../types';

export const MenuPanelItemStyled = styled(Box)<MenuPanelItemStyledProps>(({ theme, selected }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  padding: `${theme.spacing(1 / 2)} ${theme.spacing(1)}`,
  cursor: 'pointer',
  marginBottom: `${theme.spacing(1 / 2)}`,
  borderBottom: `1px solid ${theme.palette.divider}`,
  border: `1px solid ${selected ? theme.palette.divider : 'transparent'}`,
  borderRadius: variables.radius.medium,
  background: selected ? theme.palette.background.default : theme.palette.background.paper
}));
