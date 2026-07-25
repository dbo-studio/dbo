import { Box, styled } from '@mui/material';

type ColumnsContainerStyledProps = {
  height?: string;
};

export const ColumnsContainerStyled = styled(Box)<ColumnsContainerStyledProps>(({ theme, height }) => ({
  padding: theme.spacing(1),
  borderRight: `1px solid ${theme.palette.divider}`,
  height: height ?? '100%',
  maxHeight: height ?? '100%',
  minHeight: height ?? '100%',
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
  minWidth: '130px'
}));
