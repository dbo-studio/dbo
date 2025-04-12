import api from '@/api';
import type { SavedQueryResponseType } from '@/api/savedQuery/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useSavedQueryStore } from '@/store/savedQueryStore/savedQuery.store';
import { Box, ClickAwayListener, IconButton, LinearProgress, Stack, useTheme } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { v4 as uuid } from 'uuid';
import Search from '../../base/Search/Search';
import SavedQueryItem from './SavedQueryItem/SavedQueryItem';

export default function SavedQueries(): JSX.Element {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const theme = useTheme();
  const { savedQueries, upsertQuery, deleteQuery } = useSavedQueryStore();

  const { isLoading, refetch } = useQuery({
    queryKey: ['savedQueries'],
    queryFn: async (): Promise<SavedQueryResponseType[]> => {
      const res = await api.savedQueries.getSavedQueries();
      for (const item of res) {
        upsertQuery(item);
      }
      return res;
    },
    enabled: savedQueries === undefined
  });

  const handleRefresh = async (): Promise<void> => {
    await refetch();
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
          {isLoading ? (
            <LinearProgress style={{ marginTop: '8px' }} />
          ) : (
            savedQueries
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
              ))
          )}
        </Box>
      </Box>
    </ClickAwayListener>
  );
}
