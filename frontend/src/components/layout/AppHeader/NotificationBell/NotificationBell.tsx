import api from '@/api';
import type { NotificationType } from '@/api/notification/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { notificationTitle, openNotification } from '@/core/notifications/openNotification';
import { useSwitchConnection } from '@/hooks/useSwitchConnection';
import locales from '@/locales';
import { Badge, Box, Button, IconButton, Popover, Stack, Tooltip, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type JSX } from 'react';

/** The notification center: finished and failed jobs, newest first; a click opens what they made. */
export default function NotificationBell(): JSX.Element {
  const queryClient = useQueryClient();
  const { switchConnection } = useSwitchConnection();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { data } = useQuery({ queryKey: ['notifications'], queryFn: () => api.notification.list(), refetchOnMount: true });
  const refresh = (): Promise<void> => queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const { mutate: readAll } = useMutation({ mutationFn: () => api.notification.markAllRead(), onSuccess: refresh });
  const { mutate: remove } = useMutation({ mutationFn: (id: number) => api.notification.remove(id), onSuccess: refresh });

  const open = (n: NotificationType): void => {
    setAnchor(null);
    void api.notification.markRead(n.id).then(refresh);
    void openNotification(n, switchConnection);
  };

  return (
    <>
      <Tooltip title={locales.notifications}>
        <IconButton aria-label='notifications' onClick={(event) => setAnchor(event.currentTarget)} data-testid='notification-bell'>
          <Badge badgeContent={data?.unread ?? 0} color='primary' max={99} data-testid='notification-unread'>
            <CustomIcon type='bell' size='m' />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ width: 360, maxHeight: 440, overflow: 'auto' }} data-testid='notification-panel'>
          <Stack direction='row' sx={{ alignItems: 'center', p: 1.5, pb: 0.5 }}>
            <Typography variant='subtitle2' sx={{ flex: 1 }}>
              {locales.notifications}
            </Typography>
            <Button size='small' disabled={!data?.unread} onClick={() => readAll()} data-testid='notification-read-all'>
              {locales.notification_read_all}
            </Button>
          </Stack>
          {(data?.items ?? []).length === 0 && (
            <Typography variant='body2' color='textSubdued' sx={{ p: 1.5 }} data-testid='notification-empty'>
              {locales.notification_empty}
            </Typography>
          )}
          {(data?.items ?? []).map((n) => (
            <Stack
              key={n.id}
              direction='row'
              spacing={1}
              data-testid='notification-item'
              data-read={n.read}
              data-kind={n.kind}
              sx={{ alignItems: 'flex-start', px: 1.5, py: 1, cursor: 'pointer', opacity: n.read ? 0.7 : 1, '&:hover': { bgcolor: 'action.hover' } }}
              onClick={() => open(n)}
            >
              <Box sx={{ pt: 0.25, color: n.kind === 'job_failed' ? 'error.main' : 'success.main' }}>
                <CustomIcon type={n.kind === 'job_failed' ? 'close' : 'check'} size='s' />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant='body2' sx={{ fontWeight: n.read ? 400 : 600 }}>
                  {notificationTitle(n)}
                </Typography>
                {n.body && (
                  <Typography variant='caption' color='textSubdued' noWrap component='div'>
                    {n.body}
                  </Typography>
                )}
                <Typography variant='caption' color='textSubdued'>
                  {new Date(n.createdAt).toLocaleString()}
                </Typography>
              </Box>
              <IconButton
                size='small'
                aria-label={locales.dashboard_delete}
                onClick={(event) => {
                  event.stopPropagation();
                  remove(n.id);
                }}
                data-testid='notification-delete'
              >
                <CustomIcon type='close' size='xs' />
              </IconButton>
            </Stack>
          ))}
        </Box>
      </Popover>
    </>
  );
}
