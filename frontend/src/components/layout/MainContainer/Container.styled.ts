import { Box, styled } from '@mui/material';
import type { ContainerHeightProps } from '../Layout.styled';

const containerHeightStyles = ({ containerHeight }: ContainerHeightProps) =>
  containerHeight !== undefined
    ? {
        maxHeight: containerHeight,
        minHeight: containerHeight,
        height: containerHeight
      }
    : {};

export const CenterContainerStyled = styled(Box)<ContainerHeightProps>(({ theme, containerHeight }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  ...containerHeightStyles({ containerHeight })
}));

export const EndContainerStyled = styled(Box)<ContainerHeightProps>(({ theme, containerHeight }) => ({
  padding: theme.spacing(1),
  borderRight: `1px solid ${theme.palette.divider}`,
  borderLeft: `1px solid ${theme.palette.divider}`,
  overflow: 'auto',
  background: theme.palette.background.subdued,
  display: 'flex',
  flexDirection: 'column',
  ...containerHeightStyles({ containerHeight })
}));

export const StartContainerStyled = styled(Box)<ContainerHeightProps>(({ theme, containerHeight }) => ({
  borderLeft: `1px solid ${theme.palette.divider}`,
  overflow: 'auto',
  ...containerHeightStyles({ containerHeight })
}));

export const ExplorerContainerStyled = styled(Box)<ContainerHeightProps>(({ theme, containerHeight }) => ({
  padding: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.divider}`,
  borderRight: `1px solid ${theme.palette.divider}`,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  background: theme.palette.background.subdued,
  ...containerHeightStyles({ containerHeight })
}));

export const ExplorerTabPanelStyled = styled(Box)(() => ({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column'
}));
