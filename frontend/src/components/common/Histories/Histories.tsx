import api from '@/api';
import useAPI from '@/hooks/useApi.hook';
import { useHistoryStore } from '@/store/historyStore/history.store';
import { Box, ClickAwayListener, LinearProgress, useTheme } from '@mui/material';
import { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { v4 as uuid } from 'uuid';
import HistoryItem from './HistoryItem/HistoryItem';

export default function Histories() {
  const [selected, setSelected] = useState<number | null>(null);
  const theme = useTheme();
  const { histories, updateHistories } = useHistoryStore();

  const { request: getHistories, pending } = useAPI({
    apiMethod: api.histories.getHistories
  });

  const handleGetHistories = async () => {
    try {
      const res = await getHistories();
      updateHistories(res);
    } catch (error) {
      if (isAxiosError(error)) {
        toast.error(error.message);
      }
      console.log('🚀 ~ handleGetHistories ~ error:', error);
    }
  };

  useEffect(() => {
    handleGetHistories().then();
  }, []);

  return (
    <ClickAwayListener onClickAway={() => setSelected(null)}>
      <Box>
        <Box mt={theme.spacing(1)}>
          {pending ? (
            <LinearProgress style={{ marginTop: '8px' }} />
          ) : (
            histories?.map((query) => (
              <HistoryItem
                onClick={() => {
                  setSelected(query.id);
                }}
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
