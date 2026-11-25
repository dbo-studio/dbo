import api from '@/api';
import type { NoSQLCollectionOptions } from '@/api/nosql/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import { formatBytes } from '@/core/utils/formatBytes';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import locales from '@/locales';
import { Box, Button, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';
import ServerGrid from '../ServerGrid/ServerGrid';
import ServerRowActions from '../ServerGrid/ServerRowActions';
import DropDatabaseDialog from '../DropDatabaseDialog/DropDatabaseDialog';
import { pickServerOption, SERVER_COLLECTION_KINDS, type ServerToolProps } from '../serverToolShared';

const KIND_LABEL: Record<NoSQLCollectionOptions['kind'], string> = {
  collection: locales.server_kind_collection,
  capped: locales.server_kind_capped,
  timeseries: locales.server_kind_timeseries,
  view: locales.server_kind_view
};

export default function Databases({ connectionId }: ServerToolProps): JSX.Element {
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
        {dbs.isError ? (
          <Typography color='error' role='alert'>
            {locales.action_failed}
          </Typography>
        ) : (
          <ServerGrid
            headers={[locales.server_database, locales.server_size, locales.server_collections]}
            values={(dbs.data ?? []).map((d) => [d.name, formatBytes(d.sizeOnDisk), d.collections])}
            loading={dbs.isPending}
            action={([value]) => {
              const database = String(value);
              return (
                <ServerRowActions
                  key={database}
                  actions={[
                    { label: locales.server_collections, run: () => setSelected(database) },
                    ...(!['admin', 'local', 'config'].includes(database)
                      ? [{ label: locales.server_drop_database, run: () => setDropping(database), danger: true }]
                      : [])
                  ]}
                />
              );
            }}
          />
        )}

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
          {colls.isError ? (
            <Typography color='error' role='alert'>
              {locales.action_failed}
            </Typography>
          ) : (
            <ServerGrid
              headers={[locales.name, locales.server_kind]}
              values={(colls.data ?? []).map((c) => [c.name, c.capped ? locales.server_kind_capped : c.type])}
              loading={colls.isPending}
            />
          )}

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
              options={SERVER_COLLECTION_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))}
              onChange={(o): void => setOpts({ kind: pickServerOption(o) as NoSQLCollectionOptions['kind'] })}
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
                  onChange={(o): void => setOpts({ ...opts, granularity: pickServerOption(o) })}
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
          prompt={locales.server_drop_database_confirm}
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
