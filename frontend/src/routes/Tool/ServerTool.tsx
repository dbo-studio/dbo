import api from '@/api';
import type { NoSQLChangeMessage, NoSQLCollectionOptions } from '@/api/nosql/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import Segmented from '@/components/base/Segmented/Segmented';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import { formatBytes } from '@/core/utils/formatBytes';
import { tools } from '@/core/utils/tools';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type Props = { connectionId: number };
type Tab = 'status' | 'operations' | 'databases' | 'users' | 'gridfs' | 'changes';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const pick = (v: unknown): string => (v as SelectInputOption).value as string;

const uptime = (secs: number): string => {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m ${secs % 60}s`;
};

function Facts({ rows }: { rows: [string, string][] }): JSX.Element {
  return (
    <Table size='small' sx={{ maxWidth: 520 }}>
      <TableBody>
        {rows.map(([k, v]) => (
          <TableRow key={k}>
            <TableCell>{k}</TableCell>
            <TableCell align='right' data-testid={`server-fact-${k}`} sx={{ fontFamily: MONO }}>
              {v}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Status({ connectionId }: Props): JSX.Element {
  const { data, isError } = useQuery({
    queryKey: ['server', 'status', connectionId],
    queryFn: () => api.nosql.serverStatus(connectionId),
    refetchInterval: 5000
  });
  if (isError) return <Typography color='error'>{locales.action_failed}</Typography>;
  if (!data) return <Typography color='text.secondary'>{locales.loading}</Typography>;

  const group = (m: Record<string, number>): string =>
    Object.entries(m)
      .map(([k, v]) => `${k} ${v.toLocaleString()}`)
      .join(' · ');

  return (
    <Facts
      rows={[
        [locales.server_version, data.version],
        [locales.server_host, data.host],
        [locales.server_uptime, uptime(data.uptimeSecs)],
        [locales.server_replica, data.replica || locales.server_standalone],
        [locales.server_connections, group(data.connections)],
        [locales.server_memory, group(data.memoryMb)],
        [locales.server_opcounters, group(data.opCounters)]
      ]}
    />
  );
}

function Operations({ connectionId }: Props): JSX.Element {
  const confirmDanger = useConfirmModalStore((s) => s.danger);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['server', 'operations', connectionId],
    queryFn: () => api.nosql.serverOperations(connectionId),
    refetchInterval: 3000
  });

  const kill = (id: string): void =>
    confirmDanger(locales.server_kill, locales.server_kill_confirm.replace('{id}', id), () => {
      // The dialog above is the confirmation; a locked connection still refuses.
      void api.nosql
        .serverKill(connectionId, id, true)
        .then(() => qc.invalidateQueries({ queryKey: ['server', 'operations', connectionId] }))
        .catch(() => toast.error(locales.action_failed));
    });

  if (!data) return <Typography color='text.secondary'>{locales.loading}</Typography>;
  if (data.length === 0) return <Typography color='text.secondary'>{locales.server_no_operations}</Typography>;

  return (
    <Table size='small'>
      <TableHead>
        <TableRow>
          <TableCell>{locales.server_op}</TableCell>
          <TableCell>{locales.server_namespace}</TableCell>
          <TableCell>{locales.server_running_for}</TableCell>
          <TableCell>{locales.server_client}</TableCell>
          <TableCell>{locales.server_command}</TableCell>
          <TableCell />
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map((op) => (
          <TableRow key={op.id} data-testid='server-operation'>
            <TableCell>{op.op}</TableCell>
            <TableCell>{op.namespace}</TableCell>
            <TableCell>{op.secs}</TableCell>
            <TableCell>{op.client}</TableCell>
            <TableCell sx={{ fontFamily: MONO, maxWidth: 360, wordBreak: 'break-all' }}>{op.command}</TableCell>
            <TableCell align='right'>
              <Button color='error' onClick={(): void => kill(op.id)}>
                {locales.server_kill}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DropDatabaseDialog({
  name,
  onClose,
  onConfirm
}: {
  name: string;
  onClose: () => void;
  onConfirm: () => void;
}): JSX.Element {
  const [typed, setTyped] = useState('');

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth='xs' data-testid='drop-database-dialog'>
      <DialogTitle>{locales.server_drop_database}</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 1.5 }}>{locales.server_drop_database_confirm.replace('{name}', name)}</Typography>
        <FieldInput
          fullWidth
          autoFocus
          value={typed}
          onChange={(e): void => setTyped(e.target.value)}
          inputProps={{ 'aria-label': 'confirm-database-name' }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{locales.cancel}</Button>
        <Button color='error' variant='contained' disabled={typed !== name} onClick={onConfirm}>
          {locales.server_drop_database}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const KINDS: NoSQLCollectionOptions['kind'][] = ['collection', 'capped', 'timeseries', 'view'];
const KIND_LABEL: Record<NoSQLCollectionOptions['kind'], string> = {
  collection: locales.server_kind_collection,
  capped: locales.server_kind_capped,
  timeseries: locales.server_kind_timeseries,
  view: locales.server_kind_view
};

function Databases({ connectionId }: Props): JSX.Element {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [dropping, setDropping] = useState<string | null>(null);
  const [newDb, setNewDb] = useState('');
  const [firstColl, setFirstColl] = useState('');
  const [name, setName] = useState('');
  const [opts, setOpts] = useState<NoSQLCollectionOptions>({ kind: 'collection' });

  const dbs = useQuery({
    queryKey: ['server', 'databases', connectionId],
    queryFn: () => api.nosql.serverDatabases(connectionId)
  });
  const colls = useQuery({
    queryKey: ['server', 'collections', connectionId, selected],
    queryFn: () => api.nosql.serverCollections(connectionId, selected ?? ''),
    enabled: !!selected
  });

  const run = async (action: (confirmed?: boolean) => Promise<void>, after: () => void): Promise<void> => {
    try {
      const done = await withSafeModeRetry(async (confirmed) => {
        await action(confirmed);
        return true;
      });
      if (done) after();
    } catch {
      toast.error(locales.action_failed);
    }
  };

  const refreshDbs = (): void => void qc.invalidateQueries({ queryKey: ['server', 'databases', connectionId] });
  const refreshColls = (): void => {
    void qc.invalidateQueries({ queryKey: ['server', 'collections', connectionId, selected] });
    refreshDbs();
  };

  return (
    <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <Box sx={{ minWidth: 340, flex: 1 }}>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>{locales.server_database}</TableCell>
              <TableCell>{locales.server_size}</TableCell>
              <TableCell>{locales.server_collections}</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {(dbs.data ?? []).map((d) => (
              <TableRow
                key={d.name}
                hover
                selected={selected === d.name}
                sx={{ cursor: 'pointer' }}
                onClick={(): void => setSelected(d.name)}
                data-testid='server-database'
              >
                <TableCell>{d.name}</TableCell>
                <TableCell>{formatBytes(d.sizeOnDisk)}</TableCell>
                <TableCell>{d.collections}</TableCell>
                <TableCell align='right'>
                  {!['admin', 'local', 'config'].includes(d.name) && (
                    <Button
                      color='error'
                      aria-label={`drop-${d.name}`}
                      onClick={(e): void => {
                        e.stopPropagation();
                        setDropping(d.name);
                      }}
                    >
                      {locales.delete}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Typography variant='subtitle2' sx={{ mt: 2, mb: 0.5 }}>
          {locales.server_create_database}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FieldInput
            placeholder={locales.server_database}
            value={newDb}
            onChange={(e): void => setNewDb(e.target.value)}
            inputProps={{ 'aria-label': 'new-database-name' }}
          />
          <FieldInput
            placeholder={locales.server_first_collection}
            value={firstColl}
            onChange={(e): void => setFirstColl(e.target.value)}
            inputProps={{ 'aria-label': 'new-database-collection' }}
          />
          <Button
            variant='contained'
            disabled={!newDb || !firstColl}
            onClick={(): void =>
              void run(
                (c) => api.nosql.serverCreateDatabase(connectionId, newDb, firstColl, c),
                () => {
                  setNewDb('');
                  setFirstColl('');
                  refreshDbs();
                }
              )
            }
          >
            {locales.server_create_database}
          </Button>
        </Box>
      </Box>

      {selected && (
        <Box sx={{ minWidth: 340, flex: 1 }} data-testid='server-collections'>
          <Typography variant='subtitle2' sx={{ mb: 0.5 }}>{`${locales.server_collections}: ${selected}`}</Typography>
          <Table size='small'>
            <TableBody>
              {(colls.data ?? []).map((c) => (
                <TableRow key={c.name} data-testid='server-collection'>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.capped ? locales.server_kind_capped : c.type}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Typography variant='subtitle2' sx={{ mt: 2, mb: 0.5 }}>
            {locales.server_create_collection}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FieldInput
              placeholder={locales.name}
              value={name}
              onChange={(e): void => setName(e.target.value)}
              inputProps={{ 'aria-label': 'new-collection-name' }}
            />
            <SelectInput
              label={locales.server_kind}
              testId='new-collection-kind'
              value={opts.kind}
              options={KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))}
              onChange={(o): void => setOpts({ kind: pick(o) as NoSQLCollectionOptions['kind'] })}
            />
            {opts.kind === 'capped' && (
              <FieldInput
                placeholder={locales.server_capped_bytes}
                value={opts.cappedBytes ?? ''}
                onChange={(e): void => setOpts({ ...opts, cappedBytes: Number(e.target.value.replace(/\D/g, '')) })}
                inputProps={{ 'aria-label': 'capped-bytes' }}
              />
            )}
            {opts.kind === 'timeseries' && (
              <>
                <FieldInput
                  placeholder={locales.server_time_field}
                  value={opts.timeField ?? ''}
                  onChange={(e): void => setOpts({ ...opts, timeField: e.target.value })}
                  inputProps={{ 'aria-label': 'time-field' }}
                />
                <FieldInput
                  placeholder={locales.server_meta_field}
                  value={opts.metaField ?? ''}
                  onChange={(e): void => setOpts({ ...opts, metaField: e.target.value })}
                  inputProps={{ 'aria-label': 'meta-field' }}
                />
                <SelectInput
                  label={locales.server_granularity}
                  testId='granularity'
                  value={opts.granularity ?? 'seconds'}
                  options={['seconds', 'minutes', 'hours'].map((g) => ({ value: g, label: g }))}
                  onChange={(o): void => setOpts({ ...opts, granularity: pick(o) })}
                />
              </>
            )}
            {opts.kind === 'view' && (
              <>
                <FieldInput
                  placeholder={locales.server_view_on}
                  value={opts.viewOn ?? ''}
                  onChange={(e): void => setOpts({ ...opts, viewOn: e.target.value })}
                  inputProps={{ 'aria-label': 'view-on' }}
                />
                <FieldInput
                  multiline
                  minRows={2}
                  placeholder={locales.server_pipeline}
                  value={opts.pipeline ?? ''}
                  onChange={(e): void => setOpts({ ...opts, pipeline: e.target.value })}
                  inputProps={{ 'aria-label': 'view-pipeline' }}
                />
              </>
            )}
            <Button
              variant='contained'
              disabled={!name}
              onClick={(): void =>
                void run(
                  (c) => api.nosql.serverCreateCollection(connectionId, selected, name, opts, c),
                  () => {
                    setName('');
                    refreshColls();
                  }
                )
              }
            >
              {locales.server_create_collection}
            </Button>
          </Box>
        </Box>
      )}

      {dropping && (
        <DropDatabaseDialog
          name={dropping}
          onClose={(): void => setDropping(null)}
          onConfirm={(): void => {
            const target = dropping;
            setDropping(null);
            void run(
              () => api.nosql.serverDropDatabase(connectionId, target, true),
              () => {
                if (selected === target) setSelected(null);
                refreshDbs();
              }
            );
          }}
        />
      )}
    </Box>
  );
}

function Users({ connectionId }: Props): JSX.Element {
  const { data, isError, error } = useQuery({
    queryKey: ['server', 'users', connectionId],
    queryFn: () => api.nosql.serverUsers(connectionId),
    retry: false
  });
  if (isError)
    return (
      <Typography color='error'>
        {(error as { response?: { data?: { message?: string } } }).response?.data?.message ?? locales.action_failed}
      </Typography>
    );
  if (!data) return <Typography color='text.secondary'>{locales.loading}</Typography>;
  if (data.length === 0) return <Typography color='text.secondary'>{locales.server_users_empty}</Typography>;

  return (
    <Table size='small'>
      <TableHead>
        <TableRow>
          <TableCell>{locales.server_user}</TableCell>
          <TableCell>{locales.server_database}</TableCell>
          <TableCell>{locales.server_roles}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map((u) => (
          <TableRow key={`${u.db}.${u.user}`} data-testid='server-user'>
            <TableCell>{u.user}</TableCell>
            <TableCell>{u.db}</TableCell>
            <TableCell>{(u.roles ?? []).join(', ')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function GridFs({ connectionId }: Props): JSX.Element {
  const qc = useQueryClient();
  const confirmDanger = useConfirmModalStore((s) => s.danger);
  const [db, setDb] = useState('');
  const [bucket, setBucket] = useState('');
  const dbs = useQuery({
    queryKey: ['server', 'databases', connectionId],
    queryFn: () => api.nosql.serverDatabases(connectionId)
  });
  const buckets = useQuery({
    queryKey: ['server', 'gridfs-buckets', connectionId, db],
    queryFn: () => api.nosql.gridfsBuckets(connectionId, db),
    enabled: !!db
  });
  const bucketName = bucket || buckets.data?.[0] || '';
  const files = useQuery({
    queryKey: ['server', 'gridfs-files', connectionId, db, bucketName],
    queryFn: () => api.nosql.gridfsFiles(connectionId, db, bucketName),
    enabled: !!db && !!bucketName
  });

  const download = async (id: string, filename: string): Promise<void> => {
    try {
      tools.fileDownload(await api.nosql.gridfsDownload(connectionId, db, bucketName, id), filename || id);
    } catch {
      toast.error(locales.action_failed);
    }
  };

  const remove = (id: string, filename: string): void =>
    confirmDanger(
      locales.server_delete_file,
      locales.server_delete_file_confirm.replace('{name}', filename || id),
      () => {
        void withSafeModeRetry(async (confirmed) => {
          await api.nosql.gridfsDelete(connectionId, db, bucketName, id, confirmed);
          return true;
        })
          .then(() => qc.invalidateQueries({ queryKey: ['server', 'gridfs-files', connectionId, db, bucketName] }))
          .catch(() => toast.error(locales.action_failed));
      }
    );

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, maxWidth: 560 }}>
        <Box sx={{ flex: 1 }}>
          <SelectInput
            label={locales.server_database}
            testId='gridfs-database'
            value={db}
            options={(dbs.data ?? []).map((d) => ({ value: d.name, label: d.name }))}
            onChange={(o): void => {
              setDb(pick(o));
              setBucket('');
            }}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <SelectInput
            label={locales.server_bucket}
            testId='gridfs-bucket'
            value={bucketName}
            options={(buckets.data ?? []).map((b) => ({ value: b, label: b }))}
            onChange={(o): void => setBucket(pick(o))}
          />
        </Box>
      </Box>
      {db && buckets.data?.length === 0 && <Typography color='text.secondary'>{locales.server_no_buckets}</Typography>}
      {(files.data?.length ?? 0) > 0 && (
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>{locales.server_file}</TableCell>
              <TableCell>{locales.server_size}</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {files.data?.map((f) => (
              <TableRow key={f.id} data-testid='gridfs-file'>
                <TableCell>{f.filename || f.id}</TableCell>
                <TableCell>{formatBytes(f.length)}</TableCell>
                <TableCell align='right'>
                  <Button onClick={(): void => void download(f.id, f.filename)}>{locales.server_download}</Button>
                  <Button color='error' onClick={(): void => remove(f.id, f.filename)}>
                    {locales.delete}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}

const MAX_CHANGES = 500;

function Changes({ connectionId }: Props): JSX.Element {
  const [container, setContainer] = useState('');
  const [live, setLive] = useState(false);
  const [events, setEvents] = useState<(NoSQLChangeMessage & { n: number })[]>([]);
  const abort = useRef<AbortController | null>(null);
  const counter = useRef(0);

  const stop = (): void => {
    abort.current?.abort();
    abort.current = null;
    setLive(false);
  };

  // Leaving the tab closes the stream, which makes the server stop watching.
  useEffect(() => (): void => abort.current?.abort(), []);

  const start = async (): Promise<void> => {
    stop();
    const controller = new AbortController();
    abort.current = controller;
    setEvents([]);
    setLive(true);
    try {
      await api.nosql.changeStream(connectionId, container, controller.signal, (msg) => {
        if (msg.type === 'ping') return;
        setEvents((list) => [{ ...msg, n: counter.current++ }, ...list].slice(0, MAX_CHANGES));
      });
    } catch {
      /* aborted, or the stream ended */
    } finally {
      if (abort.current === controller) setLive(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, maxWidth: 640 }}>
        <FieldInput
          fullWidth
          placeholder={locales.server_container}
          value={container}
          onChange={(e): void => setContainer(e.target.value)}
          inputProps={{ 'aria-label': 'changes-container' }}
        />
        {live ? (
          <Button onClick={stop} data-testid='changes-stop'>
            {locales.server_stop}
          </Button>
        ) : (
          <Button
            variant='contained'
            disabled={!container.includes('/')}
            onClick={(): void => void start()}
            data-testid='changes-watch'
          >
            {locales.server_watch}
          </Button>
        )}
      </Box>
      {events.length === 0 && (
        <Typography color='text.secondary'>
          {live ? locales.server_changes_live : locales.server_changes_idle}
        </Typography>
      )}
      {events.map((e) =>
        e.type === 'error' ? (
          <Typography key={e.n} color='error' data-testid='change-error'>
            {e.message}
          </Typography>
        ) : (
          <Box
            key={e.n}
            data-testid='change-event'
            sx={{
              fontFamily: MONO,
              typography: 'caption',
              py: 0.5,
              borderBottom: 1,
              borderColor: 'divider',
              wordBreak: 'break-all'
            }}
          >
            <b>{e.op}</b> {e.key} {e.doc}
          </Box>
        )
      )}
    </Box>
  );
}

/** MongoDB server views: status, running operations, databases and collections, users, GridFS and a live change stream. */
export default function ServerTool({ connectionId }: Props): JSX.Element {
  const [tab, setTab] = useState<Tab>('status');
  const panel = {
    status: Status,
    operations: Operations,
    databases: Databases,
    users: Users,
    gridfs: GridFs,
    changes: Changes
  }[tab];
  const Panel = panel;

  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto' }} data-testid='server-tool'>
      <Box sx={{ mb: 2 }}>
        <Segmented
          value={tab}
          onChange={setTab}
          testId='server-tabs'
          options={(
            [
              ['status', locales.server_tab_status],
              ['operations', locales.server_tab_operations],
              ['databases', locales.server_tab_databases],
              ['users', locales.server_tab_users],
              ['gridfs', locales.server_tab_gridfs],
              ['changes', locales.server_tab_changes]
            ] as [Tab, string][]
          ).map(([value, label]) => ({ value, label }))}
        />
      </Box>
      <Panel connectionId={connectionId} />
    </Box>
  );
}
