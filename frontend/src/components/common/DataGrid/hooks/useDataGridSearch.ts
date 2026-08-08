import type { ColumnType, RowType } from '@/types';
import { cellSearchText } from '@/core/utils/dataValue';
import { useCallback, useMemo, useState } from 'react';

export type SearchMatch = {
  rowIndex: number;
  columnIndex: number;
  columnId: string;
  value: string;
  matchIndex: number; // Index of match in the search results
};

export type UseDataGridSearchProps = {
  rows: RowType[];
  columns: ColumnType[];
};

export type UseDataGridSearchReturn = {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  matches: SearchMatch[];
  currentMatchIndex: number;
  setCurrentMatchIndex: (index: number) => void;
  nextMatch: () => void;
  previousMatch: () => void;
  clearSearch: () => void;
  isSearchActive: boolean;
};

export function useDataGridSearch({ rows, columns }: UseDataGridSearchProps): UseDataGridSearchReturn {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Find all matches in the data
  const matches = useMemo(() => {
    if (!searchTerm.trim()) {
      return [];
    }

    const searchLower = searchTerm.toLowerCase();
    const results: SearchMatch[] = [];
    let matchCount = 0;

    rows.forEach((row, rowIndex) => {
      columns.forEach((column, columnIndex) => {
        const columnId = column.name;
        if (columnId === 'select') {
          return;
        }

        const value = row[columnId];
        const valueString = cellSearchText(value, column);
        const valueLower = valueString.toLowerCase();

        if (valueLower.includes(searchLower)) {
          results.push({
            rowIndex,
            columnIndex,
            columnId,
            value: valueString,
            matchIndex: matchCount++
          });
        }
      });
    });

    return results;
  }, [rows, columns, searchTerm]);

  const safeCurrentMatchIndex =
    matches.length > 0 ? ((currentMatchIndex % matches.length) + matches.length) % matches.length : 0;

  const setSearchTermWithReset = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentMatchIndex(0);
  }, []);

  const nextMatch = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matches.length);
  }, [matches.length]);

  const previousMatch = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
  }, [matches.length]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setCurrentMatchIndex(0);
  }, []);

  const isSearchActive = searchTerm.trim().length > 0;

  return {
    searchTerm,
    setSearchTerm: setSearchTermWithReset,
    matches,
    currentMatchIndex: safeCurrentMatchIndex,
    setCurrentMatchIndex,
    nextMatch,
    previousMatch,
    clearSearch,
    isSearchActive
  };
}
