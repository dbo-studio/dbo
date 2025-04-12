import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import Search from '@/components/base/Search/Search';
import { useHistoryStore } from '@/store/historyStore/history.store';
import type { HistoryType } from '@/types/History';
import { Box, ClickAwayListener, IconButton, LinearProgress, Stack, useTheme } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { v4 as uuid } from 'uuid';
import HistoryItem from './HistoryItem/HistoryItem';

export default function Histories(): JSX.Element {
  const theme = useTheme();
  const [selected, setSelected] = useState<number | null>(null);
  const { histories, updateHistories } = useHistoryStore();
  const [search, setSearch] = useState('');

  const { isLoading, refetch } = useQuery({
    queryKey: ['histories'],
    queryFn: async (): Promise<HistoryType[]> => {
      const res = await api.histories.getHistories();
      updateHistories(res);
      return res;
    },
    enabled: histories === undefined
  });

  const handleRefresh = async (): Promise<void> => {
    await refetch();
  };

  return (
    <ClickAwayListener onClickAway={(): void => setSelected(null)}>
      <Box mt={1}>
        <Box>
          <Stack
            mt={1}
            spacing={1}
            direction={'row'}
            alignContent={'center'}
            justifyContent={'center'}
            alignItems={'center'}
          >
            <Box flex={1}>
              <Search onChange={(name): void => setSearch(name)} />
            </Box>
            <IconButton onClick={handleRefresh}>
              <CustomIcon size='s' type={'refresh'} />
            </IconButton>
          </Stack>
        </Box>

        <Box mt={theme.spacing(1)}>
          {isLoading ? (
            <LinearProgress style={{ marginTop: '8px' }} />
          ) : (
            histories
              ?.filter((f) => f.query.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
              .map((query) => (
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
