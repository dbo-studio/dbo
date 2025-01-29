import { variables } from '@/core/theme/variables';
import { Box, Modal, styled } from '@mui/material';

export const ModalStyled = styled(Modal)(() => ({})) as typeof Modal;

export const ModalWrapperStyled = styled(Box)(({ theme }) => ({
  minHeight: '400px',
  minWidth: '400px',
  borderRadius: variables.radius.medium,
  background: theme.palette.background.default,
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  ':focus-visible': {
    outline: 'unset'
  }
})) as typeof Box;
