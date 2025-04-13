import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import Search from '@/components/base/Search/Search';
import { useCurrentConnection } from '@/hooks';
import type { HistoryType } from '@/types/History';
import { Box, Button, ClickAwayListener, IconButton, LinearProgress, Stack, useTheme } from '@mui/material';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type JSX, useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import HistoryItem from './HistoryItem/HistoryItem';

export default function Histories(): JSX.Element {
  const theme = useTheme();
  const [selected, setSelected] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const currentConnection = useCurrentConnection();

  const { isPending, data, isFetching, isPlaceholderData } = useQuery({
    queryKey: ['histories', currentConnection?.id, page],
    queryFn: (): Promise<HistoryType[]> =>
      api.histories.getHistories({ connectionId: currentConnection?.id, page, count: 10 }),
    placeholderData: keepPreviousData,
    enabled: !!currentConnection
  });

  const handleLoadMore = async (): Promise<void> => {
    if (!isPlaceholderData && (data?.length ?? 0) > 0) setPage((old) => old + 1);
  };

  const handleRefresh = async (): Promise<void> => {
    setPage(1);
    // await refetch({ queryKey: ['histories', currentConnection?.id, 1] });
    // setHasMore(true);
  };

  useEffect(() => {
    console.log(data);
  }, [data]);

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
          {isFetching && page === 1 ? (
            <LinearProgress style={{ marginTop: '8px' }} />
          ) : (
            <>
              {data
                ?.filter((f) => f.query.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
                .map((query) => (
                  <HistoryItem
                    onClick={(): void => setSelected(query.id)}
                    key={uuid()}
                    history={query}
                    selected={selected === query.id}
                  />
                ))}

              {(data?.length ?? 0) > 0 && (
                <Box display='flex' justifyContent='center' mt={2}>
                  <Button
                    fullWidth
                    variant='contained'
                    onClick={handleLoadMore}
                    disabled={isPlaceholderData || isFetching}
                  >
                    {isPending ? 'Loading...' : 'Load More'}
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>
    </ClickAwayListener>
  );
}
