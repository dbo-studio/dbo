import { TabMode } from '@/core/enums';
import { useContextMenu } from '@/hooks';
import useNavigate from '@/hooks/useNavigate.hook';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, IconButton, Typography, useTheme } from '@mui/material';
import type { JSX } from 'react';
import CustomIcon from '../../../base/CustomIcon/CustomIcon';
import type { HistoryItemProps } from '../types';
import HistoryContextMenu from './HistoryContextMenu/HistoryContextMenu';
import { HistoryItemStyled } from './HistoryItem.styled';

export default function HistoryItem({ history, selected, onClick }: HistoryItemProps): JSX.Element {
  const theme = useTheme();
  const navigate = useNavigate();
  const { addTab } = useTabStore();

  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  const handleRun = (): void => {
    const name = history.query.slice(0, 10);
    const tab = addTab(name, undefined, TabMode.Query, history.query);
    navigate({
      route: tab.mode,
      tabId: tab.id
    });
  };

  return (
    <HistoryItemStyled selected={selected} onContextMenu={handleContextMenu}>
      <Box flex={1} mr={theme.spacing(1)} onDoubleClick={handleRun} onClick={(): void => onClick()}>
        <Typography color={'textText'} variant='body2'>
          {history.query.slice(0, 50)}
        </Typography>
      </Box>

      <IconButton onClick={handleContextMenu}>
        <CustomIcon type='ellipsisVertical' size='s' />
      </IconButton>

      <HistoryContextMenu history={history} contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
    </HistoryItemStyled>
  );
}
