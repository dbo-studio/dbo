import { Box, styled, Typography } from '@mui/material';

type StatusBarPaginationStyledProps = {
  mobile?: boolean;
};

export const StatusBarPaginationStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'mobile'
})<StatusBarPaginationStyledProps>(({ mobile }) => ({
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'row',
  flexShrink: 0,
  justifyContent: mobile ? 'flex-end' : 'flex-end',
  width: mobile ? 'auto' : 208
}));

type PageNumberStyledProps = {
  mobile?: boolean;
};

export const PageNumberStyled = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'mobile'
})<PageNumberStyledProps>(({ mobile }) => ({
  fontWeight: 'bold',
  textAlign: 'center',
  minWidth: mobile ? 28 : 54,
  fontSize: mobile ? '0.8125rem' : undefined,
  lineHeight: 1
}));
