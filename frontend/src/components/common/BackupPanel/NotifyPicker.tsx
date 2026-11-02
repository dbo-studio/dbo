import api from '@/api';
import type { NotifyOnType } from '@/api/backup/types';
import locales from '@/locales';
import { Box, Button, Chip, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useState } from 'react';
import ConnectorDialog from './connectors/ConnectorDialog';
import Segmented from './Segmented';

/** Pick the channels to tell and when; a channel can be added without leaving the form. */
export default function NotifyPicker({
  channelIds,
  onChannels,
  notifyOn,
  onNotifyOn
}: {
  channelIds: number[];
  onChannels: (ids: number[]) => void;
  notifyOn: NotifyOnType;
  onNotifyOn: (value: NotifyOnType) => void;
}): JSX.Element {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const { data: channels = [] } = useQuery({
    queryKey: ['backup-connectors', 'channel'],
    queryFn: () => api.backup.connectors('channel')
  });
  const usable = channels.filter((c) => c.enabled);
  const toggle = (id: number): void =>
    onChannels(channelIds.includes(id) ? channelIds.filter((x) => x !== id) : [...channelIds, id]);

  return (
    <>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        {usable.map((c) => (
          <Chip
            key={c.id}
            data-testid={`channel-${c.id}`}
            label={c.name}
            clickable
            color={channelIds.includes(c.id) ? 'primary' : 'default'}
            variant={channelIds.includes(c.id) ? 'filled' : 'outlined'}
            onClick={() => toggle(c.id)}
          />
        ))}
        <Button size='small' onClick={() => setAdding(true)} data-testid='channel-add'>
          {locales.backup_notify_add_channel}
        </Button>
      </Box>

      {usable.length === 0 && (
        <Typography variant='caption' color='textSubdued'>
          {locales.backup_form_no_channels}
        </Typography>
      )}

      {channelIds.length > 0 && (
        <Segmented
          testId='notify-on'
          value={notifyOn}
          onChange={onNotifyOn}
          options={[
            { value: 'failure', label: locales.backup_notify_failure },
            { value: 'always', label: locales.backup_notify_always },
            { value: 'never', label: locales.backup_notify_never }
          ]}
        />
      )}

      {adding && (
        <ConnectorDialog
          kind='channel'
          onClose={() => setAdding(false)}
          onSaved={(saved) => {
            setAdding(false);
            void queryClient.invalidateQueries({ queryKey: ['backup-connectors', 'channel'] });
            onChannels([...new Set([...channelIds, saved.id])]);
          }}
        />
      )}
    </>
  );
}
