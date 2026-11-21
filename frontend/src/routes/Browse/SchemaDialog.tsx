import Segmented from '@/components/base/Segmented/Segmented';
import locales from '@/locales';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { type JSX, useState } from 'react';
import Analysis from './SchemaDialog/Analysis/Analysis';
import Validation from './SchemaDialog/Validation/Validation';

type SchemaDialogProps = { connectionId: number; containerId: string; canEdit: boolean; onClose: () => void };

export default function SchemaDialog({ connectionId, containerId, canEdit, onClose }: SchemaDialogProps): JSX.Element {
  const [tab, setTab] = useState<'analysis' | 'validation'>('analysis');

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth='lg' data-testid='schema-dialog'>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {`${locales.nosql_schema}: ${containerId}`}
        <Segmented
          value={tab}
          onChange={setTab}
          testId='schema-tab'
          options={[
            { value: 'analysis', label: locales.nosql_schema_analysis },
            { value: 'validation', label: locales.nosql_schema_validation }
          ]}
        />
      </DialogTitle>
      <DialogContent sx={{ minHeight: 360 }}>
        {tab === 'analysis' ? (
          <Analysis connectionId={connectionId} containerId={containerId} />
        ) : (
          <Validation connectionId={connectionId} containerId={containerId} canEdit={canEdit} />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{locales.close}</Button>
      </DialogActions>
    </Dialog>
  );
}
