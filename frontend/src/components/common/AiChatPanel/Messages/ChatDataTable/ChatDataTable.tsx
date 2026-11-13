import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import Segmented from '@/components/base/Segmented/Segmented';
import { formatCellValue, toCsv } from '@/core/utils/csv';
import locales from '@/locales';
import api from '@/api';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useDataStore } from '@/store/dataStore/data.store';
import { CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';
import { Resizer } from '@/components/common/DataGrid/DataGridTable.styled';
import { lazy, Suspense, useState, type JSX } from 'react';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';
import {
  ChatCellContent,
  ChatDataTableFooter,
  ChatDataTableToolbar,
  ChatDataTableScroll,
  ChatDataTableWrapper,
  ChatTableCell,
  ChatTableHeader,
  StyledCol,
  StyledTable,
  StyledTableHead,
  StyledTableRow
} from './ChatDataTable.styled';
import type { ChatDataTableProps } from '../../types';
import { autoChart, type ChartType } from '@/core/charts/chartSpec';

const ChartView = lazy(() => import('@/components/common/ChartView/ChartView'));

const SWITCHABLE: ChartType[] = ['bar', 'line', 'area', 'pie'];

const MAX_ROWS = 10;
const MAX_COLUMNS = 12;
const HIDDEN_COLUMNS = new Set(['dbo_index', 'editable']);

const deriveColumns = (rows: Record<string, unknown>[], ordered?: string[]): string[] => {
  if (ordered?.length) {
    return ordered.filter((column) => !HIDDEN_COLUMNS.has(column));
  }

  const seen = new Set<string>();
  const columns: string[] = [];

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (HIDDEN_COLUMNS.has(key) || seen.has(key)) {
        continue;
      }
      seen.add(key);
      columns.push(key);
    }
  }

  return columns;
};

const MIN_COLUMN_WIDTH = 64;
const MAX_COLUMN_WIDTH = 220;
// On the canvas there is room for longer values before they are cut.
const MAX_TALL_COLUMN_WIDTH = 420;
const CHAR_WIDTH = 7.5;
const CELL_PADDING = 28;

/** Fits the header and the widest visible value, so small results fit the panel without sideways scrolling. */
const columnWidth = (column: string, rows: Record<string, unknown>[], max = MAX_COLUMN_WIDTH): number => {
  const longest = rows.reduce((most, row) => Math.max(most, formatCellValue(row[column]).length), column.length);
  return Math.min(max, Math.max(MIN_COLUMN_WIDTH, Math.ceil(longest * CHAR_WIDTH + CELL_PADDING)));
};

