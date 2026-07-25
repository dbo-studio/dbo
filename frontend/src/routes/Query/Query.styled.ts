import { Box, styled } from '@mui/material';

type QueryContainerStyledProps = {
  height?: string;
};

export const QueryContainerStyled = styled(Box)<QueryContainerStyledProps>(({ height }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: height ?? '100%'
}));

export const QueryEditorBoxStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  minHeight: '0',
  flex: 1,
  borderBottom: `1px solid ${theme.palette.divider}`
}));
