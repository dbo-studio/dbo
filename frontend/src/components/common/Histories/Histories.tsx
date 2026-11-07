import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import Search from '@/components/base/Search/Search';
import { useContextMenu, useCurrentConnection } from '@/hooks';
import locales from '@/locales';
import type { HistoryType } from '@/types/History';
import VirtualList from '@/components/base/VirtualList/VirtualList';
import EmptyState from '@/components/base/EmptyState/EmptyState';
import {
  Box,
  Button,
  ClickAwayListener,
  IconButton,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useRef, useState } from 'react';
import DeleteHistoryIcon from './DeleteHistoryIcon';
import HistoryContextMenu from './HistoryContextMenu/HistoryContextMenu';
import {
  HistoriesContainerStyled,
  HistoriesListStyled,
  HistoriesLoadMoreStyled,
  HistoriesToolbarStyled
} from './Histories.styled';
import HistoryItem from './HistoryItem/HistoryItem';
import { groupByDay, statementKind, statementVerb } from './historyUtils';

type HistoryFilter = 'all' | 'read' | 'write';

const FILTERS: { id: HistoryFilter; label: string }[] = [
  { id: 'all', label: locales.history_filter_all },
  { id: 'read', label: locales.history_filter_read },
  { id: 'write', label: locales.history_filter_write }
];

const matchesFilter = (query: string, filter: HistoryFilter): boolean => {
  if (filter === 'all') return true;
  const isRead = statementKind(statementVerb(query)) === 'read';
  return filter === 'read' ? isRead : !isRead;
};

type HistoryResponse = HistoryType[];

export default function Histories(): JSX.Element {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<HistoryType | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const currentConnection = useCurrentConnection();
  const listRef = useRef<HTMLDivElement>(null);

  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status, refetch } = useInfiniteQuery<
    HistoryResponse,
    Error,
    { pages: HistoryResponse[]; pageParams: number[] }
  >({
    queryKey: ['histories', currentConnection?.id],
    queryFn: async ({ pageParam = 1 }): Promise<HistoryResponse> => {
      const res = await api.histories.getHistories({
        connectionId: currentConnection?.id ?? 0,
        page: pageParam as number,
        count: 20
      });
      return res;
    },
    getNextPageParam: (lastPage, allPages): number | undefined => {
      if (lastPage.length === 0) return undefined;
      return lastPage.length > 0 ? allPages.length + 1 : undefined;
    },
    enabled: !!currentConnection,
    initialPageParam: 1
  });

  const handleLoadMore = async (): Promise<void> => {
    const currentScrollPos = listRef.current?.scrollTop;
    await fetchNextPage();
    if (listRef.current && currentScrollPos !== undefined) {
      listRef.current.scrollTop = currentScrollPos;
    }
  };

  const handleRefresh = async (): Promise<void> => {
    await refetch();
    await queryClient.setQueryData(
      ['histories', currentConnection?.id],
      (data: { pages: HistoryResponse; pageParams: number[] }) => ({
        pages: [data?.pages[0]],
        pageParams: [1]
      })
    );
  };

  const allHistories = data?.pages.flat() ?? [];
  const needle = search.toLocaleLowerCase();
  const filteredHistories = allHistories.filter(
    (f) => f.query.toLocaleLowerCase().includes(needle) && matchesFilter(f.query, filter)
  );
  const rows = groupByDay(filteredHistories);

  return (
    <ClickAwayListener onClickAway={(): void => setSelected(null)}>
      <HistoriesContainerStyled data-testid='history-panel'>
        <HistoriesToolbarStyled spacing={1} direction={'row'}>
          <Box sx={{ flex: 1, maxWidth: 420 }}>
            <Search onChange={(name): void => setSearch(name)} />
          </Box>
          <ToggleButtonGroup
            exclusive
            size='small'
            value={filter}
            onChange={(_, value: HistoryFilter | null): void => {
              if (value) setFilter(value);
            }}
            aria-label={locales.history}
          >
            {FILTERS.map((f) => (
              <ToggleButton key={f.id} value={f.id} sx={{ px: 1.25, py: 0.25, textTransform: 'none' }}>
                {f.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Typography variant='caption' color='textSubdued' sx={{ flex: 1 }}>
            {locales.history_count.replace('{count}', String(filteredHistories.length))}
          </Typography>
          <Tooltip title={locales.refresh}>
            <IconButton size='small' aria-label={locales.refresh} onClick={() => void handleRefresh()}>
              <CustomIcon size='s' type={'refresh'} />
            </IconButton>
          </Tooltip>
          <DeleteHistoryIcon />
        </HistoriesToolbarStyled>

        <HistoriesListStyled ref={listRef}>
          {status === 'pending' ? (
            <LinearProgress data-testid='linear-progress' style={{ marginTop: '8px' }} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon='history'
              title={allHistories.length === 0 ? locales.history_empty_title : locales.history_no_results}
              description={allHistories.length === 0 ? locales.history_empty_hint : undefined}
            />
          ) : (
            <VirtualList
              items={rows}
              estimateSize={32}
              gap={2}
              scrollElementRef={listRef}
              getItemKey={(row) => row.key}
              renderItem={(row) =>
                row.kind === 'day' ? (
                  <Typography
                    variant='overline'
                    color='textSubdued'
                    sx={{ display: 'block', px: 1, pt: 1, lineHeight: 1.8 }}
                  >
                    {row.label} · {row.count}
                  </Typography>
                ) : (
                  <HistoryItem
                    context={handleContextMenu}
                    onClick={(): void => setSelected(row.history)}
                    history={row.history}
                    selected={selected?.id === row.history.id}
                  />
                )
              }
            />
          )}

          {hasNextPage && (
            <HistoriesLoadMoreStyled>
              <Button
                loadingPosition='start'
                disabled={isFetchingNextPage}
                loading={isFetchingNextPage}
                onClick={() => void handleLoadMore()}
                size='small'
                variant='outlined'
              >
                <span>{locales.load_more}</span>
              </Button>
            </HistoriesLoadMoreStyled>
          )}
        </HistoriesListStyled>

        {selected && (
          <HistoryContextMenu history={selected} contextMenu={contextMenuPosition} onClose={handleCloseContextMenu} />
        )}
      </HistoriesContainerStyled>
    </ClickAwayListener>
  );
}
