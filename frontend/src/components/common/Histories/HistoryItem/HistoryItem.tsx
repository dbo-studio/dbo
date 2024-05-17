import { TabMode } from '@/src/core/enums';
import useContextMenu from '@/src/hooks/useContextMenu';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { Box, ClickAwayListener, IconButton, Typography, useTheme } from '@mui/material';
import CustomIcon from '../../../base/CustomIcon/CustomIcon';
import { HistoryItemProps } from '../types';
import HistoryContextMenu from './HistoryContextMenu/HistoryContextMenu';
import { HistoryItemStyled } from './HistoryItem.styled';

export default function HistoryItem({ history, selected, onClick }: HistoryItemProps) {
  const theme = useTheme();

  const { addTab } = useTabStore();

  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  const handleRun = () => {
    const name = history.query.slice(0, 10);
    addTab(name, TabMode.Query, history.query);
  };

  return (
    <ClickAwayListener onClickAway={() => handleCloseContextMenu()}>
      <HistoryItemStyled selected={selected} onContextMenu={handleContextMenu}>
        <Box flex={1} mr={theme.spacing(1)} onDoubleClick={handleRun} onClick={() => onClick()}>
          <Typography variant='body2'>{history.query.slice(0, 50)}</Typography>
        </Box>

        <IconButton onClick={handleContextMenu}>
          <CustomIcon type='ellipsisVertical' size='s' />
        </IconButton>

        <HistoryContextMenu history={history} contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
      </HistoryItemStyled>
    </ClickAwayListener>
  );
}
