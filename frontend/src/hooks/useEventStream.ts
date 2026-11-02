import { reconcileBackgroundQuery, settleBackgroundQuery } from '@/core/events/backgroundQueries';
import { startEventStream } from '@/core/events/eventStream';
import { useBackgroundQueryStore } from '@/store/backgroundQuery/backgroundQuery.store';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

/** Keeps the one live stream open while the app is signed in, and turns what it says into cache updates. */
export const useEventStream = (enabled: boolean): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const refetchNotifications = (): Promise<void> => queryClient.invalidateQueries({ queryKey: ['notifications'] });

    return startEventStream({
      onJob: (event) => {
        void settleBackgroundQuery(event);
      },
      onNotification: () => void refetchNotifications(),
      onReconnect: () => {
        // Whatever ended while the stream was down: the inbox and the queries tabs are waiting on.
        void refetchNotifications();
        for (const query of Object.values(useBackgroundQueryStore.getState().byTab)) {
          void reconcileBackgroundQuery(query.jobId);
        }
      }
    });
  }, [enabled, queryClient]);
};
