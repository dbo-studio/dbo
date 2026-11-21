import type { DashboardType } from '@/api/dashboard/types';
import { useQueryClient } from '@tanstack/react-query';

/** Writes a board the server returned into the cached list, so every view of it updates. */
export const useSetBoard = (connectionId: number): ((next: DashboardType) => void) => {
  const queryClient = useQueryClient();

  return (next) =>
    queryClient.setQueryData<DashboardType[]>(['dashboards', connectionId], (boards) =>
      boards?.map((item) => (item.id === next.id ? next : item))
    );
};
