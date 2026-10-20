import { commands, streams } from '@/core/tauri';
import { tools } from '@/core/utils';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { open } from '@tauri-apps/plugin-dialog';
import { useEffect } from 'react';
import { toast } from 'sonner';

const isSqlPath = (path: string): boolean => path.toLowerCase().endsWith('.sql');

// Contents read before any connection is active (e.g. app launched by opening a file).
let waitingForConnection: string[] = [];

const flushWaiting = (): void => {
  if (!useConnectionStore.getState().currentConnectionId) {
    return;
  }
  const contents = waitingForConnection;
  waitingForConnection = [];
  contents.forEach((content) => useTabStore.getState().addEditorTab(content, { forceNew: true }));
};

const openSqlPaths = async (paths: string[]): Promise<void> => {
  for (const path of paths) {
    try {
      waitingForConnection.push(await commands.readSqlFile(path));
      if (useConnectionStore.getState().currentConnectionId) {
        flushWaiting();
      } else {
        toast.info(locales.open_sql_file_select_connection);
      }
    } catch {
      toast.error(locales.open_sql_file_failed);
    }
  }
};

export const pickAndOpenSqlFile = async (): Promise<void> => {
  const selected = await open({
    multiple: true,
    filters: [{ name: 'SQL', extensions: ['sql'] }]
  });
  if (selected) {
    await openSqlPaths(selected);
  }
};

/**
 * Opens .sql files handed to the app by the OS (double-click, "Open with", argv)
 * and those picked via File > Open SQL File. Mount inside Layout after boot.
 */
export const useDesktopOpenFiles = (): void => {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;

    const drain = () => commands.takePendingOpenFiles().then(openSqlPaths).catch(() => undefined);

    void (async () => {
      if (!(await tools.isTauri())) {
        return;
      }
      const stop = await streams.files.onOpen(() => void drain());
      if (disposed) {
        stop();
        return;
      }
      unlisten = stop;
      await drain();
    })();

    const unsubscribe = useConnectionStore.subscribe(flushWaiting);
    let unlistenDrop: (() => void) | undefined;

    void (async () => {
      if (!(await tools.isTauri())) {
        return;
      }
      const stop = await streams.files.onDrop((paths) => void openSqlPaths(paths.filter(isSqlPath)));
      if (disposed) {
        stop();
        return;
      }
      unlistenDrop = stop;
    })();

    return () => {
      disposed = true;
      unsubscribe();
      unlisten?.();
      unlistenDrop?.();
    };
  }, []);
};
