import type { ColumnType, RowType } from '@/types';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
                // Skip checkbox column
                if (columnId === 'select') {
                    return;
                }

                const value = row[columnId];
                const valueString = value == null ? 'NULL' : String(value);
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

    // Reset current match index when search term or matches change
    useEffect(() => {
        if (matches.length > 0) {
            setCurrentMatchIndex(0);
        } else {
            setCurrentMatchIndex(0);
        }
    }, [searchTerm, matches.length]);

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
        setSearchTerm,
        matches,
        currentMatchIndex,
        setCurrentMatchIndex,
        nextMatch,
        previousMatch,
        clearSearch,
        isSearchActive
    };
}

