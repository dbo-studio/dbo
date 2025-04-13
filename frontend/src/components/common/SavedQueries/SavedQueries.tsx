import api from '@/api';
import type { SavedQueryResponseType } from '@/api/savedQuery/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useCurrentConnection } from '@/hooks';
import { useSavedQueryStore } from '@/store/savedQueryStore/savedQuery.store';
import { Box, Button, ClickAwayListener, IconButton, LinearProgress, Stack, useTheme } from '@mui/material';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { v4 as uuid } from 'uuid';
import Search from '../../base/Search/Search';
import SavedQueryItem from './SavedQueryItem/SavedQueryItem';

export default function SavedQueries(): JSX.Element {
  const theme = useTheme();
  const currentConnection = useCurrentConnection();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { savedQueries, upsertQuery, deleteQuery } = useSavedQueryStore();

  // const { isLoading, refetch } = useQuery({
  //   queryKey: ['savedQueries', currentConnection?.id],
  //   queryFn: async (): Promise<SavedQueryResponseType[]> => {
  //     if (!currentConnection) return [];
  //     const res = await api.savedQueries.getSavedQueries({ connectionId: currentConnection?.id, page, count: 1 });
  //     if (res.length === 0) setHasMore(false);
  //     for (const item of res) {
  //       upsertQuery(item);
  //     }
  //     return res;
  //   },
  //   enabled: savedQueries === undefined && !!currentConnection
  // });

  const { isPending, data, isFetching, isPlaceholderData } = useQuery({
    queryKey: ['savedQueries', currentConnection?.id, page],
    queryFn: (): Promise<SavedQueryResponseType[]> =>
      api.savedQueries.getSavedQueries({ connectionId: currentConnection?.id, page, count: 1 }),
    placeholderData: keepPreviousData,
    enabled: !!currentConnection
  });

  const handleLoadMore = async (): Promise<void> => {
    if (!isPlaceholderData && (data?.length ?? 0) > 0) setPage((old) => old + 1);
    // const nextPage = page + 1;
    // setPage(nextPage);
    // await refetch({ queryKey: ['savedQueries', currentConnection?.id, nextPage] });
  };

  const handleRefresh = async (): Promise<void> => {
    await refetch({ queryKey: ['savedQueries', currentConnection?.id, 1] });
    setPage(1);
    setHasMore(true);
  };

  return (
    <ClickAwayListener onClickAway={(): void => setSelected(null)}>
      <Box mt={1}>
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
        <Box mt={theme.spacing(1)}>
          {isPending ? (
            <LinearProgress style={{ marginTop: '8px' }} />
          ) : (
            <>
              {data
                ?.filter((f) => f.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
                .map((query) => (
                  <SavedQueryItem
                    onChange={(q): void => upsertQuery(q)}
                    onDelete={(): void => deleteQuery(query.id)}
                    onClick={(): void => {
                      setSelected(query.id);
                    }}
                    key={uuid()}
                    query={query}
                    selected={selected === query.id}
                  />
                ))}
              {data && (
                <Box display='flex' justifyContent='center' mt={2}>
                  <Button fullWidth variant='outlined' onClick={handleLoadMore} disabled={isPending}>
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
