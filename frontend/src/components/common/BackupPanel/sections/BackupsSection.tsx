import api from '@/api';
import type { BackupArtifactType } from '@/api/backup/types';
import EmptyState from '@/components/base/EmptyState/EmptyState';
import PassphraseInput from '../PassphraseInput';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import { isMysqlDriver, isPostgresDriver } from '@/core/db/connectionAliases';
import { tools } from '@/core/utils/tools';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { BackupTabType, ConnectionType } from '@/types';
import { Box, Button, Chip, InputBase, Switch, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, type JSX, useRef, useState } from 'react';
import { toast } from 'sonner';
import { JobProgressModal } from '../../JobProgressModal/JobProgressModal';
import { CardRowMainStyled, CardRowStyled, CardStyled, SectionActionsStyled } from '../BackupPanel.styled';
import { FormGroup, FormRow } from '../FormRow';
import ScopePicker, { type Scope, scopeFor } from '../ScopePicker';
import { formatDate, formatSize } from '../format';
import RestoreConfirm from '../RestoreConfirm';

type Progress = { jobId: string; title: string };

const methodLabel = (a: BackupArtifactType): string =>
  a.method === 'native'
    ? `${locales.backup_method_native}: ${a.tool} ${a.toolVersion}`.trim()
    : a.method === 'uploaded'
      ? locales.backup_method_uploaded
      : locales.backup_method_basic;

export default function BackupsSection({ tab }: { tab: BackupTabType }): JSX.Element {
  const connections = useConnectionStore((s) => s.connections) ?? [];
  const initial = connections.find((c) => c.id === tab.targetConnectionId) ?? connections[0];
  // Re-seed when the tab is reopened on another database (tree menu) or connection.
  const seed = `${tab.targetConnectionId ?? ''}:${tab.database ?? ''}`;
  const [state, setState] = useState<{ seed: string; scope: Scope }>(() => ({
    seed,
    scope: scopeFor(initial, tab.targetConnectionId === initial?.id ? tab.database : undefined)
  }));

  if (state.seed !== seed) {
    setState({ seed, scope: scopeFor(initial, tab.targetConnectionId === initial?.id ? tab.database : undefined) });
  }

  if (!initial) {
    return <EmptyState icon='connection' title={locales.backup_pick_connection} />;
  }

  const setScope = (scope: Scope): void => setState((prev) => ({ ...prev, scope }));
  const connection = connections.find((c) => c.id === state.scope.connectionId) ?? initial;

  return (
    <ConnectionBackups
      key={connection.id}
      connection={connection}
      scope={state.scope}
      onScopeChange={setScope}
      connections={connections}
    />
  );
}

