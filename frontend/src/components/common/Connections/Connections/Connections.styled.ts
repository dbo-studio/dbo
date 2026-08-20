import { Box, styled } from '@mui/material';

type ConnectionsStyledProps = {
  expanded?: boolean;
  expandedLayout?: 'grid' | 'column';
};

export const ConnectionsStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'expanded' && prop !== 'expandedLayout'
})<ConnectionsStyledProps>(({ theme, expanded, expandedLayout = 'grid' }) => ({
  height: '100%',
  background: theme.palette.background.subdued,
  borderRight: `1px solid ${theme.palette.divider}`,
  ...(expanded
    ? expandedLayout === 'grid'
      ? {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          alignContent: 'start',
          gap: theme.spacing(1),
          padding: theme.spacing(1),
          overflow: 'auto',
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          width: '100%'
        }
      : {
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          width: '100%'
        }
    : {
        display: 'flex',
        flexDirection: 'column',
        width: '83px',
        minWidth: '83px',
        maxWidth: '83px',
        overflow: 'hidden'
      })
}));

export const EmptyConnectionsStyled = styled(Box)(() => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  gap: 2,
  p: 3,
  minHeight: 240,
  width: '100%'
}));
