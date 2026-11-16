import {
  ConnectionFormBodyStyled,
  ConnectionFormContainerStyled
} from '@/components/common/AddConnection/AddConnection.styled';
import { styled } from '@mui/material';

/** The import steps stack their fields with an even gap, so the drop box does not touch the field under it. */
export const ImportModalBodyStyled = styled(ConnectionFormBodyStyled)(({ theme }) => ({
  gap: theme.spacing(1.5)
}));

export { ConnectionFormContainerStyled as ImportModalContainerStyled };
