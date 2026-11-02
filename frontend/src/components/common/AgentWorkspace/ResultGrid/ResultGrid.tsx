import DataGrid from '@/components/common/DataGrid/DataGrid';
import QueryPreview from '@/components/common/QueryPreview/QueryPreview';
import type { QueryResult } from '@/components/common/AiChatPanel/utils/queryResult';
import { numericColumns } from '@/core/charts/chartSpec';
import { DataStoreScope } from '@/store/dataStore/data.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type { ColumnType } from '@/types';
import { Box, Stack } from '@mui/material';
import { useMemo, type JSX } from 'react';

const HIDDEN_COLUMNS = new Set(['dbo_index', 'editable']);

/** A query result on the canvas, in the app's own data grid: read-only, with its SQL and a way into the editor. */
export default function ResultGrid({ result }: { result: QueryResult }): JSX.Element {
  const columns = useMemo((): ColumnType[] => {
    const names = (result.columns ?? Object.keys(result.rows[0] ?? {})).filter((name) => !HIDDEN_COLUMNS.has(name));
    const numbers = numericColumns(result.rows, names);
    return names.map((name) => ({
      name,
      type: result.types?.[name] ?? '',
      notNull: false,
      length: '',
      default: '',
      comment: '',
      mappedType: numbers.includes(name) ? 'number' : 'string',
      editable: false,
      isActive: true,
      isPrimaryKey: false
    }));
  }, [result]);
  // The grid keys rows by their index, which the query tool sends as dbo_index.
  const rows = useMemo(() => result.rows.map((row, index) => ({ dbo_index: index, ...row })), [result]);

  return (
    <Stack sx={{ height: '100%', minHeight: 0 }} data-testid='ai-result-grid'>
      {/* The workstation covers the editor tabs, so opening the query leaves it. */}
      <QueryPreview
        query={result.sql}
        onBeforeOpen={() => useSettingStore.getState().updateUI({ agentWorkspaceOpen: false })}
      />
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <DataStoreScope rows={rows} columns={columns}>
          <DataGrid rows={rows} columns={columns} loading={false} editable={false} standalone />
        </DataStoreScope>
      </Box>
    </Stack>
  );
}
