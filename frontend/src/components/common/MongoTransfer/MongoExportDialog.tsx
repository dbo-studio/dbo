import api from '@/api';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import Modal from '@/components/base/Modal/Modal';
import ModalFooter from '@/components/base/Modal/ModalFooter/ModalFooter';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import { ExportModalContainerStyled } from '@/components/common/ExportModal/ExportModal.styled';
import { tools } from '@/core/utils/tools';
import locales from '@/locales';
import { Box, Button, Typography } from '@mui/material';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';

type Format = 'json' | 'ndjson' | 'csv';

const FORMATS: { value: Format; label: string; hint: string }[] = [
  { value: 'json', label: 'JSON', hint: locales.mongo_export_json_hint },
  { value: 'ndjson', label: 'NDJSON', hint: locales.mongo_export_ndjson_hint },
  { value: 'csv', label: 'CSV', hint: locales.mongo_export_csv_hint }
];

type Props = { connectionId: number; containerId: string; onClose: () => void };

/** Same dialog as the SQL export (hint, format, footer); a collection also takes an optional query. */
export default function MongoExportDialog({ connectionId, containerId, onClose }: Props): JSX.Element {
  const [format, setFormat] = useState<Format>('json');
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const collection = containerId.split('/').slice(1).join('/');

  const run = async (): Promise<void> => {
    setBusy(true);
    try {
      const blob = await api.nosql.exportCollection(connectionId, containerId, filter.trim() || undefined, format);
      tools.fileDownload(blob, `${collection}.${format}`);
      onClose();
    } catch {
      toast.error(locales.action_failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title={locales.export_options} size='sm' onClose={onClose}>
      <ExportModalContainerStyled
        component='form'
        data-testid='mongo-export-dialog'
        onSubmit={(e): void => {
          e.preventDefault();
          e.stopPropagation();
          void run();
        }}
      >
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant='caption' color='textSecondary' component='p'>
            {locales.mongo_export_scope_hint.replace('{name}', collection)}
          </Typography>
          <Box>
            <SelectInput
              emptylabel={locales.no_column_found}
              value={format}
              testId='mongo-export-format'
              onChange={(e): void => setFormat((e as SelectInputOption).value as Format)}
              label={locales.format}
              options={FORMATS.map(({ value, label }) => ({ value, label }))}
            />
            <Typography variant='caption' color='textSecondary' component='p'>
              {FORMATS.find((f) => f.value === format)?.hint}
            </Typography>
          </Box>
          <Box>
            <FieldInput
              fullWidth
              multiline
              minRows={3}
              label={locales.mongo_export_filter}
              placeholder='{ "status": "active" }'
              value={filter}
              onChange={(e): void => setFilter(e.target.value)}
              inputProps={{ 'aria-label': 'mongo-export-filter', 'data-testid': 'mongo-export-filter' }}
            />
            <Typography variant='caption' color='textSecondary' component='p'>
              {locales.mongo_export_filter_hint}
            </Typography>
          </Box>
        </Box>
        <ModalFooter>
          <Button type='button' onClick={onClose}>
            {locales.cancel}
          </Button>
          <Button type='submit' variant='contained' disabled={busy} data-testid='mongo-export-run'>
            <span>{locales.export}</span>
          </Button>
        </ModalFooter>
      </ExportModalContainerStyled>
    </Modal>
  );
}
