import api from '@/api';
import type { TreeSearchResponseType } from '@/api/tree/types';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDebounceValue } from 'usehooks-ts';

const SEARCH_DEBOUNCE_MS = 250;

type TreeSearchState = {
  data: TreeSearchResponseType | undefined;
  /** True while the latest typed term has not produced server results yet. */
  isSearching: boolean;
};

/** Server-side name search across the whole tree, including folders the user never opened. */
export function useTreeSearch(connectionId: number | undefined, term: string): TreeSearchState {
  const trimmed = term.trim();
  const [debounced] = useDebounceValue(trimmed, SEARCH_DEBOUNCE_MS);

  const query = useQuery({
    queryKey: ['treeSearch', connectionId, debounced],
    queryFn: () => api.tree.searchTree({ connectionId: connectionId ?? 0, query: debounced }),
    enabled: Boolean(connectionId) && debounced.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000
  });

  if (!trimmed) return { data: undefined, isSearching: false };

  return {
    data: query.data,
    isSearching: debounced !== trimmed || query.isFetching
  };
}
