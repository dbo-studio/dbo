import { Box, ButtonBase, styled } from '@mui/material';

export const AiPanelFormStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  paddingTop: theme.spacing(2)
})) as typeof Box;

export const AiPanelFooterStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginTop: theme.spacing(1)
}));

export const AiProviderListStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
  paddingTop: theme.spacing(2)
}));

export const AiProviderItemStyled = styled(ButtonBase, {
  shouldForwardProp: (prop) => prop !== 'selected'
})<{ selected: boolean }>(({ theme, selected }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: theme.spacing(0.5),
  minWidth: 112,
  padding: theme.spacing(1, 1.5),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  textAlign: 'left',
  transition: 'border-color 120ms ease'
}));
