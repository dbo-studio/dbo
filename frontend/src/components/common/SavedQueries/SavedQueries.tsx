import api from '@/src/api';
import useAPI from '@/src/hooks/useApi.hook';
import { useSavedQueryStore } from '@/src/store/savedQueryStore/savedQuery.store';
import { Box, LinearProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import Search from '../../base/Search/Search';
import SavedQueryItem from './SavedQueryItem/SavedQueryItem';

export default function SavedQueries() {
  const [search, setSearch] = useState('');

  const { savedQueries, upsertQuery, deleteQuery } = useSavedQueryStore();

  const { request: getSavedQueries, pending: pending } = useAPI({
    apiMethod: api.savedQueries.getSavedQueries
  });

  const handleGetSavedQueriesFrom = async () => {
    try {
      const res = await getSavedQueries();
      res.forEach((item) => upsertQuery(item));
    } catch (error) {}
  };

  useEffect(() => {
    if (savedQueries == undefined) {
      handleGetSavedQueriesFrom();
    }
  }, []);

  useEffect(() => {
    if (savedQueries == undefined) {
      handleGetSavedQueriesFrom();
    }
  }, []);

  return (
    <Box>
      <Search onChange={(name) => setSearch(name)} />
      {pending ? (
        <LinearProgress style={{ marginTop: '8px' }} />
      ) : (
        savedQueries
          ?.filter((f) => f.name.includes(search))
          .map((query) => (
            <SavedQueryItem
              onChange={(q) => upsertQuery(q)}
              onDelete={() => deleteQuery(query.id)}
              onClick={() => {}}
              key={uuid()}
              query={query}
            />
          ))
      )}
    </Box>
  );
}
