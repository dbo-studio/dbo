import { ModalWrapperStyled } from '@/components/base/Modal/Modal.styled.ts';
import { styled } from '@mui/material';

export const ConfirmModalStyled = styled(ModalWrapperStyled)(() => ({
  minHeight: '120px',
  minWidth: 'min(400px, calc(100vw - 32px))'
}));
