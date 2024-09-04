import { useContextMenu } from '@/hooks';
import { Box, type Theme, Tooltip, Typography, useTheme } from '@mui/material';
import CustomIcon from '../../../../base/CustomIcon/CustomIcon';
import type { ConnectionItemProps } from '../../types';
import { ConnectionItemStyled } from './ConnectionItem.styled';
import ConnectionItemContextMenu from './ConnectionItemContextMenu/ConnectionItemContextMenu';

export default function ConnectionItem({ connection, selected = false, onClick }: ConnectionItemProps) {
  const theme: Theme = useTheme();
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  const handleClick = () => {
    if (!contextMenuPosition) {
      onClick();
    }
  };

  return (
    <ConnectionItemStyled onContextMenu={handleContextMenu} theme={theme} selected={selected} onClick={handleClick}>
      <Tooltip title={connection.name}>
        <Box maxHeight={50} maxWidth={50} display={'flex'} flexDirection={'column'} alignItems={'center'}>
          <CustomIcon type='databaseOutline' size='l' />
          <Typography component={'p'} mt={1} variant='caption' noWrap>
            {connection.name}
          </Typography>
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
