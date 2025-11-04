import type { Virtualizer } from '@tanstack/react-virtual';
import { useEffect, useState } from 'react';
import type { UseDataGridSearchReturn } from './useDataGridSearch';
import { useShortcut } from '@/hooks';
import { shortcuts } from '@/core/utils';

export type UseDataGridSearchIntegrationProps = {
    search: UseDataGridSearchReturn;
    rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
};

export type UseDataGridSearchIntegrationReturn = {
    isSearchDialogOpen: boolean;
    setIsSearchDialogOpen: (open: boolean) => void;
    currentMatch: { rowIndex: number; columnIndex: number } | null;
};

export function useDataGridSearchIntegration({
    search,
    rowVirtualizer
}: UseDataGridSearchIntegrationProps): UseDataGridSearchIntegrationReturn {
    const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);

    useShortcut(shortcuts.search, () => setIsSearchDialogOpen(true));

    // Handle Ctrl+F to open search dialog
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent): void => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                setIsSearchDialogOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // Scroll to current match when it changes
    useEffect(() => {
        if (search.matches.length > 0 && search.currentMatchIndex >= 0) {
            const currentMatch = search.matches[search.currentMatchIndex];
            if (currentMatch) {
                rowVirtualizer.scrollToIndex(currentMatch.rowIndex, {
                    align: 'center',
                    behavior: 'smooth'
                });
            }
        }
    }, [search.currentMatchIndex, search.matches, rowVirtualizer]);

    const currentMatch =
        search.matches.length > 0 && search.currentMatchIndex >= 0
            ? {
                rowIndex: search.matches[search.currentMatchIndex].rowIndex,
                columnIndex: search.matches[search.currentMatchIndex].columnIndex
            }
            : null;

    return {
        isSearchDialogOpen,
        setIsSearchDialogOpen,
        currentMatch
    };
}

