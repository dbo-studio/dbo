import api from '@/src/api';
import useAPI from '@/src/hooks/useApi.hook';
import { useDataStore } from '@/src/store/dataStore/data.store';
import { useTabStore } from '@/src/store/tabStore/tab.store';
import { Box, IconButton, Stack } from '@mui/material';
import CustomIcon from '../../base/CustomIcon/CustomIcon';
import LoadingIconButton from '../../base/LoadingIconButton/LoadingIconButton';

export default function StatusBarActions() {
  const { selectedTab } = useTabStore();
  const { addEmptyRow } = useDataStore();

  const { request: updateQuery, pending: updateQueryPending } = useAPI({
    apiMethod: api.query.updateQuery
  });

  const handleSave = async () => {
    if (selectedTab?.editedRows.length == 0) {
      return;
    }
    await updateQuery(selectedTab?.editedRows);
  };

  const handleAddRow = () => {
    addEmptyRow();
  };

  return (
    <Stack direction={'row'} mb={'5px'} justifyContent={'space-between'} width={208}>
      <Box>
        <IconButton onClick={handleAddRow}>
          <CustomIcon type='plus' size='s' />
        </IconButton>

        <IconButton>
          <CustomIcon type='mines' size='s' />
        </IconButton>
      </Box>
      <Box ml={1} mr={1}>
        <LoadingIconButton loading={updateQueryPending} disabled={updateQueryPending} onClick={handleSave}>
          <CustomIcon type='check' size='s' />
        </LoadingIconButton>
        <IconButton>
          <CustomIcon type='close' size='s' />
        </IconButton>
      </Box>
      <Box>
        <IconButton>
          <CustomIcon type='refresh' size='s' />
        </IconButton>

        <IconButton>
          <CustomIcon type='stop' size='s' />
        </IconButton>
      </Box>
    </Stack>
  );
}
