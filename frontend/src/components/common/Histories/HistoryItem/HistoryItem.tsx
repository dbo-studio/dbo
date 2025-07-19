import { useContextMenu } from '@/hooks';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, IconButton, Typography, useTheme } from '@mui/material';
import type { JSX } from 'react';
import CustomIcon from '../../../base/CustomIcon/CustomIcon';
import type { HistoryItemProps } from '../types';
import HistoryContextMenu from './HistoryContextMenu/HistoryContextMenu';
import { HistoryItemStyled } from './HistoryItem.styled';

export default function HistoryItem({ history, selected, onClick }: HistoryItemProps): JSX.Element {
  const theme = useTheme();
  const addEditorTab = useTabStore((state) => state.addEditorTab);
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);

  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  const handleRun = (): void => {
    const tab = addEditorTab(history.query);
    updateSelectedTab(tab);
  };

  return (
    <HistoryItemStyled selected={selected} onContextMenu={handleContextMenu}>
      <Box flex={1} mr={theme.spacing(1)} onDoubleClick={handleRun} onClick={(): void => onClick()}>
        <Typography variant='body2'>{history.query.slice(0, 50)}</Typography>
      </Box>

      <IconButton onClick={handleContextMenu}>
        <CustomIcon type='ellipsisVertical' size='s' />
      </IconButton>

      <HistoryContextMenu history={history} contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
    </HistoryItemStyled>
  );
}
