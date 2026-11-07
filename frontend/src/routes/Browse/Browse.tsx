import api from '@/api';
import ResizableXBox from '@/components/base/ResizableBox/ResizableXBox';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { isMongoDriver } from '@/core/db/connectionAliases';
import { useCurrentConnection } from '@/hooks';
import { canUseCli } from '@/core/auth/permissions';
import { openBottomPanel } from '@/core/bottomPanel';
import { useAuthStore } from '@/store/authStore/auth.store';
import type {
  NoSQLBrowseFilter,
  NoSQLBrowseSort,
  NoSQLCapability,
  NoSQLContainerSpec,
  NoSQLViewKind
} from '@/api/nosql/types';
import Filters from '@/components/common/Filters/Filters';
import Sorts from '@/components/common/Sorts/Sorts';
import { TOOL_TITLES } from '@/core/constants/nosqlTools';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import { useSelectedTab } from '@/hooks';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { BrowseTabType, FilterType } from '@/types/Tab';
import type { ColumnType } from '@/types/Data';
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Popover,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useMemo, useState } from 'react';
import { toast } from 'sonner';
import BulkDeleteDialog from './BulkDeleteDialog';
import ItemHeader from './ItemHeader';
import { itemFacts } from './itemMeta';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import KeyList from './KeyList';
import { buildKeyRows } from './keyTree';
import StatsDialog from './StatsDialog';
import RecycleDialog from './RecycleDialog';
import MemberWindowView from './MemberWindowView';
import ItemView from './ItemView';

const PAGE_SIZE = 100;
const DEFAULT_LIST_WIDTH = 320;

type Applied = { filter: string; filters: NoSQLBrowseFilter[]; sorts: NoSQLBrowseSort[] };
const NO_FILTER: Applied = { filter: '', filters: [], sorts: [] };

const has = (spec: NoSQLContainerSpec | undefined, cap: NoSQLCapability): boolean =>
  !!spec?.capabilities?.includes(cap);

/** Starter value per view; collection types need one element because most stores cannot hold empty ones. */
const STARTER: Record<string, unknown> = {
  text: '',
  document: '{}',
  fields: { field: 'value' },
  list: ['value'],
  set: ['member']
};

function createPayload(
  spec: NoSQLContainerSpec | undefined,
  kindId: string,
  id: string,
  fallbackView: NoSQLViewKind | undefined
): { id: string; view: NoSQLViewKind; value: unknown; meta?: Record<string, unknown> } {
  const kind = spec?.createKinds?.find((k) => k.id === (kindId || spec.createKinds?.[0]?.id));
  const view = kind?.view ?? fallbackView ?? 'text';
  const scored = kind?.id === 'zset';

  return {
    id,
    view,
    value: scored ? [{ member: 'member', score: 0 }] : STARTER[view],
    meta: kind ? { kind: kind.id } : undefined
  };
}

const toApplied = (tab: BrowseTabType): Applied => ({
  filter: (tab.filters ?? [])
    .filter((f) => f.isActive)
    .map((f, i, all) => `${f.column} ${f.operator} "${f.value}"${i < all.length - 1 ? ` ${f.next}` : ''}`)
    .join(' '),
  filters: (tab.filters ?? [])
    .filter((f: FilterType) => f.isActive)
    .map((f) => ({ field: f.column, operator: f.operator, value: String(f.value), next: f.next })),
  sorts: (tab.sorts ?? []).filter((s) => s.isActive).map((s) => ({ field: s.column, desc: s.operator === 'DESC' }))
});

