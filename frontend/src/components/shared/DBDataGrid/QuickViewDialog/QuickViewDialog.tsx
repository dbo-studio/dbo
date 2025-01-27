import CodeEditor from '@/components/base/CodeEditor/CodeEditor.tsx';
import Modal from '@/components/base/Modal/Modal';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import { Box, Button } from '@mui/material';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function QuickViewDialog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { getSelectedRows } = useDataStore();
  const [value, setValue] = useState<string | undefined>(undefined);

  const handleClose = () => {
    searchParams.delete('quick-look-editor');
    setSearchParams(searchParams);
  };

  useEffect(() => {
    const rows = getSelectedRows();
    if (rows.length === 0 || searchParams.get('quick-look-editor') !== 'true') {
      return;
    }

    const row = rows[rows.length - 1];
    if (!row.selectedCell || !row.selectedColumn) return;

    setValue(row.selectedCell.toString());
  }, [searchParams.get('quick-look-editor')]);

  return (
    <Modal open={searchParams.get('quick-look-editor') === 'true'} title={locales.new_connection}>
      <Box display={'flex'} flex={1} flexDirection={'column'}>
        <Box display={'flex'} flex={1}>
          {value && (
            <CodeEditor
              value={value}
              onChange={(value: string): void => {
                console.log(value);
              }}
            />
          )}
        </Box>

        <Button onClick={handleClose}>Close</Button>
      </Box>
    </Modal>
  );
}
