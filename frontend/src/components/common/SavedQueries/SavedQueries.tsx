import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useCurrentConnection } from '@/hooks';
import type { SavedQueryType } from '@/types';
import { Box, Button, ClickAwayListener, IconButton, LinearProgress, Stack, useTheme } from '@mui/material';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useRef, useState } from 'react';
import Search from '../../base/Search/Search';
import SavedQueryItem from './SavedQueryItem/SavedQueryItem';

export default function SavedQueries(): JSX.Element {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const currentConnection = useCurrentConnection();
  const listRef = useRef<HTMLDivElement>(null);

  type SavedQueryResponse = SavedQueryType[];

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status, refetch } = useInfiniteQuery<
    SavedQueryResponse,
    Error,
    { pages: SavedQueryResponse[]; pageParams: number[] }
  >({
    queryKey: ['savedQueries', currentConnection?.id],
    queryFn: async ({ pageParam = 1 }): Promise<SavedQueryResponse> => {
      const res = await api.savedQueries.getSavedQueries({
        connectionId: currentConnection?.id ?? 0,
        page: pageParam as number,
        count: 20
      });
      return res.reverse();
    },
    getNextPageParam: (lastPage, allPages): number | undefined => {
      return lastPage.length > 0 ? allPages.length : undefined;
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
    queryClient.setQueryData(['savedQueries', currentConnection?.id], (data: any) => ({
      pages: [data?.pages[0]],
      pageParams: [0]
    }));
  };

  const allSavedQueries = data?.pages.flat() ?? [];
  const filteredSavedQueries = allSavedQueries.filter((f) =>
    f.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())
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
                {filteredSavedQueries.map((query) => (
                  <SavedQueryItem
                    onChange={handleRefresh}
                    onClick={(): void => {
                      setSelected(query.id);
                    }}
                    key={query.id}
                    query={query}
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
