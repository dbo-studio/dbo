import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import { MenuType } from '@/components/base/ContextMenu/types';
import { useContextMenu } from '@/hooks';
import locales from '@/locales';
import { Box, Theme, Tooltip, Typography, useTheme } from '@mui/material';
import CustomIcon from '../../../../base/CustomIcon/CustomIcon';
import { ConnectionItemProps } from '../../types';
import { ConnectionItemStyled } from './ConnectionItem.styled';
import { handleEditConnection, handleOpenConfirm } from './contextMenuActions';

export default function ConnectionItem({ connection, selected = false, onClick }: ConnectionItemProps) {
  const theme: Theme = useTheme();
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  const handleClick = () => {
    if (!contextMenuPosition) {
      onClick();
    }
  };

  const menu: MenuType[] = [
    {
      name: locales.edit,
      icon: 'settings',
      action: () => handleEditConnection(connection)
    },
    {
      name: locales.delete,
      icon: 'delete',
      action: () => handleOpenConfirm(connection),
      closeBeforeAction: true
    }
  ];

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
      <ContextMenu menu={menu} contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
    </ConnectionItemStyled>
  );
}