export default function ChatDataTable({
  rows: initialRows,
  columns: initialColumns,
  query,
  tall = false
}: ChatDataTableProps): JSX.Element | null {
  const [, copy] = useCopyToClipboard();
  const [rerun, setRerun] = useState<{
    rows: Record<string, unknown>[];
    columns: string[];
    types: Record<string, string>;
  }>();
  const [isRerunning, setIsRerunning] = useState(false);
  const [resized, setResized] = useState<Record<string, number>>({});
  const [showChart, setShowChart] = useState(false);
  const [chartChoice, setChartChoice] = useState<{ rows: unknown; type: ChartType }>();
  // A picked chart type belongs to these rows; a reused table showing new rows starts from the auto pick.
  const chartType = chartChoice?.rows === initialRows ? chartChoice.type : undefined;
  const setChartType = (type: ChartType): void => setChartChoice({ rows: initialRows, type });
  const rows = rerun?.rows ?? initialRows;

  if (rows.length === 0) {
    return null;
  }

  const handleRerun = async (): Promise<void> => {
    const connectionId = useConnectionStore.getState().currentConnectionId;
    if (!query || !connectionId) return;

    setIsRerunning(true);
    try {
      const res = await api.query.runRawQuery({ connectionId: Number(connectionId), query });
      setRerun({
        rows: res.data,
        columns: res.columns.map((column) => column.name),
        types: Object.fromEntries(res.columns.map((column) => [column.name, column.type]))
      });
    } catch {
      toast.error(locales.error_occurred);
    } finally {
      setIsRerunning(false);
    }
  };

  const allColumns = deriveColumns(rows, rerun?.columns ?? initialColumns);
  // The chat shows a preview; the canvas (tall) shows every row and column the query returned.
  const columns = tall ? allColumns : allColumns.slice(0, MAX_COLUMNS);
  const displayRows = tall ? rows : rows.slice(0, MAX_ROWS);
  const truncated = !tall && (rows.length > MAX_ROWS || allColumns.length > MAX_COLUMNS);
  const auto = autoChart(rows, allColumns);
  const chartable = auto.type !== 'table' && auto.type !== 'number' && rows.length <= 200;
  const spec = { ...auto, type: chartType ?? auto.type };
  const widths = columns.map(
    (column) => resized[column] ?? columnWidth(column, displayRows, tall ? MAX_TALL_COLUMN_WIDTH : MAX_COLUMN_WIDTH)
  );

  const startResize = (column: string, startWidth: number, event: React.MouseEvent): void => {
    event.preventDefault();
    const startX = event.clientX;
    const move = (moveEvent: MouseEvent): void =>
      setResized((current) => ({
        ...current,
        [column]: Math.max(MIN_COLUMN_WIDTH, startWidth + moveEvent.clientX - startX)
      }));
    const stop = (): void => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', stop);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', stop);
  };
  const tableWidth = widths.reduce((total, width) => total + width, 0);

  return (
    <ChatDataTableWrapper
      sx={tall ? { m: 0, height: '100%', display: 'flex', flexDirection: 'column' } : undefined}
      data-testid='ai-data-table'
    >
      {chartable && showChart && (
        <Suspense fallback={<CircularProgress size={16} />}>
          <Box sx={{ m: 1, mb: 0 }}>
            <Segmented
              testId='ai-chart-type'
              value={spec.type}
              onChange={setChartType}
              options={SWITCHABLE.map((type) => ({ value: type, label: locales[`ai_chart_type_${type}`] }))}
            />
          </Box>
          <ChartView rows={rows} columns={allColumns} spec={spec} />
        </Suspense>
      )}
      <ChatDataTableScroll sx={tall ? { maxHeight: 'none', flex: 1, minHeight: 0 } : undefined}>
        {/* Fills the card when the columns are narrower than it; scrolls when wider. */}
        <StyledTable style={{ width: '100%', minWidth: tableWidth }}>
          <colgroup>
            {columns.map((column, index) => (
              <StyledCol key={column} width={widths[index]} />
            ))}
          </colgroup>
          <StyledTableHead>
            <StyledTableRow>
              {columns.map((column, index) => (
                <ChatTableHeader
                  key={column}
                  title={rerun?.types[column] ? `${column} (${rerun.types[column]})` : column}
                >
                  {column}
                  {tall && (
                    <Resizer
                      data-testid='ai-data-column-resize'
                      onMouseDown={(event) => startResize(column, widths[index], event)}
                    />
                  )}
                </ChatTableHeader>
              ))}
            </StyledTableRow>
          </StyledTableHead>
          <tbody>
            {displayRows.map((row, rowIndex) => {
              const rowKey =
                typeof row.dbo_index === 'number'
                  ? `row-${row.dbo_index}`
                  : `row-${formatCellValue(row[columns[0]])}-${rowIndex}`;

              return (
                <StyledTableRow key={rowKey} className={rowIndex % 2 === 1 ? 'is-striped' : undefined}>
                  {columns.map((column) => {
                    const value = formatCellValue(row[column]);
                    return (
                      <ChatTableCell key={column}>
                        <ChatCellContent title={value}>{value}</ChatCellContent>
                      </ChatTableCell>
                    );
                  })}
                </StyledTableRow>
              );
            })}
          </tbody>
        </StyledTable>
      </ChatDataTableScroll>
      {truncated && <ChatDataTableFooter variant='caption'>{locales.chat_table_truncated}</ChatDataTableFooter>}
      <ChatDataTableToolbar>
        <Typography variant='caption' color='textSubdued' sx={{ flex: 1 }} data-testid='ai-table-row-count'>
          {locales.ai_table_rows.replace('{n}', String(rows.length))}
        </Typography>
        <Tooltip title={locales.ai_copy_csv}>
          <IconButton
            data-testid='ai-table-copy-csv'
            onClick={() => void copy(toCsv(allColumns, rows)).then((ok) => ok && toast.success(locales.copied))}
          >
            <CustomIcon type='copy' size='xs' />
          </IconButton>
        </Tooltip>
        <Tooltip title={locales.ai_copy_json}>
          <IconButton
            data-testid='ai-table-copy-json'
            onClick={() => void copy(JSON.stringify(rows, null, 2)).then((ok) => ok && toast.success(locales.copied))}
          >
            <CustomIcon type='code' size='xs' />
          </IconButton>
        </Tooltip>
        {chartable && (
          <Tooltip title={locales.ai_chart}>
            <IconButton
              color={showChart ? 'primary' : 'default'}
              aria-pressed={showChart}
              data-testid='ai-table-chart'
              onClick={() => setShowChart((value) => !value)}
            >
              <CustomIcon type='structure' size='xs' />
            </IconButton>
          </Tooltip>
        )}
        {query && (
          <Tooltip title={locales.ai_rerun}>
            <span>
              <IconButton data-testid='ai-table-rerun' disabled={isRerunning} onClick={() => void handleRerun()}>
                {isRerunning ? <CircularProgress size={12} /> : <CustomIcon type='refresh' size='xs' />}
              </IconButton>
            </span>
          </Tooltip>
        )}
        {query && (
          <Tooltip title={locales.ai_open_in_grid}>
            <IconButton
              data-testid='ai-table-open-grid'
              onClick={() => useDataStore.getState().runQueryInEditor(query)}
            >
              <CustomIcon type='externalLink' size='xs' />
            </IconButton>
          </Tooltip>
        )}
      </ChatDataTableToolbar>
    </ChatDataTableWrapper>
  );
}
