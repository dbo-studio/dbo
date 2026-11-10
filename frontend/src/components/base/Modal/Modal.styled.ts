import { variables } from '@/core/theme/variables';
import { Box, Modal, styled } from '@mui/material';
import type { ModalSize } from './types';

export const ModalStyled = styled(Modal)(() => ({})) as typeof Modal;

export const ModalWrapperStyled = styled(Box)<{ padding?: string; size?: ModalSize }>(({ theme, padding, size = 'md' }) => ({
  width: variables.modal[size],
  maxWidth: 'calc(100vw - 32px)',
  maxHeight: '90dvh',
  borderRadius: variables.radius.large,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: variables.shadow.modal,
  background: theme.palette.background.default,
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  padding: padding ?? theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  ':focus-visible': {
    outline: 'unset'
  }
}));
