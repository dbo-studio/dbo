import CodeEditor from '@/components/base/CodeEditor/CodeEditor.tsx';
import ResizableModal from '@/components/base/Modal/ResizableModal/ResizableModal.tsx';
import locales from '@/locales';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import { Box } from '@mui/material';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function QuickViewDialog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { getSelectedRows } = useDataStore();
  const [value, setValue] = useState<string | undefined>(undefined);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });

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
    <ResizableModal
      onClose={handleClose}
      open={searchParams.get('quick-look-editor') === 'true'}
      title={locales.quick_look_editor}
      onResize={(width: number, height: number): void => setDimensions({ width, height })}
    >
      <Box display={'flex'} flex={1} flexDirection={'column'}>
        <Box overflow={'auto'} display={'flex'} flex={1}>
          {value && (
            <CodeEditor
              width={dimensions.width}
              value={value}
              onChange={(value: string): void => {
                console.log(value);
              }}
            />
          )}
        </Box>
      </Box>
    </ResizableModal>
  );
}
