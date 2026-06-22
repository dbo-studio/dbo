import { Box, styled } from '@mui/material';

export type ContainerHeightProps = {
  containerHeight?: number;
};

const containerHeightStyles = ({ containerHeight }: ContainerHeightProps) =>
  containerHeight !== undefined
    ? {
        maxHeight: containerHeight,
        minHeight: containerHeight,
        height: containerHeight
      }
    : {};

export const LayoutStyled = styled(Box)<ContainerHeightProps>(({ theme, containerHeight }) => ({
  backgroundColor: theme.palette.background.default,
  overflow: 'hidden',
  ...containerHeightStyles({ containerHeight })
}));
