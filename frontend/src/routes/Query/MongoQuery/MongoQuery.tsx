import api from '@/api';
import { registerMongoCompletions, setMongoContext } from '@/components/base/MongoEditor/mongoCompletions';
import { setupLanguage } from '@/components/base/InlineSqlEditor/helpers/languageSetup';
import { editorConfig } from '@/components/base/SqlEditor/helpers/editorConfig';
import ResizableYBox from '@/components/base/ResizableBox/ResizableYBox';
import DataGrid from '@/components/common/DataGrid/DataGrid';
import EmptyState from '@/components/base/EmptyState/EmptyState';
import { useAiBridge } from '@/hooks/useAiBridge';
import QueryEditorActionBar from '../QueryEditorActionBar/QueryEditorActionBar';
import { canUseCli } from '@/core/auth/permissions';
import { shortcuts } from '@/core/utils';
import { withSafeModeRetry } from '@/core/utils/safeModeGate';
import { useCurrentConnection, useSelectedTab } from '@/hooks';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useSyncEditorContext } from '@/hooks/useSyncEditorContext';
import type { ColumnType, EditorTabType, RowType } from '@/types';
import Editor, { useMonaco, type OnMount } from '@monaco-editor/react';
import { Box, CircularProgress, Menu, MenuItem } from '@mui/material';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import type * as Monaco from 'monaco-editor';
import { type JSX, useEffect, useMemo, useRef, useState } from 'react';
import { QueryContainerStyled, QueryEditorBoxStyled } from '../Query.styled';

type Outcome = { text: string; error: boolean; docs?: Record<string, unknown>[] };

// The server runs one statement per connection at a time, so the editor's own lookups (databases, collections) and the
// user's run go through one queue instead of racing each other.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
}

// Results outlive tab switches (the panel remounts) but not the page.
const outcomes = new Map<string, Outcome>();

const SELECTION_RUN = 'mongo-run';

const isDoc = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A result worth a grid: a non-empty list of documents. */
const asDocs = (output: unknown): Record<string, unknown>[] | undefined =>
  Array.isArray(output) && output.length > 0 && output.every(isDoc) ? output : undefined;

const cellOf = (v: unknown): unknown => (isDoc(v) || Array.isArray(v) ? JSON.stringify(v) : v);

function toTable(docs: Record<string, unknown>[]): { rows: RowType[]; columns: ColumnType[] } {
  const names = [...new Set(docs.flatMap((d) => Object.keys(d)))];
  const columns = names.map((name): ColumnType => ({
    name,
    type: 'any',
    notNull: false,
    length: '',
    default: '',
    comment: '',
    mappedType: docs.some((d) => isDoc(d[name]) || Array.isArray(d[name])) ? 'json' : 'unknown',
    isActive: true,
    isPrimaryKey: name === '_id'
  }));
  const rows = docs.map((d, i): RowType => ({
    dbo_index: i,
    ...Object.fromEntries(names.map((n) => [n, cellOf(d[n])]))
  }));

  return { rows, columns };
}

