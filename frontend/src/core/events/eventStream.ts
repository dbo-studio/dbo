import { api } from '@/core/api';
import type { NotificationType } from '@/api/notification/types';
import { useJobEventsStore, type JobEvent } from '@/store/jobEvents/jobEvents.store';

const JOB_EVENTS = ['job.running', 'job.progress', 'job.completed', 'job.failed', 'job.canceled'] as const;

type Handlers = {
  /** A job moved: progress, or its end. */
  onJob: (event: JobEvent) => void;
  /** An entry reached the notification center. */
  onNotification: (notification: NotificationType) => void;
  /** The stream is up again after a break: anything missed has to be fetched. */
  onReconnect: () => void;
};

/**
 * One live stream to the server. It only wakes the client up; results and the inbox are fetched from the
 * API, so an event lost to a break costs nothing (onReconnect refetches). EventSource reconnects by itself.
 */
export function startEventStream({ onJob, onNotification, onReconnect }: Handlers): () => void {
  const source = new EventSource(`${api.defaults.baseURL ?? '/api'}/events`, { withCredentials: true });
  let opened = false;

  source.onopen = (): void => {
    if (opened) onReconnect();
    opened = true;
  };

  for (const type of JOB_EVENTS) {
    source.addEventListener(type, (message) => {
      const event = JSON.parse((message as MessageEvent<string>).data) as JobEvent;
      useJobEventsStore.getState().record(event);
      onJob(event);
    });
  }

  source.addEventListener('notification.created', (message) =>
    onNotification(JSON.parse((message as MessageEvent<string>).data) as NotificationType)
  );

  return () => source.close();
}
