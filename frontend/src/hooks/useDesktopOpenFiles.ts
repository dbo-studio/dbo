import { commands, streams } from '@/core/tauri';
import { tools } from '@/core/utils';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import { open } from '@tauri-apps/plugin-dialog';
import { useEffect } from 'react';
import { toast } from 'sonner';

const openSqlPaths = async (paths: string[]): Promise<void> => {
  for (const path of paths) {
    try {
      const content = await commands.readSqlFile(path);
      useTabStore.getState().addEditorTab(content);
    } catch {
      toast.error(locales.open_sql_file_failed);
    }
  }
};

export const pickAndOpenSqlFile = async (): Promise<void> => {
  const selected = await open({
    multiple: true,
    filters: [{ name: locales.open_sql_file, extensions: ['sql'] }]
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

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);
};
