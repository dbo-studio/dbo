import api from '@/api';
import type { BackupToolDownloadType, BackupToolType } from '@/api/backup/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import ProgressBar from '@/components/base/ProgressBar/ProgressBar';
import { useWatchJob } from '@/core/notifications/watching';
import { formatBytes } from '@/core/utils/formatBytes';
import { parseTransfer, transferDetail, transferLabel } from '@/core/utils/transferProgress';
import { tools as toolUtils } from '@/core/utils/tools';
import locales from '@/locales';
import { isFinished, useJobEventsStore } from '@/store/jobEvents/jobEvents.store';
import { Box, Button, Chip, Typography } from '@mui/material';
import { open } from '@tauri-apps/plugin-dialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useEffect, useState } from 'react';
import {
  CardRowIconStyled,
  CardRowMainStyled,
  CardRowStyled,
  CardStyled,
  SectionActionsStyled
} from '../BackupPanel.styled';

const DRIVER_LABEL: Record<string, string> = { postgresql: 'PostgreSQL', mysql: 'MySQL', sqlite: 'SQLite' };

const SOURCE_LABEL: Record<string, string> = {
  configured: locales.backup_tool_source_configured,
  managed: locales.backup_tool_source_managed,
  path: locales.backup_tool_source_path,
  known: locales.backup_tool_source_known
};

export default function ToolsSection(): JSX.Element {
  const queryClient = useQueryClient();
  const { data: detected = [] } = useQuery({ queryKey: ['backup-tools'], queryFn: api.backup.tools });
  const { data: downloads = [] } = useQuery({ queryKey: ['backup-tool-downloads'], queryFn: api.backup.toolDownloads });
  const [installs, setInstalls] = useState<Record<string, number>>({});

  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['backup-tools'] });
    void queryClient.invalidateQueries({ queryKey: ['backup-tool-downloads'] });
  };

  const drivers = [...new Set(detected.map((t) => t.driver))];

  return (
    <>
      <Box sx={{ display: 'flex' }}>
        <SectionActionsStyled sx={{ ml: 0 }}>
          <Button size='small' variant='outlined' onClick={refresh} data-testid='backup-tools-detect'>
            {locales.backup_tool_detect}
          </Button>
        </SectionActionsStyled>
      </Box>
      {drivers.map((driver) => (
        <DriverCard
          key={driver}
          driver={driver}
          tools={detected.filter((t) => t.driver === driver)}
          offer={downloads.find((d) => d.driver === driver && !d.installed)}
          jobId={installs[driver]}
          onStarted={(jobId) => setInstalls((prev) => ({ ...prev, [driver]: jobId }))}
          onSettled={() => {
            setInstalls((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => key !== driver)));
            refresh();
          }}
          onChanged={refresh}
        />
      ))}
    </>
  );
}