function errorText(e: unknown): string {
  return (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? locales.action_failed;
}

/** Editor tab for MongoDB: one shell-style command per run (`db.users.find({})`), result shown as JSON. */
export default function MongoQuery(): JSX.Element {
  const tab = useSelectedTab<EditorTabType>();
  const connection = useCurrentConnection();
  const monaco = useMonaco();
  const theme = useSettingStore((s) => s.theme);
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const allowed = canUseCli(mode, user);
  const getQuery = useTabStore((s) => s.getQuery);
  const updateQuery = useTabStore((s) => s.updateQuery);

  const connectionId = connection?.id ?? 0;
  const tabId = tab?.id ?? '';
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const [value, setValue] = useState(() => getQuery(tab?.id));
  const [outcome, setOutcome] = useState<Outcome | undefined>(() => outcomes.get(tabId));
  const [running, setRunning] = useState(false);
  const [prevTabId, setPrevTabId] = useState(tab?.id);

  if (tab?.id !== prevTabId) {
    setPrevTabId(tab?.id);
    setValue(getQuery(tab?.id));
    setOutcome(outcomes.get(tabId));
  }

  const cli = (input: string): Promise<unknown> =>
    serial(() => api.cli.run({ connectionId, input })).then((res) => res.output);
  const asNames = (out: unknown): string[] => (Array.isArray(out) ? (out as string[]) : []);

  const { data: databases = [] } = useQuery({
    queryKey: ['mongo', 'databases', connectionId],
    queryFn: async (): Promise<string[]> => asNames(await cli('show dbs')),
    enabled: !!connection && allowed
  });
  const { data: defaultDb = '' } = useQuery({
    queryKey: ['mongo', 'defaultDb', connectionId],
    queryFn: async (): Promise<string> => String(await cli('db')),
    enabled: !!connection && allowed
  });

  useSyncEditorContext({ databases, schemas: [] });

  const database = tab?.database || defaultDb;

  const { data: collections = [] } = useQuery({
    queryKey: ['mongo', 'collections', connectionId, database],
    queryFn: async (): Promise<string[]> => {
      if (database) await cli(`use ${database}`);
      return asNames(await cli('show collections'));
    },
    enabled: !!connection && allowed && !!database
  });

  useEffect(() => {
    if (!monaco) return;
    registerMongoCompletions(monaco);
    void setupLanguage(monaco, theme.editorTheme);
  }, [monaco, theme.editorTheme]);

  useEffect(() => {
    const fieldCache = new Map<string, Promise<string[]>>();
    setMongoContext({
      collections,
      fields: (collection) => {
        const hit = fieldCache.get(collection);
        if (hit) return hit;
        const next = api.nosql
          .describe(connectionId, `${database}/${collection}`)
          .then((spec) => (spec.fields ?? []).map((f) => f.name))
          .catch(() => [] as string[]);
        fieldCache.set(collection, next);
        return next;
      }
    });
    return () => setMongoContext(undefined);
  }, [collections, connectionId, database]);

  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null);
  const table = useMemo(() => (outcome?.docs ? toTable(outcome.docs) : undefined), [outcome]);
  const { askAboutSelection } = useAiBridge();

  const download = (kind: 'json' | 'csv'): void => {
    setExportAnchor(null);
    if (!outcome || outcome.error) {
      toast.error(locales.empty_query);
      return;
    }
    const csvCell = (v: unknown): string => {
      const t = v === null || v === undefined ? '' : typeof v === 'string' ? v : JSON.stringify(v);
      return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const asCsv = kind === 'csv' && !!table;
    const text = asCsv
      ? [
          table.columns.map((c) => csvCell(c.name)).join(','),
          ...table.rows.map((r) => table.columns.map((c) => csvCell(r[c.name])).join(','))
        ].join('\n')
      : outcome.text;
    const url = URL.createObjectURL(new Blob([text], { type: asCsv ? 'text/csv' : 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `mongo-result.${asCsv ? 'csv' : 'json'}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const format = (): void => void editorRef.current?.getAction('editor.action.formatDocument')?.run();

  const explain = (): void => {
    const editor = editorRef.current;
    const selection = editor?.getSelection();
    const text = (
      selection && !selection.isEmpty() ? editor?.getModel()?.getValueInRange(selection) : editor?.getValue()
    )?.trim();
    if (text) askAboutSelection(text, 'explain');
  };

  const controller = useRef<AbortController | null>(null);

  const run = async (override?: string): Promise<void> => {
    const editor = editorRef.current;
    const selection = editor?.getSelection();
    const selected = selection && !selection.isEmpty() ? editor?.getModel()?.getValueInRange(selection) : undefined;
    const input = (override ?? selected ?? editor?.getValue() ?? value).trim();
    if (!input || running) return;

    const abort = new AbortController();
    controller.current = abort;
    setRunning(true);
    let next: Outcome;
    try {
      // The shell runs in the database last selected, so name this tab's one first.
      if (tab?.database) await serial(() => api.cli.run({ connectionId, input: `use ${tab.database}` }, abort.signal));
      const res = await withSafeModeRetry((confirmed) =>
        serial(() => api.cli.run({ connectionId, input, confirmed }, abort.signal))
      );
      next =
        res === undefined
          ? { text: locales.cli_not_run, error: false }
          : { text: JSON.stringify(res.output ?? null, null, 2), error: false, docs: asDocs(res.output) };
    } catch (e) {
      next = abort.signal.aborted
        ? { text: locales.query_cancelled, error: true }
        : { text: errorText(e), error: true };
    }
    controller.current = null;
    outcomes.set(tabId, next);
    setOutcome(next);
    setRunning(false);
  };

  // Statements opened from the tree (a template, or one that runs right away).
  const pending = useDataStore((s) => s.pendingEditorQueryRun);
  const clearPending = useDataStore((s) => s.clearPendingEditorQueryRun);

  // The editor action is bound once at mount; keep it pointing at the latest run.
  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    if (!pending || pending.tabId !== tab?.id) return;
    clearPending();
    setValue(pending.query);
    updateQuery(pending.query, tab.id);
    if (pending.run) void runRef.current(pending.query);
  }, [pending, tab?.id, clearPending, updateQuery]);

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
    editor.addAction({
      id: SELECTION_RUN,
      label: shortcuts.runQuery.label,
      keybindings: shortcuts.runQuery.monaco ?? [],
      run: (): void => void runRef.current()
    });
  };

  return (
    <>
      <QueryEditorActionBar
        loading={running}
        onStop={(): void => controller.current?.abort()}
        databases={databases}
        schemas={[]}
        onFormat={(): void => undefined}
        onRunQuery={(): void => void run()}
        onAiExplain={explain}
        formatQuery={format}
        onExport={(anchor): void => setExportAnchor(anchor)}
      />
      <Menu anchorEl={exportAnchor} open={!!exportAnchor} onClose={(): void => setExportAnchor(null)}>
        <MenuItem onClick={(): void => download('json')}>JSON</MenuItem>
        <MenuItem disabled={!table} onClick={(): void => download('csv')}>
          CSV
        </MenuItem>
      </Menu>
      <QueryContainerStyled>
        <QueryEditorBoxStyled>
          <Editor
            height='100%'
            width='100%'
            theme={theme.editorTheme}
            language='javascript'
            value={value}
            options={{
              ...editorConfig,
              quickSuggestions: true,
              suggestOnTriggerCharacters: true,
              wordBasedSuggestions: 'off',
              inlineSuggest: { enabled: false },
              lineNumbers: 'on'
            }}
            onMount={handleMount}
            onChange={(v): void => {
              const next = v ?? '';
              setValue(next);
              updateQuery(next, tab?.id);
            }}
            loading={<CircularProgress sx={{ m: 2 }} />}
          />
        </QueryEditorBoxStyled>
        <ResizableYBox height={280} direction='btt'>
          <Box sx={{ height: '100%', display: 'flex' }} data-testid='mongo-result'>
            {!outcome ? (
              <EmptyState
                icon='sql'
                title={locales.query_empty_results_title}
                description={locales.query_empty_results_description}
              />
            ) : table ? (
              <DataGrid standalone editable={false} rows={table.rows} columns={table.columns} loading={running} />
            ) : (
              <Editor
                height='100%'
                width='100%'
                theme={theme.editorTheme}
                language={outcome.error ? 'plaintext' : 'json'}
                value={outcome.text}
                options={{
                  ...editorConfig,
                  readOnly: true,
                  quickSuggestions: false,
                  inlineSuggest: { enabled: false },
                  folding: true
                }}
              />
            )}
          </Box>
        </ResizableYBox>
      </QueryContainerStyled>
    </>
  );
}
