import useContextMenu from '@/src/hooks/useContextMenu';
import { Box, Theme, Tooltip, Typography, useTheme } from '@mui/material';
import CustomIcon from '../../../../base/CustomIcon/CustomIcon';
import { ConnectionItemProps } from '../../types';
import ConnectionContextMenu from '../ConnectionContextMenu/ConnectionContextMenu';
import { ConnectionItemStyled } from './ConnectionItem.styled';

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
      <ConnectionContextMenu
        connection={connection}
        contextMenu={contextMenuPosition}
        onClose={handleCloseContextMenu}
      />
    </ConnectionItemStyled>
  );
}
