import { reconcileBackgroundQuery, settleBackgroundQuery } from '@/core/events/backgroundQueries';
import { startEventStream } from '@/core/events/eventStream';
import { useBackgroundQueryStore } from '@/store/backgroundQuery/backgroundQuery.store';
import { announce } from '@/core/notifications/announce';
import { openNotification } from '@/core/notifications/openNotification';
import api from '@/api';
import { useJobEventsStore } from '@/store/jobEvents/jobEvents.store';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useSwitchConnection } from './useSwitchConnection';

/** Keeps the one live stream open while the app is signed in, and turns what it says into cache updates. */
export const useEventStream = (enabled: boolean): void => {
  const queryClient = useQueryClient();
  const { switchConnection } = useSwitchConnection();
  // The stream outlives renders; what a click opens is read at the time of the click.
  const switchRef = useRef(switchConnection);
  useEffect(() => {
    switchRef.current = switchConnection;
  }, [switchConnection]);

  useEffect(() => {
    if (!enabled) return;

    const refetchNotifications = (): Promise<void> => queryClient.invalidateQueries({ queryKey: ['notifications'] });
    // Jobs that began before the stream opened, or while it was down, still count as running.
    const seedActiveJobs = (): void => {
      void api.job
        .active()
        .then((jobs) => jobs.forEach((job) => useJobEventsStore.getState().record({ ...job, error: job.error })))
        .catch(() => undefined);
    };
    seedActiveJobs();

    return startEventStream({
      onJob: (event) => {
        void settleBackgroundQuery(event);
      },
      onNotification: (notification) => {
        void refetchNotifications();
        void announce(notification, (n) => void openNotification(n, switchRef.current));
      },
      onReconnect: () => {
        // Whatever ended while the stream was down: the inbox and the queries tabs are waiting on.
        void refetchNotifications();
        seedActiveJobs();
        for (const query of Object.values(useBackgroundQueryStore.getState().byTab)) {
          void reconcileBackgroundQuery(query.jobId);
        }
      }
    });
  }, [enabled, queryClient]);
};
