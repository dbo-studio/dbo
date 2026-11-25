import DataGrid from '@/components/common/DataGrid/DataGrid';
import Modal from '@/components/base/Modal/Modal';
import locales from '@/locales';
import type { RunQueryResponseType } from '@/api/query/types';
import { Box, Button } from '@mui/material';

export default function SqlExplainDialog({ plan, onClose }: { plan: RunQueryResponseType; onClose: () => void }) {
  return (
    <Modal
      open
      onClose={onClose}
      title={locales.nosql_explain}
      size='xl'
      footer={<Button onClick={onClose}>{locales.close}</Button>}
    >
      <Box sx={{ height: 380 }} data-testid='sql-explain'>
        <DataGrid
          rows={plan.data.map((row, index) => ({ ...row, dbo_index: index }))}
          columns={plan.columns}
          loading={false}
          editable={false}
          standalone
        />
      </Box>
    </Modal>
  );
}
