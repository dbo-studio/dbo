import api from '@/api';
import type { NotificationType } from '@/api/notification/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { notificationTitle, openNotification } from '@/core/notifications/openNotification';
import { useSwitchConnection } from '@/hooks/useSwitchConnection';
import locales from '@/locales';
import RunningJobs, { useRunningJobs } from '@/components/common/RunningJobs/RunningJobs';
import EmptyState from '@/components/base/EmptyState/EmptyState';
import { variables } from '@/core/theme/variables';
import { Badge, Button, IconButton, Popover, Tooltip, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, type JSX } from 'react';
import { useNotificationPanelStore } from '@/store/notificationPanel/notificationPanel.store';
import {
  NotificationBodyStyled,
  NotificationClampStyled,
  NotificationHeaderStyled,
  NotificationIconStyled,
  NotificationItemStyled,
  NotificationListStyled,
  NotificationPanelStyled
} from './NotificationBell.styled';

/** The notification center: finished and failed jobs, newest first; a click opens what they made. */
export default function NotificationBell(): JSX.Element {
  const queryClient = useQueryClient();
  const running = useRunningJobs();
  const { switchConnection } = useSwitchConnection();
  const panelOpen = useNotificationPanelStore((s) => s.open);
  const setPanelOpen = useNotificationPanelStore((s) => s.setOpen);
  const bellRef = useRef<HTMLButtonElement>(null);
  const anchor = panelOpen ? bellRef.current : null;
  const setAnchor = (el: HTMLElement | null): void => setPanelOpen(el !== null);
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notification.list(),
    refetchOnMount: true
  });
  const refresh = (): Promise<void> => queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const { mutate: readAll } = useMutation({ mutationFn: () => api.notification.markAllRead(), onSuccess: refresh });
  const { mutate: remove } = useMutation({
    mutationFn: (id: number) => api.notification.remove(id),
    onSuccess: refresh
  });

  const open = (n: NotificationType): void => {
    setAnchor(null);
    void api.notification.markRead(n.id).then(refresh);
    void openNotification(n, switchConnection);
  };

  return (
    <>
      <Tooltip title={locales.notifications}>
        <IconButton
          ref={bellRef}
          aria-label='notifications'
          onClick={(event) => setAnchor(event.currentTarget)}
          data-testid='notification-bell'
        >
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
        slotProps={{
          paper: {
            sx: (theme) => ({
              mt: 0.5,
              backgroundImage: 'none',
              background: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: variables.radius.medium,
              boxShadow: theme.shadows[8],
              overflow: 'hidden'
            })
          }
        }}
      >
        <NotificationPanelStyled data-testid='notification-panel'>
          <NotificationHeaderStyled>
            <Typography variant='subtitle2' color='textTitle' sx={{ flex: 1 }}>
              {locales.notifications}
            </Typography>
            <Button size='small' disabled={!data?.unread} onClick={() => readAll()} data-testid='notification-read-all'>
              {locales.notification_read_all}
            </Button>
          </NotificationHeaderStyled>
          <NotificationListStyled>
            <RunningJobs jobs={running} />
            {(data?.items ?? []).length === 0 && (
              <div data-testid='notification-empty'>
                <EmptyState icon='bell' title={locales.notification_empty} />
              </div>
            )}
            {(data?.items ?? []).map((n) => {
              const ok = n.kind === 'job_completed';

              return (
                <NotificationItemStyled
                  key={n.id}
                  unread={!n.read}
                  role='button'
                  tabIndex={0}
                  data-testid='notification-item'
                  data-read={n.read}
                  data-kind={n.kind}
                  onClick={() => open(n)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') open(n);
                  }}
                >
                  <NotificationIconStyled tone={ok ? 'success' : 'error'}>
                    <CustomIcon type={ok ? 'check' : 'close'} size='s' />
                  </NotificationIconStyled>
                  <NotificationBodyStyled>
                    <Typography variant='body2' color='textTitle' sx={{ fontWeight: n.read ? 400 : 600 }}>
                      {notificationTitle(n)}
                    </Typography>
                    {n.body && (
                      <Typography variant='caption' color='textSubdued' component='div'>
                        <NotificationClampStyled>{n.body}</NotificationClampStyled>
                      </Typography>
                    )}
                    <Typography variant='caption' color='textSecondary'>
                      {new Date(n.createdAt).toLocaleString()}
                    </Typography>
                  </NotificationBodyStyled>
                  <Tooltip title={locales.dashboard_delete}>
                    <IconButton
                      size='small'
                      className='notification-delete'
                      aria-label={locales.dashboard_delete}
                      onClick={(event) => {
                        event.stopPropagation();
                        remove(n.id);
                      }}
                      data-testid='notification-delete'
                    >
                      <CustomIcon type='close' size='xs' />
                    </IconButton>
                  </Tooltip>
                </NotificationItemStyled>
              );
            })}
          </NotificationListStyled>
        </NotificationPanelStyled>
      </Popover>
    </>
  );
}
