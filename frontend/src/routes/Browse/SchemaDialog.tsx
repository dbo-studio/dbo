import api from '@/api';
import CodeEditor from '@/components/base/CodeEditor/CodeEditor';
import Segmented from '@/components/base/Segmented/Segmented';
import { variables } from '@/core/theme/variables';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import locales from '@/locales';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';

type Props = { connectionId: number; containerId: string; canEdit: boolean; onClose: () => void };

const LEVELS = ['off', 'moderate', 'strict'];
const ACTIONS = ['error', 'warn'];
const percent = (n: number, of: number): string => `${Math.round((n / Math.max(of, 1)) * 100)}%`;

function Analysis({ connectionId, containerId }: Omit<Props, 'canEdit' | 'onClose'>): JSX.Element {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['nosql', 'schema', connectionId, containerId],
    queryFn: () => api.nosql.schema(connectionId, containerId),
    retry: false
  });

  if (isLoading) return <Typography color='text.secondary'>{locales.loading}</Typography>;
  if (isError || !data) return <Typography color='error'>{locales.action_failed}</Typography>;

  return (
    <>
      <Typography variant='caption' color='text.secondary' data-testid='schema-sampled'>
        {locales.nosql_schema_sampled.replace('{n}', String(data.sampled))}
      </Typography>
      <Table size='small'>
        <TableHead>
          <TableRow>
            <TableCell>{locales.nosql_schema_field}</TableCell>
            <TableCell sx={{ width: 140 }}>{locales.nosql_schema_presence}</TableCell>
            <TableCell>{locales.nosql_schema_types}</TableCell>
            <TableCell>{locales.nosql_schema_top}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.fields.map((f) => (
            <TableRow key={f.path} data-testid='schema-row'>
              <TableCell sx={{ fontFamily: 'monospace' }}>{f.path}</TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      flex: 1,
                      height: 6,
                      borderRadius: variables.radius.small,
                      bgcolor: 'action.hover',
                      overflow: 'hidden'
                    }}
                  >
                    <Box sx={{ width: percent(f.count, data.sampled), height: '100%', bgcolor: 'primary.main' }} />
                  </Box>
                  <Typography variant='caption'>{percent(f.count, data.sampled)}</Typography>
                </Box>
              </TableCell>
              <TableCell>{f.types.map((t) => `${t.type} ${t.count}`).join(' · ')}</TableCell>
              <TableCell sx={{ fontFamily: 'monospace', maxWidth: 260 }}>
                <Typography variant='caption' noWrap component='div'>
                  {f.top.map((v) => `${v.value} (${v.count})`).join(', ')}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

function Validation({ connectionId, containerId, canEdit }: Omit<Props, 'onClose'>): JSX.Element {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['nosql', 'validator', connectionId, containerId],
    queryFn: () => api.nosql.getValidator(connectionId, containerId)
  });
  const [rule, setRule] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);

  if (isLoading) return <Typography color='text.secondary'>{locales.loading}</Typography>;
  if (isError || !data) return <Typography color='error'>{locales.action_failed}</Typography>;

  const text = rule ?? data.validator;

  const save = async (): Promise<void> => {
    if (text.trim()) {
      try {
        const v: unknown = JSON.parse(text);
        if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('rule');
      } catch {
        toast.error(locales.nosql_schema_invalid);
        return;
      }
    }
    try {
      const done = await withSafeModeRetry(async (confirmed) => {
        await api.nosql.setValidator(
          connectionId,
          containerId,
          { validator: text, level: level ?? data.level, action: action ?? data.action },
          confirmed
        );
        return true;
      });
      if (done) toast.success(locales.nosql_saved);
    } catch {
      toast.error(locales.action_failed);
    }
  };

  const pick = (opts: string[], value: string, set: (v: string) => void, testId: string): JSX.Element => (
    <Segmented value={value} onChange={set} testId={testId} options={opts.map((o) => ({ value: o, label: o }))} />
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant='caption' color='text.secondary'>
        {locales.nosql_schema_level_hint}
      </Typography>
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant='body2'>{locales.nosql_schema_level}</Typography>
          {pick(LEVELS, level ?? data.level, setLevel, 'validator-level')}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant='body2'>{locales.nosql_schema_action}</Typography>
          {pick(ACTIONS, action ?? data.action, setAction, 'validator-action')}
        </Box>
        {canEdit && (
          <Button
            variant='contained'
            sx={{ ml: 'auto' }}
            data-testid='validator-save'
            onClick={(): void => void save()}
          >
            {locales.nosql_schema_save}
          </Button>
        )}
      </Box>
      <Box sx={{ height: 300, border: 1, borderColor: 'divider' }} data-testid='validator-editor'>
        <CodeEditor value={text} onChange={setRule} language='json' editable={canEdit} />
      </Box>
    </Box>
  );
}

/** Field types and value frequencies from a sample, and the collection's validation rule. */
export default function SchemaDialog({ connectionId, containerId, canEdit, onClose }: Props): JSX.Element {
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
