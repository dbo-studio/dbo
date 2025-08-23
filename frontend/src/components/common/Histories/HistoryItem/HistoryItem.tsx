import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, IconButton, Typography, useTheme } from '@mui/material';
import { type JSX, useCallback } from 'react';
import CustomIcon from '../../../base/CustomIcon/CustomIcon';
import type { HistoryItemProps } from '../types';
import { HistoryItemStyled } from './HistoryItem.styled';

export default function HistoryItem({ history, selected, onClick, context }: HistoryItemProps): JSX.Element {
  const theme = useTheme();
  const addEditorTab = useTabStore((state) => state.addEditorTab);
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);

  const handleRun = useCallback((): void => {
    const tab = addEditorTab(history.query);
    updateSelectedTab(tab);
  }, [addEditorTab, history.query, updateSelectedTab]);

  return (
    <HistoryItemStyled
      selected={selected}
      onContextMenu={(e) => {
        onClick();
        context(e);
      }}
    >
      <Box flex={1} mr={theme.spacing(1)} onDoubleClick={handleRun} onClick={(): void => onClick()}>
        <Typography variant='body2'>{history.query.slice(0, 50)}</Typography>
      </Box>

      <IconButton
        onClick={(e) => {
          onClick();
          context(e as unknown as React.MouseEvent<HTMLDivElement>);
        }}
      >
        <CustomIcon type='ellipsisVertical' size='s' />
      </IconButton>
    </HistoryItemStyled>
  );
}
