import { Box, Theme, Typography, useTheme } from '@mui/material';
import { useState } from 'react';
import CustomIcon from '../../../../base/CustomIcon/CustomIcon';
import { ConnectionItemProps } from '../../types';
import ConnectionContextMenu from '../ConnectionContextMenu/ConnectionContextMenu';
import { ConnectionItemStyled } from './ConnectionItem.styled';

export default function ConnectionItem({ connection, selected = false, onClick }: ConnectionItemProps) {
  const theme: Theme = useTheme();
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
  } | null>(null);

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX + 2,
            mouseY: event.clientY - 6
          }
        : null
    );
  };

  const handleClick = () => {
    if (contextMenu == null) {
      onClick();
    }
  };

  const handleClose = () => {
    setContextMenu(null);
  };

  return (
    <ConnectionItemStyled onContextMenu={handleContextMenu} theme={theme} selected={selected} onClick={handleClick}>
      <Box maxHeight={50} maxWidth={50} textAlign={'center'}>
        <CustomIcon type='databaseOutline' size='l' />
        <Typography component={'p'} mt={1} variant='caption' noWrap>
          {connection.name}
        </Typography>
      </Box>
      <ConnectionContextMenu connection={connection} contextMenu={contextMenu} onClose={handleClose} />
    </ConnectionItemStyled>
  );
}