export default function Browse(): JSX.Element {
  const tab = useSelectedTab<BrowseTabType>();
  const qc = useQueryClient();
  const confirmDanger = useConfirmModalStore((state) => state.danger);
  const addToolTab = useTabStore((state) => state.addToolTab);
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const cliAllowed = canUseCli(mode, user);
  const isMongo = isMongoDriver(useCurrentConnection()?.type);
  const listWidth = useSettingStore((s) => s.ui.browseListWidth);
  const updateUI = useSettingStore((s) => s.updateUI);

  const connectionId = Number(tab?.connectionId);
  const containerId = tab?.nodeId ?? '';

  const [applied, setApplied] = useState<Applied>(NO_FILTER);
  const [pattern, setPattern] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [newId, setNewId] = useState('');
  const [newKind, setNewKind] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [recycleOpen, setRecycleOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const [createAnchor, setCreateAnchor] = useState<HTMLElement | null>(null);

  const { data: spec } = useQuery({
    queryKey: ['nosql', 'describe', connectionId, containerId],
    queryFn: () => api.nosql.describe(connectionId, containerId),
    enabled: !!tab
  });

  const page = useInfiniteQuery({
    queryKey: ['nosql', 'browse', connectionId, containerId, applied],
    queryFn: ({ pageParam }) =>
      api.nosql.browse({ connectionId, containerId, cursor: pageParam, limit: PAGE_SIZE, ...applied }),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor || undefined,
    enabled: !!tab && !!spec
  });

  const items = useMemo(() => page.data?.pages.flatMap((p) => p.items) ?? [], [page.data]);
  const rows = useMemo(
    () => buildKeyRows(items, spec?.listStyle === 'tree' ? spec.delimiter : '', expanded),
    [items, spec, expanded]
  );

  const { data: item } = useQuery({
    queryKey: ['nosql', 'item', connectionId, containerId, selectedId],
    queryFn: () => api.nosql.getItem({ connectionId, containerId, itemId: selectedId ?? '' }),
    enabled: !!selectedId
  });

  const refresh = async (): Promise<void> => {
    await qc.invalidateQueries({ queryKey: ['nosql', 'browse', connectionId, containerId] });
    await qc.invalidateQueries({ queryKey: ['nosql', 'item', connectionId, containerId] });
  };

  const run = async (action: () => Promise<unknown>, successMessage?: string): Promise<void> => {
    try {
      const result = await action();
      if (result === undefined) return;
      await refresh();
      if (successMessage) toast.success(successMessage);
    } catch {
      toast.error(locales.action_failed);
    }
  };

  const save = (change: { value?: unknown; newId?: string; ttlSecs?: number }): Promise<void> =>
    run(
      () =>
        withSafeModeRetry(async (confirmed) => {
          await api.nosql.saveItem({ connectionId, containerId, itemId: selectedId ?? '', change, confirmed });
          return true;
        }),
      locales.nosql_saved
    );

  const insert = (): Promise<void> =>
    run(
      () =>
        withSafeModeRetry(async (confirmed) => {
          const id = await api.nosql.insertItem({
            connectionId,
            containerId,
            item: createPayload(spec, newKind, newId, items[0]?.view),
            confirmed
          });
          setNewId('');
          setSelectedId(id);
          return true;
        }),
      locales.nosql_saved
    );

  const remove = (): void => {
    if (!selectedId) return;
    confirmDanger(locales.nosql_delete_item, locales.nosql_delete_confirm.replace('{id}', selectedId), () => {
      void run(
        () =>
          withSafeModeRetry(async (confirmed) => {
            await api.nosql.deleteItems({ connectionId, containerId, itemIds: [selectedId], confirmed });
            setSelectedId(null);
            return true;
          }),
        locales.action_executed_successfully
      );
    });
  };

  // A document store generates the id when none is typed.
  const idOptional = (spec?.createKinds ?? []).find((k) => k.id === (newKind || spec?.createKinds?.[0]?.id))?.view === 'document';

  const columns = useMemo(
    () => (spec?.fields ?? []).map((f) => ({ name: f.name, type: f.types.join(' | ') }) as ColumnType),
    [spec]
  );

  const moreItems: { id: string; label: string; danger?: boolean; run: () => void }[] = [
    ...(spec?.tools ?? [])
      .filter((toolId) => toolId !== 'cli' || cliAllowed)
      .map((toolId) => ({
        id: toolId,
        label: TOOL_TITLES[toolId] ?? toolId,
        run: (): void => {
          if (toolId === 'cli') openBottomPanel('terminal');
          else void addToolTab(toolId, TOOL_TITLES[toolId] ?? locales.nosql_tool_unknown);
        }
      })),
    ...(has(spec, 'stats')
      ? [{ id: 'stats', label: locales.nosql_stats_title, run: (): void => setStatsOpen(true) }]
      : []),
    ...(has(spec, 'recycle')
      ? [{ id: 'recycle', label: locales.nosql_recycle_title, run: (): void => setRecycleOpen(true) }]
      : []),
    ...(has(spec, 'bulk-delete-pattern') && applied.filter && applied.filter !== '*'
      ? [{ id: 'bulk', label: locales.nosql_bulk_delete, danger: true, run: (): void => setBulkOpen(true) }]
      : [])
  ];

  if (!tab) return <></>;

  const applyFields = (): void => setApplied(toApplied(useTabStore.getState().selectedTab<BrowseTabType>() ?? tab));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }} data-testid='browse-tab'>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', p: 1, display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1 }}>
          {spec?.filter === 'pattern' && (
            <TextField
              size='small'
              fullWidth
              placeholder={locales.nosql_filter_pattern}
              value={pattern}
              onChange={(e): void => setPattern(e.target.value)}
              onKeyDown={(e): void => {
                if (e.key === 'Enter') setApplied({ ...NO_FILTER, filter: pattern });
              }}
              slotProps={{ htmlInput: { 'aria-label': 'browse-pattern' } }}
            />
          )}
          {spec?.filter === 'query' && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size='small'
                fullWidth
                multiline
                placeholder={locales.nosql_filter_query}
                value={query}
                onChange={(e): void => setQuery(e.target.value)}
                slotProps={{ htmlInput: { 'aria-label': 'browse-query' } }}
              />
              <Button variant='contained' onClick={(): void => setApplied({ ...NO_FILTER, filter: query })}>
                {locales.nosql_run}
              </Button>
            </Box>
          )}
          {spec?.filter === 'fields' && (
            <Box data-testid='browse-fields-filter'>
              <Filters columns={columns} onApply={applyFields} />
              <Sorts columns={columns} onApply={applyFields} />
              {applied.filter && (
                <Typography variant='caption' color='text.secondary' data-testid='browse-generated-query'>
                  {locales.nosql_generated_query}: <code>{applied.filter}</code>
                </Typography>
              )}
            </Box>
          )}
        </Box>
        {spec && has(spec, 'insert') && (
          <Button
            size='small'
            variant='outlined'
            startIcon={<CustomIcon type='plus' size='s' />}
            onClick={(e): void => setCreateAnchor(e.currentTarget)}
            data-testid='new-key-button'
          >
            {isMongo ? locales.nosql_new_document : locales.nosql_new_key}
          </Button>
        )}
        {moreItems.length > 0 && (
          <Tooltip title={locales.nosql_more_actions}>
            <IconButton
              size='small'
              aria-label={locales.nosql_more_actions}
              onClick={(e): void => setMoreAnchor(e.currentTarget)}
            >
              <CustomIcon type='ellipsisVertical' size='s' />
            </IconButton>
          </Tooltip>
        )}
        <Menu anchorEl={moreAnchor} open={!!moreAnchor} onClose={(): void => setMoreAnchor(null)}>
          {moreItems.map((m) => (
            <MenuItem
              key={m.id}
              sx={m.danger ? { color: 'error.main' } : undefined}
              onClick={(): void => {
                setMoreAnchor(null);
                m.run();
              }}
            >
              {m.label}
            </MenuItem>
          ))}
        </Menu>
        <Popover
          open={!!createAnchor}
          anchorEl={createAnchor}
          onClose={(): void => setCreateAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Box sx={{ p: 2, width: 340, display: 'flex', flexDirection: 'column', gap: 1.5 }} data-testid='create-popover'>
            <Typography variant='subtitle2' color='textTitle'>
              {isMongo ? locales.nosql_new_document : locales.nosql_new_key}
            </Typography>
            {(spec?.createKinds?.length ?? 0) > 0 && (
              <SelectInput
                label={locales.nosql_key_type}
                testId='new-item-kind'
                value={newKind || spec?.createKinds?.[0]?.id}
                options={(spec?.createKinds ?? []).map((k) => ({ value: k.id, label: k.label }))}
                onChange={(o): void => setNewKind(String((o as { value: unknown }).value))}
              />
            )}
            <FieldInput
              autoFocus
              fullWidth
              label={locales.nosql_item_id}
              placeholder={locales.nosql_key_placeholder}
              value={newId}
              onChange={(e): void => setNewId(e.target.value)}
              onKeyDown={(e): void => {
                if (e.key === 'Enter' && (newId || idOptional)) void insert().then(() => setCreateAnchor(null));
              }}
              inputProps={{ 'aria-label': 'new-item-id' }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 0.5 }}>
              <Button size='small' onClick={(): void => setCreateAnchor(null)}>
                {locales.cancel}
              </Button>
              <Button
                size='small'
                variant='contained'
                disabled={!newId && !idOptional}
                onClick={(): void => void insert().then(() => setCreateAnchor(null))}
              >
                {locales.nosql_create}
              </Button>
            </Box>
          </Box>
        </Popover>
      </Box>

      {statsOpen && <StatsDialog connectionId={connectionId} containerId={containerId} onClose={(): void => setStatsOpen(false)} />}
      {recycleOpen && (
        <RecycleDialog
          connectionId={connectionId}
          onClose={(): void => setRecycleOpen(false)}
          onRestored={(): void => void refresh()}
        />
      )}
      {bulkOpen && (
        <BulkDeleteDialog
          connectionId={connectionId}
          containerId={containerId}
          pattern={applied.filter}
          onClose={(): void => setBulkOpen(false)}
          onStarted={(): void => {
            setSelectedId(null);
            void refresh();
          }}
        />
      )}
      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <ResizableXBox
          direction='rtl'
          width={listWidth}
          defaultWidth={DEFAULT_LIST_WIDTH}
          maxWidth={Math.round(window.innerWidth * 0.7)}
          sx={{ flexShrink: 0, borderRight: 1, borderColor: 'divider' }}
          onChange={(width): void => updateUI({ browseListWidth: Math.max(width, 160) })}
        >
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <KeyList
                rows={rows}
                expanded={expanded}
                selectedId={selectedId}
                loading={page.isFetching}
                onSelect={(it): void => setSelectedId(it.id)}
                onToggle={(folder): void => {
                  const next = new Set(expanded);
                  if (!next.delete(folder)) next.add(folder);
                  setExpanded(next);
                }}
              />
            </Box>
            {page.hasNextPage && (
              <Button fullWidth disabled={page.isFetchingNextPage} onClick={(): void => void page.fetchNextPage()}>
                {locales.nosql_load_more}
              </Button>
            )}
          </Box>
        </ResizableXBox>

        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }} data-testid='browse-item-view'>
          {item ? (
            <>
              <ItemHeader
                item={item}
                canRename={has(spec, 'rename')}
                canTtl={has(spec, 'ttl')}
                canDelete={has(spec, 'delete')}
                onRename={(to): void => {
                  void save({ newId: to }).then(() => setSelectedId(to));
                }}
                onTtl={(seconds): void => void save({ ttlSecs: seconds })}
                onDelete={remove}
              />
              <Box sx={{ flex: 1, minHeight: 0 }}>
                {has(spec, 'window') && ['hash', 'list', 'set', 'zset'].includes(String(item.meta?.type)) ? (
                  <MemberWindowView
                    key={item.id}
                    item={item}
                    connectionId={connectionId}
                    containerId={containerId}
                    editable={has(spec, 'edit') && !item.meta?.readonly}
                  />
                ) : (
                  <ItemView
                    key={`${item.id}:${JSON.stringify(item.value)}`}
                    item={item}
                    editable={has(spec, 'edit') && !item.meta?.readonly}
                    onSave={(value): void => void save({ value })}
                  />
                )}
              </Box>
            </>
          ) : (
            <Typography sx={{ p: 2 }} color='text.secondary'>
              {locales.nosql_select_item}
            </Typography>
          )}
        </Box>
      </Box>

      <Box
        sx={{ borderTop: 1, borderColor: 'divider', px: 1, py: 0.5, display: 'flex', gap: 2 }}
        data-testid='browse-footer'
      >
        <Typography variant='caption'>{locales.nosql_loaded_count.replace('{count}', String(items.length))}</Typography>
        {itemFacts(item).map((fact) => (
          <Typography key={fact} variant='caption' color='text.secondary'>
            {fact}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}
