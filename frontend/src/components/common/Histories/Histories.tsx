import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import Search from '@/components/base/Search/Search';
import { useCurrentConnection } from '@/hooks';
import type { HistoryType } from '@/types/History';
import { Box, Button, ClickAwayListener, IconButton, LinearProgress, Stack, useTheme } from '@mui/material';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import HistoryItem from './HistoryItem/HistoryItem';

type HistoryResponse = HistoryType[];

export default function Histories(): JSX.Element {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const currentConnection = useCurrentConnection();
  const listRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status, refetch } = useInfiniteQuery<
    HistoryResponse,
    Error,
    { pages: HistoryResponse[]; pageParams: number[] }
  >({
    queryKey: ['histories', currentConnection?.id],
    queryFn: async ({ pageParam = 0 }): Promise<HistoryResponse> => {
      const res = await api.histories.getHistories({
        connectionId: currentConnection?.id ?? 0,
        page: pageParam as number,
        count: 20
      });
      return res.reverse(); // Reverse the order of items
    },
    getNextPageParam: (lastPage, allPages): number | undefined => {
      return lastPage.length > 0 ? allPages.length : undefined;
    },
    enabled: !!currentConnection,
    initialPageParam: 0
  });

  const handleLoadMore = (): void => {
    const currentScrollPos = listRef.current?.scrollTop;
    fetchNextPage().then(() => {
      if (listRef.current && currentScrollPos !== undefined) {
        listRef.current.scrollTop = currentScrollPos;
      }
    });
  };

  const handleRefresh = async (): Promise<void> => {
    await refetch();
    queryClient.setQueryData(['histories', currentConnection?.id], (data: any) => ({
      pages: [data?.pages[0]],
      pageParams: [0]
    }));
  };

  const allHistories = data?.pages.flat() ?? [];
  const filteredHistories = allHistories.filter((f) =>
    f.query.toLocaleLowerCase().includes(search.toLocaleLowerCase())
  );

  return (
    <ClickAwayListener onClickAway={(): void => setSelected(null)}>
      <Box mt={1} display={'flex'} flexDirection={'column'}>
        <Box>
          <Stack spacing={1} direction={'row'} alignContent={'center'} justifyContent={'center'} alignItems={'center'}>
            <Box flex={1}>
              <Search onChange={(name): void => setSearch(name)} />
            </Box>
            <IconButton onClick={handleRefresh}>
              <CustomIcon size='s' type={'refresh'} />
            </IconButton>
          </Stack>
        </Box>

        <Box mt={theme.spacing(1)} ref={listRef} flex={1}>
          <Box>
            {status === 'pending' ? (
              <LinearProgress style={{ marginTop: '8px' }} />
            ) : (
              <>
                {filteredHistories.map((query) => (
                  <HistoryItem
                    onClick={(): void => setSelected(query.id)}
                    key={uuid()}
                    history={query}
                    selected={selected === query.id}
                  />
                ))}
              </>
            )}
          </Box>
        </Box>
        {hasNextPage && (
          <Box flex={1} display='flex' justifyContent='center' mt={2} mb={2}>
            <Button fullWidth variant='contained' onClick={handleLoadMore} disabled={isFetchingNextPage}>
              {isFetchingNextPage ? 'Loading...' : 'Load More'}
            </Button>
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
}
