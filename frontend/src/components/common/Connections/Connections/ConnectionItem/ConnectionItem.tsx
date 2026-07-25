import { useContextMenu } from '@/hooks';
import { Box, CircularProgress, Tooltip } from '@mui/material';
import type { JSX } from 'react';
import CustomIcon from '../../../../base/CustomIcon/CustomIcon';
import type { ConnectionItemProps } from '../../types';
import { ConnectionItemNameStyled, ConnectionItemStyled } from './ConnectionItem.styled';
import ConnectionItemContextMenu from './ConnectionItemContextMenu/ConnectionItemContextMenu';

export default function ConnectionItem({
  connection,
  selected = false,
  onClick,
  loading
}: ConnectionItemProps): JSX.Element {
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  const handleClick = (): void => {
    if (!contextMenuPosition) {
      onClick();
    }
  };

  return (
    <ConnectionItemStyled
      data-testid={`connection-item-${connection.name}`}
      onContextMenu={handleContextMenu}
      selected={selected}
      onClick={handleClick}
    >
      <CustomIcon type={connection.isOpen ? 'databaseZap' : 'database'} size='m' />
      {loading ? (
        <Box>
          <CircularProgress size={15} color='primary' />
        </Box>
      ) : (
        <Tooltip title={connection.name} enterDelay={500}>
          <ConnectionItemNameStyled component='p' variant='caption'>
            {connection.name}
          </ConnectionItemNameStyled>
        </Tooltip>
      )}
      <ConnectionItemContextMenu
        connection={connection}
        contextMenu={contextMenuPosition}
        onClose={handleCloseContextMenu}
      />
    </ConnectionItemStyled>
  );
}
