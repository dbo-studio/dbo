import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import locales from '@/locales';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Typography
} from '@mui/material';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';

type Props = { connectionId: number; containerId: string; onClose: () => void };
type Stage = { id: number; text: string; enabled: boolean };

const TEMPLATES: Record<string, string> = {
  $match: '{ "$match": { } }',
  $group: '{ "$group": { "_id": "$field", "count": { "$sum": 1 } } }',
  $sort: '{ "$sort": { "field": 1 } }',
  $project: '{ "$project": { "field": 1 } }',
  $limit: '{ "$limit": 10 }',
  $skip: '{ "$skip": 10 }',
  $unwind: '{ "$unwind": "$field" }',
  $lookup: '{ "$lookup": { "from": "collection", "localField": "a", "foreignField": "b", "as": "joined" } }',
  $count: '{ "$count": "total" }',
  $addFields: '{ "$addFields": { "field": "$other" } }'
};

let nextId = 1;

/** Parses every stage up to and including `upTo`; throws the 1-based number of the first bad one. */
function pipelineText(stages: Stage[], upTo: number): string {
  const parts: unknown[] = [];
  stages.slice(0, upTo + 1).forEach((s, i) => {
    if (!s.enabled) return;
    try {
      const v: unknown = JSON.parse(s.text);
      if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('stage');
      parts.push(v);
    } catch {
      throw new Error(String(i + 1));
    }
  });
  return JSON.stringify(parts);
}

/** Stage-by-stage aggregation builder: every stage can be previewed on its own output. */
export default function AggregateDialog({ connectionId, containerId, onClose }: Props): JSX.Element {
  const [stages, setStages] = useState<Stage[]>([]);
  const [addAnchor, setAddAnchor] = useState<HTMLElement | null>(null);
  const [docs, setDocs] = useState<string[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState('');
  const [previewAt, setPreviewAt] = useState(-1);
  const [loading, setLoading] = useState(false);

  const preview = async (list: Stage[], at: number): Promise<void> => {
    setPreviewAt(at);
    setError('');
    setLoading(true);
    try {
      const res = await api.nosql.aggregate(connectionId, containerId, pipelineText(list, at));
      setDocs(res.docs);
      setTruncated(res.truncated);
    } catch (e) {
      setDocs(null);
      const n = e instanceof Error ? Number(e.message) : NaN;
      setError(Number.isInteger(n) ? locales.nosql_agg_stage_invalid.replace('{n}', String(n)) : locales.action_failed);
    } finally {
      setLoading(false);
    }
  };

  const update = (id: number, patch: Partial<Stage>): void =>
    setStages((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const add = (op: string): void => {
    setAddAnchor(null);
    setStages((list) => [...list, { id: nextId++, text: TEMPLATES[op], enabled: true }]);
  };

  const copy = async (): Promise<void> => {
    try {
      const shell = `db.getCollection(${JSON.stringify(containerId.split('/').slice(1).join('/'))}).aggregate(${pipelineText(stages, stages.length - 1)})`;
      await navigator.clipboard.writeText(shell);
      toast.success(locales.nosql_agg_copied);
    } catch {
      toast.error(locales.action_failed);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth='lg' data-testid='aggregate-dialog'>
      <DialogTitle>{`${locales.nosql_aggregate}: ${containerId}`}</DialogTitle>
      <DialogContent sx={{ display: 'flex', gap: 2, minHeight: 420 }}>
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {stages.length === 0 && <Typography color='text.secondary'>{locales.nosql_agg_empty}</Typography>}
          {stages.map((s, i) => (
            <Box
              key={s.id}
              data-testid='agg-stage'
              sx={{ border: 1, borderColor: previewAt === i ? 'primary.main' : 'divider', borderRadius: 1, p: 1 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Checkbox
                  checked={s.enabled}
                  onChange={(e): void => update(s.id, { enabled: e.target.checked })}
                  inputProps={{ 'aria-label': `stage-${i + 1}-enabled` }}
                />
                <Typography variant='subtitle2'>{i + 1}</Typography>
                <Button
                  sx={{ ml: 'auto' }}
                  data-testid={`agg-preview-${i + 1}`}
                  onClick={(): void => void preview(stages, i)}
                >
                  {locales.nosql_agg_preview}
                </Button>
                <IconButton
                  aria-label={`remove-stage-${i + 1}`}
                  onClick={(): void => setStages((l) => l.filter((x) => x.id !== s.id))}
                >
                  <CustomIcon type='delete' size='s' />
                </IconButton>
              </Box>
              <FieldInput
                fullWidth
                multiline
                minRows={2}
                value={s.text}
                onChange={(e): void => update(s.id, { text: e.target.value })}
                inputProps={{ 'aria-label': `stage-${i + 1}-text`, style: { fontFamily: 'monospace' } }}
              />
            </Box>
          ))}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant='outlined' data-testid='agg-add' onClick={(e): void => setAddAnchor(e.currentTarget)}>
              {locales.nosql_agg_add_stage}
            </Button>
            <Button disabled={stages.length === 0} onClick={(): void => void copy()}>
              {locales.nosql_agg_copy}
            </Button>
          </Box>
          <Menu anchorEl={addAnchor} open={!!addAnchor} onClose={(): void => setAddAnchor(null)}>
            {Object.keys(TEMPLATES).map((op) => (
              <MenuItem key={op} onClick={(): void => add(op)}>
                {op}
              </MenuItem>
            ))}
          </Menu>
        </Box>
        <Box
          sx={{ flex: 1, minWidth: 0, borderLeft: 1, borderColor: 'divider', pl: 2, overflow: 'auto' }}
          data-testid='agg-output'
        >
          {loading && <Typography color='text.secondary'>{locales.loading}</Typography>}
          {error && <Typography color='error'>{error}</Typography>}
          {docs?.length === 0 && <Typography color='text.secondary'>{locales.nosql_agg_no_docs}</Typography>}
          {docs?.map((d, i) => (
            // Output rows have no identity of their own; the list is replaced whole on every preview.
            <Box
              component='pre'
              key={`${i}:${d.length}`}
              data-testid='agg-doc'
              sx={{
                m: 0,
                mb: 1,
                p: 1,
                typography: 'caption',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                bgcolor: 'action.hover',
                borderRadius: 1
              }}
            >
              {d.length > 2000 ? `${d.slice(0, 2000)}…` : d}
            </Box>
          ))}
          {truncated && (
            <Typography variant='caption' color='text.secondary'>
              {locales.nosql_agg_more}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{locales.close}</Button>
      </DialogActions>
    </Dialog>
  );
}
