import api from '@/api';
import type { BackupArtifactType } from '@/api/backup/types';
import EmptyState from '@/components/base/EmptyState/EmptyState';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { Button, Chip, Typography } from '@mui/material';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { type JSX, useRef, useState } from 'react';
import { toast } from 'sonner';
import { JobProgressModal } from '../../JobProgressModal/JobProgressModal';
import { CardRowMainStyled, CardRowStyled, CardStyled, SectionActionsStyled } from '../BackupPanel.styled';
import { formatDate, formatSize } from '../format';
import { FormGroup, FormRow } from '../FormRow';
import RestoreConfirm from '../RestoreConfirm';
import { restoreCandidates } from '../restoreCandidates';

type Progress = { jobId: string };

/** Every restorable backup in one list, with an upload for files made elsewhere. */
export default function RestoreSection(): JSX.Element {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const connections = useConnectionStore((s) => s.connections) ?? [];
  const writable = connections.filter((c) => (c.access ?? 'owner') !== 'viewer');

  const [filter, setFilter] = useState(0);
  const [uploadInto, setUploadInto] = useState<number | null>(null);
  const [target, setTarget] = useState<BackupArtifactType | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  const shown = filter ? connections.filter((c) => c.id === filter) : connections;
  const histories = useQueries({
    queries: shown.map((c) => ({ queryKey: ['backups', c.id], queryFn: () => api.backup.history(c.id) }))
  });

  const artifacts = histories
    .flatMap((h) => h.data ?? [])
    .filter((a) => a.status === 'completed')
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  const intoId = uploadInto ?? writable[0]?.id ?? null;
  const connectionName = (id: number): string => connections.find((c) => c.id === id)?.name ?? `#${id}`;

  const handleUpload = async (file: File | undefined): Promise<void> => {
    if (!file || intoId === null) return;
    try {
      const artifact = await api.backup.upload(intoId, file);
      toast.success(locales.backup_uploaded);
      void queryClient.invalidateQueries({ queryKey: ['backups', intoId] });
      setTarget(artifact);
    } catch {
      toast.error(locales.backup_upload_failed);
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <>
      <FormGroup>
        <FormRow label={locales.backup_restore_from}>
          <SelectInput
            emptylabel=''
            value={String(filter)}
            onChange={(e) => setFilter(Number((e as SelectInputOption)?.value))}
            options={[
              { label: locales.backup_restore_all, value: '0' },
              ...connections.map((c) => ({ label: c.name, value: String(c.id) }))
            ]}
            testId='restore-filter'
          />
        </FormRow>
        <FormRow label={locales.backup_restore_into}>
          <SelectInput
            emptylabel=''
            value={intoId === null ? undefined : String(intoId)}
            onChange={(e) => setUploadInto(Number((e as SelectInputOption)?.value))}
            options={writable.map((c) => ({ label: c.name, value: String(c.id) }))}
            testId='restore-upload-into'
          />
        </FormRow>
      </FormGroup>
      <SectionActionsStyled sx={{ ml: 0 }}>
        <input
          ref={fileInput}
          hidden
          type='file'
          accept='.sql,.sqlite,.gz,.enc'
          onChange={(e) => void handleUpload(e.target.files?.[0])}
        />
        <Button
          variant='outlined'
          disabled={intoId === null}
          onClick={() => fileInput.current?.click()}
          data-testid='restore-upload'
        >
          {locales.backup_restore_upload}
        </Button>
      </SectionActionsStyled>

      {artifacts.length === 0 ? (
        <CardStyled>
          <EmptyState
            icon='backup'
            title={locales.backup_restore_none}
            description={locales.backup_restore_none_hint}
          />
        </CardStyled>
      ) : (
        <CardStyled>
          {artifacts.map((a) => (
            <CardRowStyled key={a.id} data-testid={`restore-row-${a.id}`}>
              <CardRowMainStyled>
                <Typography variant='body2' color='textTitle' noWrap>
                  {connectionName(a.connectionId)}
                  {a.database ? ` · ${a.database}` : ''} · {formatDate(a.startedAt)}
                </Typography>
                <Typography variant='caption' color='textSecondary' noWrap component='p'>
                  {formatSize(a.size)}
                  {a.note ? ` · ${a.note}` : ''}
                </Typography>
              </CardRowMainStyled>
              {a.encrypted && <Chip label={locales.backup_encrypted} />}
              {a.remoteStatus === 'uploaded' && <Chip color='success' label={locales.backup_remote_uploaded} />}
              <Button
                variant='outlined'
                color='error'
                onClick={() => setTarget(a)}
                data-testid={`restore-open-${a.id}`}
              >
                {locales.backup_restore_pick}
              </Button>
            </CardRowStyled>
          ))}
        </CardStyled>
      )}

      {target && (
        <RestoreConfirm
          candidates={restoreCandidates(target.connectionId, connections)}
          artifact={target}
          defaultDatabase={target.database}
          schema={target.schema || undefined}
          onCancel={() => setTarget(null)}
          onStarted={(jobId) => {
            setTarget(null);
            setProgress({ jobId: String(jobId) });
          }}
        />
      )}

      <JobProgressModal
        open={progress !== null}
        jobId={progress?.jobId ?? null}
        title={locales.restore_in_progress}
        onClose={() => setProgress(null)}
      />
    </>
  );
}
