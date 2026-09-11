import { variables } from '@/core/theme/variables';
import { Box, styled } from '@mui/material';

export const ShareModalSectionStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  marginTop: theme.spacing(2)
}));

export const ShareModalSectionPanelStyled = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  overflow: 'hidden'
}));

export const ShareModalPickerPanelStyled = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: variables.radius.medium,
  maxHeight: 240,
  overflowY: 'auto'
}));

export const ShareModalPickerRowStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1, 1.5),
  cursor: 'pointer',
  borderBottom: `1px solid ${theme.palette.divider}`,
  '&:last-child': {
    borderBottom: 'none'
  },
  '&:hover': {
    backgroundColor: theme.palette.action.hover
  }
}));

export const ShareModalPickerRowMainStyled = styled(Box)({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 12
});

export const ShareModalPickerRowTextStyled = styled(Box)({
  minWidth: 0,
  flex: 1
});

export const ShareModalToolbarStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1.5),
  marginBottom: theme.spacing(1.5)
}));

export const ShareModalToolbarActionsStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: theme.spacing(1)
}));

export const ShareModalFooterStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: theme.spacing(1.5),
  flexShrink: 0,
  marginTop: theme.spacing(2)
}));

export const ShareModalExistingActionsStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  flexShrink: 0
}));
