'use no memo';

import SortableItem from '@/components/base/SortableList/SortableItem/SortableItem';
import { useContextMenu } from '@/hooks';
import { Box, CircularProgress, Tooltip } from '@mui/material';
import type { JSX } from 'react';
import { useCallback } from 'react';
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

  const handleClick = useCallback((): void => {
    if (!contextMenuPosition) {
      onClick();
    }
  }, [contextMenuPosition, onClick]);

  return (
    <Box onContextMenu={handleContextMenu} width='100%'>
      <SortableItem id={String(connection.id)} onClick={handleClick}>
        <ConnectionItemStyled data-testid={`connection-item-${connection.name}`} selected={selected}>
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
        </ConnectionItemStyled>
      </SortableItem>
      <ConnectionItemContextMenu
        connection={connection}
        contextMenu={contextMenuPosition}
        onClose={handleCloseContextMenu}
      />
    </Box>
  );
}
