import api from '@/api';
import type { BackupArtifactType, BackupToolDownloadType, BackupToolType } from '@/api/backup/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import Modal from '@/components/base/Modal/Modal';
import ModalFooter from '@/components/base/Modal/ModalFooter/ModalFooter';
import { isMysqlDriver, isPostgresDriver } from '@/core/db/connectionAliases';
import { resolveSafeModeGate } from '@/core/utils/safeModeGate';
import { tools } from '@/core/utils/tools';
import locales from '@/locales';
import { useBackupModalStore } from '@/store/backupModal/backup.store';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import type { ConnectionType } from '@/types';
import { Box, Button, Checkbox, Chip, FormControlLabel, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useRef, useState } from 'react';
import { toast } from 'sonner';
import { JobProgressModal } from '../JobProgressModal/JobProgressModal';

type Progress = { jobId: string; title: string };

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const methodLabel = (artifact: BackupArtifactType): string => {
  if (artifact.method === 'native') {
    return `${locales.backup_method_native}: ${artifact.tool} ${artifact.toolVersion}`.trim();
  }
  return artifact.method === 'uploaded' ? locales.backup_method_uploaded : locales.backup_method_basic;
};

/** Where a backup is written: connection database, plus a schema for Postgres. */
const defaultDatabase = (connection: ConnectionType): string =>
  'database' in connection.options ? (connection.options.database ?? '') : '';

export default function BackupModal(): JSX.Element | null {
  const connectionId = useBackupModalStore((s) => s.connectionId);
  const close = useBackupModalStore((s) => s.close);
  const connection = useConnectionStore((s) => s.connections?.find((c) => c.id === connectionId));

  if (connectionId === null || !connection) {
    return null;
  }

  return <BackupModalBody key={connection.id} connection={connection} onClose={close} />;
}

