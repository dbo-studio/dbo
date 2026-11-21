import api from '@/api';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import { formatBytes } from '@/core/utils/formatBytes';
import { tools } from '@/core/utils/tools';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { Box, Button, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import { toast } from 'sonner';
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
