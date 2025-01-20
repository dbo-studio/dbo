import { useContextMenu } from '@/hooks';
import { Box, CircularProgress, Tooltip, Typography } from '@mui/material';
import CustomIcon from '../../../../base/CustomIcon/CustomIcon';
import type { ConnectionItemProps } from '../../types';
import { ConnectionItemStyled } from './ConnectionItem.styled';
import ConnectionItemContextMenu from './ConnectionItemContextMenu/ConnectionItemContextMenu';

export default function ConnectionItem({ connection, selected = false, onClick, loading }: ConnectionItemProps) {
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  const handleClick = () => {
    if (!contextMenuPosition) {
      onClick();
    }
  };

  return (
    <ConnectionItemStyled onContextMenu={handleContextMenu} selected={selected} onClick={handleClick}>
      <Tooltip title={connection.name}>
        <Box maxWidth={50}>
          <CustomIcon type='databaseZap' size='m' />
          {loading ? (
            <Box>
              <CircularProgress size={15} color='primary' />
            </Box>
          ) : (
            <Typography component={'p'} variant='caption' noWrap>
              {connection.name}
            </Typography>
          )}
        </Box>
      </Tooltip>
      <ConnectionItemContextMenu
        connection={connection}
        contextMenu={contextMenuPosition}
        onClose={handleCloseContextMenu}
      />
    </ConnectionItemStyled>
  );
}