function DriverCard({
  driver,
  tools,
  offer,
  jobId,
  onStarted,
  onSettled,
  onChanged
}: {
  driver: string;
  tools: BackupToolType[];
  offer?: BackupToolDownloadType;
  jobId?: number;
  onStarted: (jobId: number) => void;
  onSettled: () => void;
  onChanged: () => void;
}): JSX.Element {
  useWatchJob(jobId);
  const job = useJobEventsStore((s) => (jobId === undefined ? undefined : s.jobs[jobId]));

  useEffect(() => {
    if (job && isFinished(job.status)) {
      onSettled();
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: settle once when the job finishes
  }, [job?.status]);

  const startInstall = async (): Promise<void> => {
    if (!offer) return;
    try {
      onStarted((await api.backup.installTool(offer.driver, offer.version)).jobId);
    } catch {
      /* the api layer already toasted */
    }
  };

  const cancelInstall = (): void => {
    if (jobId !== undefined) void api.job.cancel(String(jobId)).catch(() => undefined);
  };

  const msg = job ? parseTransfer(job.message) : null;
  const installing = jobId !== undefined;
  const platform = navigator.userAgent;
  const installHint = /Windows/i.test(platform)
    ? locales.backup_tool_install_hint_windows
    : /Mac/i.test(platform)
      ? locales.backup_tool_install_hint_mac
      : locales.backup_tool_install_hint_linux;

  return (
    <CardStyled data-testid={`backup-tools-${driver}`}>
      <CardRowStyled>
        <CardRowIconStyled>
          <CustomIcon type='database' size='s' />
        </CardRowIconStyled>
        <CardRowMainStyled>
          <Typography variant='subtitle2' color='textTitle'>
            {DRIVER_LABEL[driver] ?? driver}
          </Typography>
          {offer && (
            <Typography variant='caption' color='textSecondary'>
              {locales.backup_tool_download_info
                .replace('{name}', offer.tools.join(', '))
                .replace('{version}', offer.version)
                .replace('{url}', offer.url)
                .replace('{size}', formatBytes(offer.size))}
            </Typography>
          )}
        </CardRowMainStyled>
        {offer && !installing && (
          <Button
            size='small'
            variant='contained'
            onClick={() => void startInstall()}
            data-testid={`backup-tool-install-${driver}`}
          >
            {locales.backup_tool_download}
          </Button>
        )}
        {installing && (
          <Button size='small' onClick={cancelInstall}>
            {locales.cancel}
          </Button>
        )}
      </CardRowStyled>
      {installing && (
        <CardRowStyled>
          <ProgressBar
            testId={`backup-tool-progress-${driver}`}
            value={job ? (job.status === 'pending' ? undefined : job.progress) : undefined}
            status={job?.status === 'failed' ? 'error' : 'active'}
            label={msg ? transferLabel(msg) : (job?.message ?? locales.backup_tool_installing)}
            detail={msg ? transferDetail(msg) : undefined}
          />
        </CardRowStyled>
      )}
      {!offer && tools.some((t) => !t.found) && driver !== 'sqlite' && (
        <CardRowStyled>
          <Typography variant='caption' color='textSecondary'>
            {installHint}
          </Typography>
        </CardRowStyled>
      )}
      {tools.map((tool) => (
        <ToolRow key={`${tool.name}-${tool.path}`} tool={tool} onChanged={onChanged} />
      ))}
    </CardStyled>
  );
}

function ToolRow({ tool, onChanged }: { tool: BackupToolType; onChanged: () => void }): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [path, setPath] = useState(tool.path);
  const [probe, setProbe] = useState<BackupToolType | null>(null);
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    toolUtils
      .isTauri()
      .then(setIsTauri)
      .catch(() => undefined);
  }, []);

  const browse = async (): Promise<void> => {
    if (!(await toolUtils.isTauri())) return;
    const picked = await open({ multiple: false, directory: false, title: tool.name });
    if (typeof picked === 'string') {
      setPath(picked);
      setProbe(null);
    }
  };

  const test = async (): Promise<void> => {
    try {
      setProbe(await api.backup.testToolPath(tool.name, path));
    } catch {
      setProbe(null);
    }
  };

  const save = async (): Promise<void> => {
    try {
      await api.backup.setToolPath(tool.name, path);
      setEditing(false);
      onChanged();
    } catch {
      /* the api layer already toasted */
    }
  };

  const reset = async (): Promise<void> => {
    try {
      await api.backup.clearToolPath(tool.name);
      onChanged();
    } catch {
      /* the api layer already toasted */
    }
  };

  const remove = async (): Promise<void> => {
    const [, driver, version] = /data[\\/]tools[\\/]([^\\/]+)[\\/]([^\\/]+)/.exec(tool.path) ?? [];
    if (!driver || !version) return;
    try {
      await api.backup.removeTool(driver, version);
      onChanged();
    } catch {
      /* the api layer already toasted */
    }
  };

  const usable = tool.found && !tool.error;

  return (
    <>
      <CardRowStyled data-testid={`backup-tool-${tool.name}`}>
        <CardRowMainStyled>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant='body2' color='textTitle'>
              {tool.name}
            </Typography>
            {usable && <Chip size='small' color='success' label={tool.version} />}
            {tool.found && tool.source && <Chip size='small' label={SOURCE_LABEL[tool.source] ?? tool.source} />}
            {!tool.found && <Chip size='small' label={locales.backup_tool_missing} />}
            {tool.found && tool.error && <Chip size='small' color='error' label={tool.error} />}
          </Box>
          {tool.path && (
            <Typography variant='caption' color='textSecondary' noWrap component='p'>
              {tool.path}
            </Typography>
          )}
        </CardRowMainStyled>
        <Button size='small' onClick={() => setEditing((v) => !v)}>
          {locales.backup_tool_set_path}
        </Button>
        {tool.source === 'configured' && (
          <Button size='small' onClick={() => void reset()}>
            {locales.backup_tool_reset}
          </Button>
        )}
        {tool.found && tool.source === 'managed' && (
          <Button size='small' color='error' onClick={() => void remove()}>
            {locales.backup_tool_remove}
          </Button>
        )}
      </CardRowStyled>
      {editing && (
        <CardRowStyled>
          <Box sx={{ flex: 1 }}>
            <FieldInput
              margin='none'
              name={`tool-path-${tool.name}`}
              label={locales.backup_tool_path}
              value={path}
              onChange={(e) => {
                setPath(e.target.value);
                setProbe(null);
              }}
              helpertext={
                probe ? `${probe.name} ${probe.version} · ${locales.connector_test_ok}` : locales.backup_tool_path_hint
              }
              helpertone={probe ? 'success' : 'muted'}
            />
          </Box>
          {isTauri && (
            <Button size='small' variant='outlined' onClick={() => void browse()}>
              {locales.backup_tool_browse}
            </Button>
          )}
          <Button size='small' variant='outlined' onClick={() => void test()} disabled={!path.trim()}>
            {locales.backup_tool_test}
          </Button>
          <Button size='small' variant='contained' onClick={() => void save()} disabled={!path.trim()}>
            {locales.save}
          </Button>
        </CardRowStyled>
      )}
    </>
  );
}
