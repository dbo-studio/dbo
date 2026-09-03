import { Box, styled } from '@mui/material';

export const DiagramControlsStyled = styled(Box)(({ theme }) => ({
  '& .react-flow__controls': {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    overflow: 'hidden',
    boxShadow: theme.shadows[1],
    backgroundColor: theme.palette.background.paper
  },
  '& .react-flow__controls-button': {
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
    width: 28,
    height: 28,
    '&:hover': {
      backgroundColor: theme.palette.action.hover
    },
    '&:disabled': {
      backgroundColor: theme.palette.background.paper
    },
    '& svg': {
      fill: theme.palette.text.secondary,
      maxWidth: 12,
      maxHeight: 12
    },
    '&:hover svg': {
      fill: theme.palette.text.primary
    }
  },
  '& .react-flow__controls-button:last-child': {
    borderBottom: 'none'
  },
  '& .react-flow__minimap': {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    overflow: 'hidden',
    boxShadow: theme.shadows[1],
    backgroundColor: theme.palette.background.paper
  }
}));
