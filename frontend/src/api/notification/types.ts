export type NotificationType = {
  id: number;
  kind: 'job_completed' | 'job_failed' | 'subscription_paused';
  jobType: 'import' | 'export' | 'query' | 'subscription';
  title: string;
  body: string;
  jobId: number | null;
  read: boolean;
  createdAt: string;
};

export type NotificationListType = { items: NotificationType[]; unread: number };
