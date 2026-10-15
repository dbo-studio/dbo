import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import api from '@/api';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useDataStore } from '@/store/dataStore/data.store';
import { CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';
import { useState, type JSX } from 'react';
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

const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
};

const csvCell = (value: string): string => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

const toCsv = (columns: string[], rows: Record<string, unknown>[]): string =>
  [columns, ...rows.map((row) => columns.map((column) => formatCellValue(row[column])))]
    .map((cells) => cells.map(csvCell).join(','))
    .join('\n');

const MIN_COLUMN_WIDTH = 64;
const MAX_COLUMN_WIDTH = 220;
const CHAR_WIDTH = 7.5;
const CELL_PADDING = 28;

/** Fits the header and the widest visible value, so small results fit the panel without sideways scrolling. */
const columnWidth = (column: string, rows: Record<string, unknown>[]): number => {
  const longest = rows.reduce((max, row) => Math.max(max, formatCellValue(row[column]).length), column.length);
  return Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, Math.ceil(longest * CHAR_WIDTH + CELL_PADDING)));
};

export default function ChatDataTable({
  rows: initialRows,
  columns: initialColumns,
  query
}: ChatDataTableProps): JSX.Element | null {
  const [, copy] = useCopyToClipboard();
  const [rerun, setRerun] = useState<{
    rows: Record<string, unknown>[];
    columns: string[];
    types: Record<string, string>;
  }>();
  const [isRerunning, setIsRerunning] = useState(false);
  const rows = rerun?.rows ?? initialRows;

  if (rows.length === 0) {
    return null;
  }

  const handleRerun = async (): Promise<void> => {
    const connectionId = useConnectionStore.getState().currentConnectionId;
    if (!query || !connectionId) return;

    setIsRerunning(true);
    try {
      const res = await api.query.runRawQuery({ connectionId, query });
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
  const columns = allColumns.slice(0, MAX_COLUMNS);
  const displayRows = rows.slice(0, MAX_ROWS);
  const truncated = rows.length > MAX_ROWS || allColumns.length > MAX_COLUMNS;
  const widths = columns.map((column) => columnWidth(column, displayRows));
  const tableWidth = widths.reduce((total, width) => total + width, 0);

  return (
    <ChatDataTableWrapper>
      <ChatDataTableScroll>
        <StyledTable width={tableWidth}>
          <colgroup>
            {columns.map((column, index) => (
              <StyledCol key={column} width={widths[index]} />
            ))}
          </colgroup>
          <StyledTableHead>
            <StyledTableRow>
              {columns.map((column) => (
                <ChatTableHeader
                  key={column}
                  title={rerun?.types[column] ? `${column} (${rerun.types[column]})` : column}
                >
                  {column}
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
            size='small'
            data-testid='ai-table-copy-csv'
            onClick={() => void copy(toCsv(allColumns, rows)).then((ok) => ok && toast.success(locales.copied))}
          >
            <CustomIcon type='copy' size='xs' />
          </IconButton>
        </Tooltip>
        <Tooltip title={locales.ai_copy_json}>
          <IconButton
            size='small'
            data-testid='ai-table-copy-json'
            onClick={() => void copy(JSON.stringify(rows, null, 2)).then((ok) => ok && toast.success(locales.copied))}
          >
            <CustomIcon type='code' size='xs' />
          </IconButton>
        </Tooltip>
        {query && (
          <Tooltip title={locales.ai_rerun}>
            <span>
              <IconButton
                size='small'
                data-testid='ai-table-rerun'
                disabled={isRerunning}
                onClick={() => void handleRerun()}
              >
                {isRerunning ? <CircularProgress size={12} /> : <CustomIcon type='refresh' size='xs' />}
              </IconButton>
            </span>
          </Tooltip>
        )}
        {query && (
          <Tooltip title={locales.ai_open_in_grid}>
            <IconButton
              size='small'
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
