import locales from '@/locales';
import type { JSX } from 'react';
import {
  ChatCellContent,
  ChatDataTableFooter,
  ChatDataTableScroll,
  ChatDataTableWrapper,
  ChatTableCell,
  ChatTableHeader,
  StyledCol,
  StyledTable,
  StyledTableHead,
  StyledTableRow
} from './ChatDataTable.styled';

const MAX_ROWS = 10;
const MAX_COLUMNS = 12;
const HIDDEN_COLUMNS = new Set(['dbo_index', 'editable']);

type ChatDataTableProps = {
  rows: Record<string, unknown>[];
};

const deriveColumns = (rows: Record<string, unknown>[]): string[] => {
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

const columnWidth = (column: string): number => Math.min(220, Math.max(104, column.length * 8 + 40));

export default function ChatDataTable({ rows }: ChatDataTableProps): JSX.Element | null {
  if (rows.length === 0) {
    return null;
  }

  const allColumns = deriveColumns(rows);
  const columns = allColumns.slice(0, MAX_COLUMNS);
  const displayRows = rows.slice(0, MAX_ROWS);
  const truncated = rows.length > MAX_ROWS || allColumns.length > MAX_COLUMNS;
  const tableWidth = columns.reduce((total, column) => total + columnWidth(column), 0);

  return (
    <ChatDataTableWrapper>
      <ChatDataTableScroll>
        <StyledTable width={tableWidth}>
          <colgroup>
            {columns.map((column) => (
              <StyledCol key={column} width={columnWidth(column)} />
            ))}
          </colgroup>
          <StyledTableHead>
            <StyledTableRow>
              {columns.map((column) => (
                <ChatTableHeader key={column} title={column}>
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
              <StyledTableRow
                key={rowKey}
                className={rowIndex % 2 === 1 ? 'is-striped' : undefined}
              >
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
    </ChatDataTableWrapper>
  );
}