function BackupModalBody({ connection, onClose }: { connection: ConnectionType; onClose: () => void }): JSX.Element {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSqlite = !isPostgresDriver(connection.type) && !isMysqlDriver(connection.type);
  const isPostgres = isPostgresDriver(connection.type);
  const canWrite = (connection.access ?? 'owner') !== 'viewer';

  const [database, setDatabase] = useState(() => defaultDatabase(connection));
  const [schema, setSchema] = useState(isPostgres ? 'public' : '');
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState<Progress | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<BackupArtifactType | null>(null);

  const historyKey = ['backups', connection.id];
  const { data: history = [] } = useQuery({ queryKey: historyKey, queryFn: () => api.backup.history(connection.id) });
  const { data: detectedTools = [] } = useQuery({ queryKey: ['backup-tools'], queryFn: api.backup.tools });
  const { data: downloads = [] } = useQuery({ queryKey: ['backup-tool-downloads'], queryFn: api.backup.toolDownloads });

  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey: historyKey });
    void queryClient.invalidateQueries({ queryKey: ['backup-tools'] });
    void queryClient.invalidateQueries({ queryKey: ['backup-tool-downloads'] });
  };

  const track = (jobId: number, title: string): void => setProgress({ jobId: String(jobId), title });

  const handleBackup = async (): Promise<void> => {
    try {
      const { jobId } = await api.backup.create({
        connectionId: connection.id,
        database: isSqlite ? undefined : database,
        schema: isPostgres ? schema : undefined,
        note: note.trim() || undefined
      });
      setNote('');
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

  const handleInstall = async (item: BackupToolDownloadType): Promise<void> => {
    try {
      const { jobId } = await api.backup.installTool(item.driver, item.version);
      track(jobId, locales.backup_tool_installing);
    } catch {
      /* the api layer already toasted */
    }
  };

  return (
    <>
      <Modal open title={locales.backup_restore} onClose={onClose} padding='24px'>
        <Box sx={{ width: 'min(640px, calc(100vw - 64px))', maxHeight: '75vh', overflowY: 'auto' }}>
          <Typography variant='body2' color='textSubdued' sx={{ mb: 2 }}>
            {locales.backup_not_export}
          </Typography>

          {!isSqlite && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Box sx={{ flex: 1 }}>
                <FieldInput
                  name='backup-database'
                  label={locales.backup_database}
                  value={database}
                  onChange={(e) => setDatabase(e.target.value)}
                />
              </Box>
              {isPostgres && (
                <Box sx={{ flex: 1 }}>
                  <FieldInput
                    label={locales.backup_schema}
                    value={schema}
                    onChange={(e) => setSchema(e.target.value)}
                  />
                </Box>
              )}
            </Box>
          )}
          <FieldInput
            name='backup-note'
            label={locales.backup_note}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <ModalFooter spread>
            <Box>
              <input
                ref={fileInputRef}
                hidden
                type='file'
                accept={isSqlite ? '.sqlite' : '.sql'}
                onChange={(e) => void handleUpload(e.target.files?.[0])}
              />
              {canWrite && (
                <Button size='small' onClick={() => fileInputRef.current?.click()}>
                  {locales.backup_upload}
                </Button>
              )}
            </Box>
            <Button size='small' variant='contained' onClick={() => void handleBackup()}>
              {locales.backup_now}
            </Button>
          </ModalFooter>

          <Typography variant='subtitle2' sx={{ mt: 3, mb: 1 }}>
            {locales.backup_history}
          </Typography>
          {history.length === 0 && (
            <Typography variant='body2' color='textSubdued'>
              {locales.backup_empty}
            </Typography>
          )}
          {history.map((artifact) => (
            <Box
              key={artifact.id}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, borderTop: 1, borderColor: 'divider' }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant='body2' noWrap>
                  {new Date(artifact.startedAt).toLocaleString()} · {formatSize(artifact.size)}
                  {artifact.note ? ` · ${artifact.note}` : ''}
                </Typography>
                <Typography
                  variant='caption'
                  color={artifact.status === 'failed' ? 'error.main' : 'textSubdued'}
                  noWrap
                >
                  {artifact.status === 'failed' ? artifact.error : methodLabel(artifact)}
                </Typography>
              </Box>
              {artifact.status === 'completed' && (
                <>
                  <Button size='small' onClick={() => void handleDownload(artifact)}>
                    {locales.backup_download}
                  </Button>
                  {canWrite && (
                    <Button size='small' color='error' onClick={() => setRestoreTarget(artifact)}>
                      {locales.backup_restore_action}
                    </Button>
                  )}
                </>
              )}
            </Box>
          ))}

          <Typography variant='subtitle2' sx={{ mt: 3 }}>
            {locales.backup_tools}
          </Typography>
          <Typography variant='caption' color='textSubdued' component='p' sx={{ mb: 1 }}>
            {locales.backup_tools_hint}
          </Typography>
          <ToolList detected={detectedTools} downloads={downloads} onInstall={(item) => void handleInstall(item)} />
        </Box>
      </Modal>

      {restoreTarget && (
        <RestoreConfirm
          connection={connection}
          artifact={restoreTarget}
          defaultTarget={isSqlite ? connection.name : database}
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

function ToolList({
  detected,
  downloads,
  onInstall
}: {
  detected: BackupToolType[];
  downloads: BackupToolDownloadType[];
  onInstall: (item: BackupToolDownloadType) => void;
}): JSX.Element {
  return (
    <>
      {detected.map((tool) => {
        const offer = downloads.find((d) => d.driver === tool.driver && d.tools.includes(tool.name) && !d.installed);

        return (
          <Box key={`${tool.name}-${tool.path}`} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
            <Typography variant='body2' sx={{ width: 110 }}>
              {tool.name}
            </Typography>
            {tool.found ? (
              <Typography variant='caption' color='textSubdued' noWrap sx={{ flex: 1 }}>
                {tool.version} · {tool.path}
              </Typography>
            ) : (
              <Typography variant='caption' color='textSubdued' sx={{ flex: 1 }}>
                {locales.backup_tool_missing}
                {offer &&
                  ` · ${locales.backup_tool_download_info
                    .replace('{name}', offer.tools.join(', '))
                    .replace('{version}', offer.version)
                    .replace('{url}', offer.url)
                    .replace('{size}', formatSize(offer.size))}`}
              </Typography>
            )}
            {offer && (
              <Button size='small' onClick={() => onInstall(offer)}>
                {locales.backup_tool_download}
              </Button>
            )}
            {tool.found && tool.source === 'managed' && <Chip size='small' label={locales.backup_tool_installed} />}
          </Box>
        );
      })}
    </>
  );
}

function RestoreConfirm({
  connection,
  artifact,
  defaultTarget,
  schema,
  onCancel,
  onStarted
}: {
  connection: ConnectionType;
  artifact: BackupArtifactType;
  defaultTarget: string;
  schema?: string;
  onCancel: () => void;
  onStarted: (jobId: number) => void;
}): JSX.Element {
  const [typed, setTyped] = useState('');
  const [safetyBackup, setSafetyBackup] = useState(true);
  const [busy, setBusy] = useState(false);
  const matches = defaultTarget !== '' && typed === defaultTarget;

  const handleRestore = async (): Promise<void> => {
    const run = (): Promise<{ jobId: number }> =>
      api.backup.restore({
        connectionId: connection.id,
        database: defaultTarget,
        schema,
        artifactId: artifact.id,
        confirmName: typed,
        safetyBackup
      });

    setBusy(true);
    try {
      let result: { jobId: number } | undefined;
      try {
        result = await run();
      } catch (error) {
        // Safe Mode may ask for the password; retry once it is unlocked.
        if (await resolveSafeModeGate(error, connection.id)) {
          result = await run();
        }
      }
      if (result) onStarted(result.jobId);
    } catch {
      /* the api layer already toasted */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title={locales.backup_restore_title} onClose={onCancel} padding='24px'>
      <Box sx={{ width: 'min(480px, calc(100vw - 64px))' }}>
        <Typography variant='body2' color='error.main' sx={{ mb: 2 }}>
          {locales.backup_restore_warning}
        </Typography>
        <Typography variant='body2' sx={{ mb: 1 }}>
          {artifact.fileName} · {formatSize(artifact.size)}
        </Typography>
        <FieldInput
          name='backup-confirm-name'
          label={`${locales.backup_restore_type_name}: ${defaultTarget}`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        <FormControlLabel
          control={<Checkbox checked={safetyBackup} onChange={(e) => setSafetyBackup(e.target.checked)} />}
          label={locales.backup_restore_safety}
        />
        <ModalFooter>
          <Button size='small' onClick={onCancel}>
            {locales.cancel}
          </Button>
          <Button
            size='small'
            variant='contained'
            color='error'
            disabled={!matches || busy}
            onClick={() => void handleRestore()}
          >
            {locales.backup_restore_action}
          </Button>
        </ModalFooter>
      </Box>
    </Modal>
  );
}
