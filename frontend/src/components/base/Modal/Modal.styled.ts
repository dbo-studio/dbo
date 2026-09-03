import { variables } from '@/core/theme/variables';
import { Box, Modal, styled } from '@mui/material';

export const ModalStyled = styled(Modal)(() => ({})) as typeof Modal;

export const ModalWrapperStyled = styled(Box)<{ padding?: string }>(({ theme, padding }) => ({
  minHeight: 'min(400px, 90dvh)',
  minWidth: 'min(400px, calc(100vw - 32px))',
  maxWidth: 'calc(100vw - 32px)',
  maxHeight: '90dvh',
  borderRadius: variables.radius.medium,
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
