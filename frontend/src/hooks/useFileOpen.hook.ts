import { commands, streams, type SqlFilePayload } from '@/core/tauri';
import { tools } from '@/core/utils';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useEffect, useRef } from 'react';

export const useFileOpen = (): void => {
    const addEditorTab = useTabStore((state) => state.addEditorTab);
    const updateQuery = useTabStore((state) => state.updateQuery);
    const currentConnectionId = useConnectionStore((state) => state.currentConnectionId);
    const pendingFilesRef = useRef<string[]>([]);
    const initializedRef = useRef(false);

    // Open SQL content in a new editor tab
    const openSqlInTab = (content: string): void => {
        try {
            const tab = addEditorTab(content);
            if (tab) {
                updateQuery(content);
            }
        } catch (error) {
            console.error('Failed to open SQL file in tab:', error);
        }
    };

    // Setup event listener for file open events
    useEffect(() => {
        let unlisten: (() => void) | undefined;

        const setupListener = async (): Promise<void> => {
            const isTauri = await tools.isTauri();
            if (!isTauri) return;

            unlisten = await streams.file.onOpenSqlFile((payload: SqlFilePayload) => {
                if (currentConnectionId) {
                    openSqlInTab(payload.content);
                } else {
                    pendingFilesRef.current.push(payload.content);
                }
            });
        };

        setupListener();

        return () => {
            if (unlisten) {
                unlisten();
            }
        };
    }, [currentConnectionId]);

    // Check for pending files from command line on initial load
    useEffect(() => {
        const checkPendingFiles = async (): Promise<void> => {
            if (initializedRef.current) return;
            initializedRef.current = true;

            const isTauri = await tools.isTauri();
            if (!isTauri) return;

            try {
                const files = await commands.getPendingFiles();
                if (files && files.length > 0) {
                    if (currentConnectionId) {
                        files.forEach((content) => openSqlInTab(content));
                    } else {
                        pendingFilesRef.current.push(...files);
                    }
                }
            } catch (error) {
                console.error('Failed to get pending files:', error);
            }
        };

        checkPendingFiles();
    }, []);

    // Handle pending files when connection becomes available
    useEffect(() => {
        if (currentConnectionId && pendingFilesRef.current.length > 0) {
            const files = [...pendingFilesRef.current];
            pendingFilesRef.current = [];

            files.forEach((content) => openSqlInTab(content));
        }
    }, [currentConnectionId]);
};
