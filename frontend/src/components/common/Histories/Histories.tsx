import api from '@/api';
import { useHistoryStore } from '@/store/historyStore/history.store';
import type { HistoryType } from '@/types/History';
import { Box, ClickAwayListener, LinearProgress, useTheme } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { v4 as uuid } from 'uuid';
import HistoryItem from './HistoryItem/HistoryItem';

export default function Histories(): JSX.Element {
  const [selected, setSelected] = useState<number | null>(null);
  const theme = useTheme();
  const { histories, updateHistories } = useHistoryStore();

  const { isLoading } = useQuery({
    queryKey: ['histories'],
    queryFn: async (): Promise<HistoryType[]> => {
      const res = await api.histories.getHistories();
      updateHistories(res);
      return res;
    },
    enabled: histories === undefined
  });

  return (
    <ClickAwayListener onClickAway={(): void => setSelected(null)}>
      <Box>
        <Box mt={theme.spacing(1)}>
          {isLoading ? (
            <LinearProgress style={{ marginTop: '8px' }} />
          ) : (
            histories?.map((query) => (
              <HistoryItem
                onClick={(): void => setSelected(query.id)}
                key={uuid()}
                history={query}
                selected={selected === query.id}
              />
            ))
          )}
        </Box>
      </Box>
    </ClickAwayListener>
  );
}
