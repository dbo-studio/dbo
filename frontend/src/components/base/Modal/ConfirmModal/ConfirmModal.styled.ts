import { ModalWrapperStyled } from '@/components/base/Modal/Modal.styled.ts';
import { styled } from '@mui/material';

export const ConfirmModalStyled = styled(ModalWrapperStyled)(() => ({
  minHeight: '120px',
  minWidth: '400px'
})) as typeof ModalWrapperStyled;