function ConnectionBackups({
  connection,
  connections,
  scope,
  onScopeChange
}: {
  connection: ConnectionType;
  connections: ConnectionType[];
  scope: Scope;
  onScopeChange: (scope: Scope) => void;
}): JSX.Element {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isPostgres = isPostgresDriver(connection.type);
  const isSqlite = !isPostgres && !isMysqlDriver(connection.type);
  const canWrite = (connection.access ?? 'owner') !== 'viewer';

  const { database, schema } = scope;
  const [note, setNote] = useState('');
  const [compress, setCompress] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [destinationId, setDestinationId] = useState(0);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<BackupArtifactType | null>(null);

  const { data: destinations = [] } = useQuery({
    queryKey: ['backup-connectors', 'destination'],
    queryFn: () => api.backup.connectors('destination')
  });
  const historyKey = ['backups', connection.id];
  const { data: history = [] } = useQuery({ queryKey: historyKey, queryFn: () => api.backup.history(connection.id) });
  const refresh = (): void => void queryClient.invalidateQueries({ queryKey: historyKey });
  const track = (jobId: number, title: string): void => setProgress({ jobId: String(jobId), title });

  const handleBackup = async (): Promise<void> => {
    try {
      const { jobId } = await api.backup.create({
        connectionId: connection.id,
        database: isSqlite ? undefined : database,
        schema: isPostgres ? schema : undefined,
        note: note.trim() || undefined,
        compress,
        passphrase: passphrase || undefined,
        destinationId: destinationId || undefined
      });
      setNote('');
      setPassphrase('');
      track(jobId, locales.backup_in_progress);
    } catch {
      /* the api layer already toasted */
    }
  };

  const handleUpload = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    try {
      await api.backup.upload(connection.id, file);
      toast.success(locales.backup_uploaded);
      refresh();
    } catch {
      toast.error(locales.backup_upload_failed);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (artifact: BackupArtifactType): Promise<void> => {
    try {
      tools.fileDownload(await api.backup.download(artifact.id), artifact.fileName);
    } catch {
      toast.error(locales.download_failed);
    }
  };

  const handleVerify = async (artifact: BackupArtifactType): Promise<void> => {
    try {
      const result = await api.backup.verify(artifact.id, undefined);
      if (result.ok) toast.success(`${locales.backup_verify_ok}: ${result.message}`);
      else toast.error(`${locales.backup_verify_failed}: ${result.message}`);
    } catch {
      /* the api layer already toasted */
    }
  };

  return (
    <>
      <FormGroup>
        <ScopePicker connections={connections} value={scope} onChange={onScopeChange} />
        <FormRow label={locales.backup_note}>
          <InputBase name='backup-note' value={note} onChange={(e) => setNote(e.target.value)} margin='none' />
        </FormRow>
        <FormRow label={locales.backup_destination}>
          <SelectInput
            emptylabel=''
            value={String(destinationId)}
            onChange={(e) => setDestinationId(Number((e as SelectInputOption)?.value))}
            options={[
              { label: locales.backup_destination_local, value: '0' },
              ...destinations.filter((d) => d.enabled).map((d) => ({ label: d.name, value: String(d.id) }))
            ]}
            testId='backup-destination-select'
          />
        </FormRow>
        <FormRow label={locales.backup_compress}>
          <Switch checked={compress} onChange={(e: ChangeEvent<HTMLInputElement>) => setCompress(e.target.checked)} />
        </FormRow>
        <FormRow
          label={locales.backup_encrypt_passphrase}
          hint={passphrase !== '' ? locales.backup_encrypt_warning : undefined}
        >
          <PassphraseInput name='backup-passphrase' value={passphrase} onChange={setPassphrase} />
        </FormRow>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
          <SectionActionsStyled>
            <input
              ref={fileInputRef}
              hidden
              type='file'
              accept={isSqlite ? '.sqlite' : '.sql'}
              onChange={(e) => void handleUpload(e.target.files?.[0])}
            />
            {canWrite && (
              <Button variant='outlined' onClick={() => fileInputRef.current?.click()}>
                {locales.backup_upload}
              </Button>
            )}
            <Button variant='contained' onClick={() => void handleBackup()}>
              {locales.backup_now}
            </Button>
          </SectionActionsStyled>
        </Box>
      </FormGroup>

      <Typography variant='subtitle2' color='textTitle'>
        {locales.backup_history}
      </Typography>
      {history.length === 0 ? (
        <CardStyled>
          <EmptyState icon='backup' title={locales.backup_empty} />
        </CardStyled>
      ) : (
        <CardStyled>
          {history.map((artifact) => (
            <CardRowStyled key={artifact.id} data-testid={`backup-artifact-${artifact.id}`}>
              <CardRowMainStyled>
                <Typography variant='body2' color='textTitle' noWrap>
                  {formatDate(artifact.startedAt)} · {formatSize(artifact.size)}
                  {artifact.note ? ` · ${artifact.note}` : ''}
                </Typography>
                <Typography
                  variant='caption'
                  color={artifact.status === 'failed' ? 'error' : 'textSecondary'}
                  noWrap
                  component='p'
                >
                  {artifact.status === 'failed' ? artifact.error : methodLabel(artifact)}
                </Typography>
              </CardRowMainStyled>
              {artifact.encrypted && <Chip label={locales.backup_encrypted} />}
              {artifact.remoteStatus === 'uploaded' && <Chip color='success' label={locales.backup_remote_uploaded} />}
              {artifact.remoteStatus === 'failed' && (
                <Chip color='error' label={locales.backup_remote_failed} title={artifact.remoteError} />
              )}
              {artifact.status === 'completed' && (
                <>
                  <Button onClick={() => void handleVerify(artifact)}>{locales.backup_verify}</Button>
                  <Button onClick={() => void handleDownload(artifact)}>{locales.backup_download}</Button>
                  {canWrite && (
                    <Button color='error' onClick={() => setRestoreTarget(artifact)}>
                      {locales.backup_restore_action}
                    </Button>
                  )}
                </>
              )}
            </CardRowStyled>
          ))}
        </CardStyled>
      )}

      {restoreTarget && (
        <RestoreConfirm
          candidates={[connection]}
          artifact={restoreTarget}
          defaultDatabase={database}
          schema={isPostgres ? schema : undefined}
          onCancel={() => setRestoreTarget(null)}
          onStarted={(jobId) => {
            setRestoreTarget(null);
            track(jobId, locales.restore_in_progress);
          }}
        />
      )}

      <JobProgressModal
        open={progress !== null}
        jobId={progress?.jobId ?? null}
        title={progress?.title ?? ''}
        onClose={() => {
          setProgress(null);
          refresh();
        }}
      />
    </>
  );
}
