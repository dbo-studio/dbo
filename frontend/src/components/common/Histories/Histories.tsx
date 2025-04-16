import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import Search from '@/components/base/Search/Search';
import { useCurrentConnection } from '@/hooks';
import locales from '@/locales';
import type { HistoryType } from '@/types/History';
import { LoadingButton } from '@mui/lab';
import { Box, ClickAwayListener, IconButton, LinearProgress, Stack, useTheme } from '@mui/material';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import DeleteHistoryIcon from './DeleteHistoryIcon';
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
    queryFn: async ({ pageParam = 1 }): Promise<HistoryResponse> => {
      const res = await api.histories.getHistories({
        connectionId: currentConnection?.id ?? 0,
        page: pageParam as number,
        count: 20
      });
      return res;
    },
    getNextPageParam: (lastPage, allPages): number | undefined => {
      if (lastPage.length === 0) return undefined;
      return lastPage.length > 0 ? allPages.length + 1 : undefined;
    },
    enabled: !!currentConnection,
    initialPageParam: 1
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
      pageParams: [1]
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
            <DeleteHistoryIcon />
            <IconButton onClick={handleRefresh}>
              <CustomIcon size='s' type={'refresh'} />
            </IconButton>
          </Stack>
        </Box>

        <Box>
          <Box mt={theme.spacing(1)} ref={listRef} flex={1}>
            <Stack spacing={1}>
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
            </Stack>
          </Box>
        </Box>
        {hasNextPage && (
          <Box flex={1} display='flex' justifyContent='center' mt={2} mb={2}>
            <LoadingButton
              disabled={isFetchingNextPage}
              loading={isFetchingNextPage}
              onClick={handleLoadMore}
              fullWidth
              variant='contained'
            >
              <span>{locales.load_more}</span>
            </LoadingButton>
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
}
