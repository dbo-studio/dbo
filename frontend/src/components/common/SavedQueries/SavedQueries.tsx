import api from '@/api';
import type { SavedQueryResponseType } from '@/api/savedQuery/types';
import { useSavedQueryStore } from '@/store/savedQueryStore/savedQuery.store';
import { Box, ClickAwayListener, LinearProgress, useTheme } from '@mui/material';
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

  const { isLoading } = useQuery({
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

  return (
    <ClickAwayListener onClickAway={(): void => setSelected(null)}>
      <Box>
        <Search onChange={(name): void => setSearch(name)} />
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
