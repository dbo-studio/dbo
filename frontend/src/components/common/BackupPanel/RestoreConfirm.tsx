import api from '@/api';
import type { BackupArtifactType } from '@/api/backup/types';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import Modal from '@/components/base/Modal/Modal';
import ModalFooter from '@/components/base/Modal/ModalFooter/ModalFooter';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import { SelectInputOption } from '@/components/base/SelectInput/types';
import { isHostSqlDriver } from '@/core/db/connectionAliases';
import { resolveSafeModeGate } from '@/core/utils/safeModeGate';
import locales from '@/locales';
import type { ConnectionType } from '@/types';
import { Box, Button, Checkbox, FormControlLabel, Typography } from '@mui/material';
import { type JSX, useState } from 'react';

const formatSize = (bytes: number): string => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const databaseOf = (connection: ConnectionType): string =>
  'database' in connection.options ? (connection.options.database ?? '') : '';

type Props = {
  /** Connections the backup can be restored into; one means no choice is shown. */
  candidates: ConnectionType[];
  artifact: BackupArtifactType;
  defaultDatabase: string;
  schema?: string;
  onCancel: () => void;
  onStarted: (jobId: number) => void;
};

/**
 * Restore step: choose the target, give the passphrase of an encrypted backup,
 * and type the target name to confirm. Safe Mode may ask for its password.
 */
export default function RestoreConfirm({
  candidates,
  artifact,
  defaultDatabase,
  schema,
  onCancel,
  onStarted
}: Props): JSX.Element {
  const [targetId, setTargetId] = useState(candidates[0]?.id ?? 0);
  const target = candidates.find((c) => c.id === targetId) ?? candidates[0];
  const isSqlite = target?.type === 'sqlite';
  const [database, setDatabase] = useState(defaultDatabase);
  const [passphrase, setPassphrase] = useState('');
  const [typed, setTyped] = useState('');
  const [safetyBackup, setSafetyBackup] = useState(true);
  const [createDatabase, setCreateDatabase] = useState(false);
  const [busy, setBusy] = useState(false);

  // SQLite has no database name, so its connection name is what gets typed.
  const targetName = isSqlite ? (target?.name ?? '') : database;
  const matches = targetName !== '' && typed === targetName && (!artifact.encrypted || passphrase !== '');

  const pickTarget = (id: number): void => {
    setTargetId(id);
    const picked = candidates.find((c) => c.id === id);
    if (picked) setDatabase(databaseOf(picked));
    setTyped('');
  };

  const handleRestore = async (): Promise<void> => {
    if (!target) return;

    const run = (): Promise<{ jobId: number }> =>
      api.backup.restore({
        connectionId: target.id,
        database: targetName,
        schema,
        artifactId: artifact.id,
        confirmName: typed,
        safetyBackup: safetyBackup && !createDatabase,
        createDatabase,
        passphrase: passphrase || undefined
      });

    setBusy(true);
    try {
      let result: { jobId: number } | undefined;
      try {
        result = await run();
      } catch (error) {
        // Safe Mode may ask for the password; retry once it is unlocked.
        if (await resolveSafeModeGate(error, target.id)) {
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
        {candidates.length > 1 && (
          <SelectInput
            emptylabel=''
            value={String(targetId)}
            onChange={(e) => pickTarget(Number((e as SelectInputOption)?.value))}
            label={locales.backup_restore_target}
            options={candidates.map((c) => ({ label: c.name, value: String(c.id) }))}
          />
        )}
        {!isSqlite && (
          <FieldInput
            name='backup-restore-database'
            label={locales.backup_database}
            value={database}
            onChange={(e) => {
              setDatabase(e.target.value);
              setTyped('');
            }}
          />
        )}
        {artifact.encrypted && (
          <FieldInput
            name='backup-restore-passphrase'
            type='password'
            label={locales.backup_passphrase}
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
          />
        )}
        <FieldInput
          name='backup-confirm-name'
          label={`${locales.backup_restore_type_name}: ${targetName}`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        {/* SQL Server and ClickHouse restore into the connection's own database. */}
        {!isSqlite && !isHostSqlDriver(target?.type) && (
          <FormControlLabel
            control={<Checkbox checked={createDatabase} onChange={(e) => setCreateDatabase(e.target.checked)} />}
            label={locales.backup_restore_create_db}
          />
        )}
        <FormControlLabel
          disabled={createDatabase}
          control={
            <Checkbox checked={safetyBackup && !createDatabase} onChange={(e) => setSafetyBackup(e.target.checked)} />
          }
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
