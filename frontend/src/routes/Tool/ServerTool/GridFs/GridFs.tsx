import api from '@/api';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import { formatBytes } from '@/core/utils/formatBytes';
import { tools } from '@/core/utils/tools';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { Box, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';
import ServerGrid from '../ServerGrid/ServerGrid';
import ServerRowActions from '../ServerGrid/ServerRowActions';
import { pickServerOption, type ServerToolProps } from '../serverToolShared';

export default function GridFs({ connectionId }: ServerToolProps): JSX.Element {
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
        void withSafeModeRetry(async () => {
          await api.nosql.gridfsDelete(connectionId, db, bucketName, id, true);
          return true;
        }, connectionId)
          .then((done) =>
            done
              ? qc.invalidateQueries({ queryKey: ['server', 'gridfs-files', connectionId, db, bucketName] })
              : undefined
          )
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
              setDb(pickServerOption(o));
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
            onChange={(o): void => setBucket(pickServerOption(o))}
          />
        </Box>
      </Box>
      {db && buckets.data?.length === 0 && <Typography color='text.secondary'>{locales.server_no_buckets}</Typography>}
      {db &&
        bucketName &&
        (files.isError ? (
          <Typography color='error' role='alert'>
            {locales.action_failed}
          </Typography>
        ) : (
          <ServerGrid
            headers={[locales.server_file, locales.server_size]}
            values={(files.data ?? []).map((file) => [file.filename || file.id, formatBytes(file.length)])}
            loading={files.isPending}
            action={(_row, index) => {
              const file = files.data?.[index];
              return (
                file && (
                  <ServerRowActions
                    key={file.id}
                    actions={[
                      { label: locales.server_download, run: () => void download(file.id, file.filename) },
                      { label: locales.server_delete_file, run: () => remove(file.id, file.filename), danger: true }
                    ]}
                  />
                )
              );
            }}
          />
        ))}
    </Box>
  );
}
