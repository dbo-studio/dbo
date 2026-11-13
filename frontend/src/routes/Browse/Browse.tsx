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
import { Box, Button, IconButton, Menu, MenuItem, Popover, Tooltip, Typography } from '@mui/material';
import InlineSqlEditor from '@/components/base/InlineSqlEditor/InlineSqlEditor';
import { setMongoContext } from '@/components/base/MongoEditor/mongoCompletions';
import { InlineQueryStackStyled, SubmitButtonStyled } from '@/components/base/InlineSqlEditor/InlineBar.styled';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { type JSX, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import BulkDeleteDialog from './BulkDeleteDialog';
import ItemHeader from './ItemHeader';
import { itemFacts } from './itemMeta';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import KeyList from './KeyList';
import { buildKeyRows } from './keyTree';
import StatsDialog from './StatsDialog';
import IndexesDialog from './IndexesDialog';
import ExplainDialog from './ExplainDialog';
import AggregateDialog from './AggregateDialog';
import SchemaDialog from './SchemaDialog';
import RenameCollectionDialog from './RenameCollectionDialog';
import { tools } from '@/core/utils/tools';
import { useAiBridge } from '@/hooks/useAiBridge';
import { useFeaturePermissions } from '@/hooks/useFeaturePermissions';
import { useTreeStore } from '@/store/treeStore/tree.store';
import RecycleDialog from './RecycleDialog';
import MemberWindowView from './MemberWindowView';
import ItemView from './ItemView';
import { StatusBarStyled } from '@/components/common/DataGridStatusBar/StatusBar.styled';
import { StatusBarActionsStackStyled } from '@/components/common/DataGridStatusBar/StatusBarActions.styled';
import { shortcuts } from '@/core/utils';

const chordLabel = (label: string, command: string[]): string => `${label} (${command.join('+')})`;

const PAGE_SIZE = 100;
const DEFAULT_LIST_WIDTH = 320;

type Applied = { filter: string; filters: NoSQLBrowseFilter[]; sorts: NoSQLBrowseSort[]; projection?: string };
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

/** Reads a Mongo sort document ({"age": -1}) as ordered sorts; throws on anything else. */
const parseSort = (text: string): NoSQLBrowseSort[] => {
  if (!text.trim()) return [];
  const doc: unknown = JSON.parse(text);
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw new Error('sort');
  return Object.entries(doc).map(([field, dir]) => {
    if (dir !== 1 && dir !== -1) throw new Error('sort');
    return { field, desc: dir === -1 };
  });
};

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
  const [sortText, setSortText] = useState('');
  const [projectText, setProjectText] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [newId, setNewId] = useState('');
  const [newKind, setNewKind] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [recycleOpen, setRecycleOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [indexesOpen, setIndexesOpen] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
  const [aggOpen, setAggOpen] = useState(false);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const aiAllowed = useFeaturePermissions().ai;
  const { prefillChat } = useAiBridge();
  const removeTab = useTabStore((state) => state.removeTab);
  const reloadTree = useTreeStore((state) => state.reloadTree);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const [createAnchor, setCreateAnchor] = useState<HTMLElement | null>(null);
  const [statusSlot, setStatusSlot] = useState<HTMLElement | null>(null);

  const { data: spec } = useQuery({
    queryKey: ['nosql', 'describe', connectionId, containerId],
    queryFn: () => api.nosql.describe(connectionId, containerId),
    enabled: !!tab
  });

  // The Mongo filter bar completes this collection's field names.
  useEffect(() => {
    if (spec?.filter !== 'query') return;
    setMongoContext({
      collections: [],
      fields: () => Promise.resolve([]),
      filterFields: (spec.fields ?? []).map((f) => f.name)
    });
    return () => setMongoContext(undefined);
  }, [spec]);

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
  const idOptional =
    (spec?.createKinds ?? []).find((k) => k.id === (newKind || spec?.createKinds?.[0]?.id))?.view === 'document';

  const memberView = has(spec, 'window') && ['hash', 'list', 'set', 'zset'].includes(String(item?.meta?.type));

  const columns = useMemo(
    () => (spec?.fields ?? []).map((f) => ({ name: f.name, type: f.types.join(' | ') }) as ColumnType),
    [spec]
  );

  const collectionName = containerId.split('/').slice(1).join('/');

  const exportDocs = async (format: 'ndjson' | 'csv' = 'ndjson'): Promise<void> => {
    try {
      const blob = await api.nosql.exportCollection(connectionId, containerId, applied.filter || undefined, format);
      tools.fileDownload(blob, `${collectionName}.${format}`);
    } catch {
      toast.error(locales.action_failed);
    }
  };

  /** Uploads the file and follows its background job, so a large import neither blocks the app nor sits in memory. */
  const importFile = async (file: File): Promise<void> => {
    const name = file.name.toLowerCase();
    const format = name.endsWith('.csv') ? 'csv' : name.endsWith('.json') ? 'json' : 'ndjson';

    try {
      const jobId = await withSafeModeRetry((confirmed) =>
        api.nosql.importFile(connectionId, containerId, file, format, confirmed)
      );
      if (jobId === undefined) return;
      toast.info(locales.nosql_import_started);

      for (;;) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const job = await api.job.detail(String(jobId));
        if (job.status === 'pending' || job.status === 'running') continue;

        await refresh();
        if (job.status === 'completed') {
          toast.success(locales.nosql_imported.replace('{n}', String(job.result?.successRows ?? 0)));
        } else {
          toast.error(locales.nosql_import_failed.replace('{message}', job.error ?? job.message));
        }
        return;
      }
    } catch {
      toast.error(locales.action_failed);
    }
  };

  const closeAfterStructureChange = async (): Promise<void> => {
    if (tab) removeTab(tab.id);
    await reloadTree(false);
  };

  const dropCollection = (): void =>
    confirmDanger(
      locales.nosql_drop_collection,
      locales.nosql_drop_collection_confirm.replace('{name}', collectionName),
      () => {
        void withSafeModeRetry(async (confirmed) => {
          await api.nosql.dropCollection(connectionId, containerId, confirmed);
          return true;
        })
          .then((done) => (done ? closeAfterStructureChange() : undefined))
          .catch(() => toast.error(locales.action_failed));
      }
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
    ...(aiAllowed
      ? [
          {
            id: 'ai-collection',
            label: isMongo ? locales.ai_ask_collection : locales.ai_ask_database,
            run: (): void => {
              const message = `Tell me about ${isMongo ? 'the collection' : 'the Redis database'} ${containerId}.`;
              prefillChat(message, true, { input: message });
            }
          },
          ...(selectedId
            ? [
                {
                  id: 'ai-item',
                  label: locales.ai_ask_item,
                  run: (): void => {
                    const message = isMongo
                      ? `Explain the document with _id ${selectedId} in ${containerId}.`
                      : `Explain the key ${selectedId} in ${containerId}.`;
                    prefillChat(message, true, { input: message });
                  }
                }
              ]
            : [])
        ]
      : []),
    ...(has(spec, 'transfer')
      ? [
          { id: 'export', label: locales.nosql_export, run: (): void => void exportDocs('ndjson') },
          { id: 'export-csv', label: locales.nosql_export_csv, run: (): void => void exportDocs('csv') },
          { id: 'import', label: locales.nosql_import, run: (): void => importRef.current?.click() }
        ]
      : []),
    ...(has(spec, 'collection-admin')
      ? [
          { id: 'rename', label: locales.nosql_rename_collection, run: (): void => setRenameOpen(true) },
          { id: 'drop', label: locales.nosql_drop_collection, danger: true, run: dropCollection }
        ]
      : []),
    ...(has(spec, 'schema')
      ? [{ id: 'schema', label: locales.nosql_schema, run: (): void => setSchemaOpen(true) }]
      : []),
    ...(has(spec, 'aggregate')
      ? [{ id: 'aggregate', label: locales.nosql_aggregate, run: (): void => setAggOpen(true) }]
      : []),
    ...(has(spec, 'indexes')
      ? [
          { id: 'indexes', label: locales.nosql_indexes_title, run: (): void => setIndexesOpen(true) },
          { id: 'explain', label: locales.nosql_explain, run: (): void => setExplainOpen(true) }
        ]
      : []),
    ...(has(spec, 'recycle')
      ? [{ id: 'recycle', label: locales.nosql_recycle_title, run: (): void => setRecycleOpen(true) }]
      : []),
    ...(has(spec, 'bulk-delete-pattern') && applied.filter && applied.filter !== '*'
      ? [{ id: 'bulk', label: locales.nosql_bulk_delete, danger: true, run: (): void => setBulkOpen(true) }]
      : [])
  ];

  if (!tab) return <></>;

  const applyText = (text: string): void => {
    if (spec?.filter !== 'query') return setApplied({ ...NO_FILTER, filter: text });
    try {
      setApplied({ ...NO_FILTER, filter: text, sorts: parseSort(sortText), projection: projectText.trim() });
    } catch {
      toast.error(locales.nosql_sort_invalid);
    }
  };

  const applyFields = (): void => setApplied(toApplied(useTabStore.getState().selectedTab<BrowseTabType>() ?? tab));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }} data-testid='browse-tab'>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', p: 1, display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1 }}>
          {(spec?.filter === 'pattern' || spec?.filter === 'query') && (
            <InlineQueryStackStyled direction='row' data-testid='browse-filter-bar'>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <InlineSqlEditor
                  language={spec.filter === 'query' ? 'json' : 'plaintext'}
                  placeholder={spec.filter === 'query' ? locales.nosql_filter_query : locales.nosql_filter_pattern}
                  value={spec.filter === 'query' ? query : pattern}
                  onChange={spec.filter === 'query' ? setQuery : setPattern}
                  onEnter={applyText}
                />
              </Box>
              {spec.filter === 'query' && (
                <>
                  <Box sx={{ flex: 0.6, minWidth: 0, ml: 1 }} data-testid='browse-sort-bar'>
                    <InlineSqlEditor
                      language='json'
                      placeholder={locales.nosql_sort_query}
                      value={sortText}
                      onChange={setSortText}
                      onEnter={(): void => applyText(query)}
                    />
                  </Box>
                  <Box sx={{ flex: 0.6, minWidth: 0, ml: 1 }} data-testid='browse-project-bar'>
                    <InlineSqlEditor
                      language='json'
                      placeholder={locales.nosql_project_query}
                      value={projectText}
                      onChange={setProjectText}
                      onEnter={(): void => applyText(query)}
                    />
                  </Box>
                </>
              )}
              <SubmitButtonStyled
                variant='contained'
                aria-label={locales.nosql_run}
                data-testid='browse-filter-run'
                onClick={(): void => applyText(spec.filter === 'query' ? query : pattern)}
              >
                <CustomIcon type='check' size='s' />
              </SubmitButtonStyled>
            </InlineQueryStackStyled>
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
        {moreItems.length > 0 && (
          <Tooltip title={locales.nosql_more_actions}>
            <IconButton aria-label={locales.nosql_more_actions} onClick={(e): void => setMoreAnchor(e.currentTarget)}>
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
          anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Box
            sx={{ p: 2, width: 340, display: 'flex', flexDirection: 'column', gap: 1.5 }}
            data-testid='create-popover'
          >
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
              <Button onClick={(): void => setCreateAnchor(null)}>{locales.cancel}</Button>
              <Button
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

      {statsOpen && (
        <StatsDialog connectionId={connectionId} containerId={containerId} onClose={(): void => setStatsOpen(false)} />
      )}
      {indexesOpen && (
        <IndexesDialog
          connectionId={connectionId}
          containerId={containerId}
          canEdit={has(spec, 'edit')}
          onClose={(): void => setIndexesOpen(false)}
        />
      )}
      <input
        ref={importRef}
        type='file'
        hidden
        accept='.json,.ndjson,.jsonl,.csv'
        data-testid='import-file'
        onChange={(e): void => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void importFile(file);
        }}
      />
      {renameOpen && (
        <RenameCollectionDialog
          connectionId={connectionId}
          containerId={containerId}
          name={collectionName}
          onClose={(): void => setRenameOpen(false)}
          onRenamed={(): void => {
            setRenameOpen(false);
            void closeAfterStructureChange();
          }}
        />
      )}
      {schemaOpen && (
        <SchemaDialog
          connectionId={connectionId}
          containerId={containerId}
          canEdit={has(spec, 'edit')}
          onClose={(): void => setSchemaOpen(false)}
        />
      )}
      {aggOpen && (
        <AggregateDialog
          connectionId={connectionId}
          containerId={containerId}
          onClose={(): void => setAggOpen(false)}
        />
      )}
      {explainOpen && (
        <ExplainDialog
          connectionId={connectionId}
          containerId={containerId}
          filter={applied.filter}
          sorts={applied.sorts}
          onClose={(): void => setExplainOpen(false)}
        />
      )}
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
                onRename={(to): void => {
                  void save({ newId: to }).then(() => setSelectedId(to));
                }}
                onTtl={(seconds): void => void save({ ttlSecs: seconds })}
              />
              <Box sx={{ flex: 1, minHeight: 0 }}>
                {memberView ? (
                  <MemberWindowView
                    key={item.id}
                    item={item}
                    connectionId={connectionId}
                    containerId={containerId}
                    editable={has(spec, 'edit') && !item.meta?.readonly}
                    statusSlot={statusSlot}
                  />
                ) : (
                  <ItemView
                    key={item.view === 'document' ? item.id : `${item.id}:${JSON.stringify(item.value)}`}
                    item={item}
                    editable={has(spec, 'edit') && !item.meta?.readonly}
                    onSave={(value): void => void save({ value })}
                    tree={
                      has(spec, 'doc-tree') && item.view === 'document'
                        ? {
                            connectionId,
                            containerId,
                            onMutated: (): void =>
                              void qc.invalidateQueries({ queryKey: ['nosql', 'item', connectionId, containerId] })
                          }
                        : undefined
                    }
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

      <StatusBarStyled direction='row' data-testid='browse-footer'>
        <StatusBarActionsStackStyled sx={{ width: 'auto', gap: 0.5 }}>
          {has(spec, 'insert') && (
            <Tooltip title={isMongo ? locales.nosql_new_document : locales.nosql_new_key}>
              <IconButton
                aria-label={isMongo ? locales.nosql_new_document : locales.nosql_new_key}
                data-testid='new-key-button'
                onClick={(e): void => setCreateAnchor(e.currentTarget)}
              >
                <CustomIcon type='plus' size='s' />
              </IconButton>
            </Tooltip>
          )}
          {has(spec, 'delete') && (
            <Tooltip title={locales.nosql_delete_item}>
              <span>
                <IconButton aria-label={locales.nosql_delete_item} disabled={!item} onClick={remove}>
                  <CustomIcon type='mines' size='s' />
                </IconButton>
              </span>
            </Tooltip>
          )}
          {!memberView && (
            <Tooltip title={chordLabel(locales.refresh, shortcuts.reloadTab.command)}>
              <IconButton
                aria-label={locales.refresh}
                data-testid='browse-refresh'
                onClick={(): void => void refresh()}
              >
                <CustomIcon type='refresh' size='s' />
              </IconButton>
            </Tooltip>
          )}
        </StatusBarActionsStackStyled>
        <Box
          ref={setStatusSlot}
          sx={{
            display: 'flex',
            flex: 1,
            minWidth: 0,
            pl: 1,
            ml: 1,
            borderLeft: memberView ? 1 : 0,
            borderColor: 'divider'
          }}
        />
        <Box sx={{ display: 'flex', gap: 2, minWidth: 0 }}>
          {itemFacts(item).map((fact) => (
            <Typography key={fact} variant='caption' color='text.secondary' noWrap>
              {fact}
            </Typography>
          ))}
          <Typography variant='caption'>
            {locales.nosql_loaded_count.replace('{count}', String(items.length))}
          </Typography>
        </Box>
      </StatusBarStyled>
    </Box>
  );
}
