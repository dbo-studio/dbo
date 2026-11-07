import api from '@/api';
import locales from '@/locales';
import type { ConnectionType } from '@/types';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useQueryClient } from '@tanstack/react-query';
import { open } from '@tauri-apps/plugin-dialog';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { useSwitchConnection } from './useSwitchConnection';

export const DATABASE_FILE_EXTENSIONS = ['db', 'sqlite', 'sqlite3', 'db3'];

export const isDatabasePath = (path: string): boolean =>
  DATABASE_FILE_EXTENSIONS.some((extension) => path.toLowerCase().endsWith(`.${extension}`));

const baseName = (path: string): string => {
  const file = path.split(/[\\/]/).pop() ?? path;
  const dot = file.lastIndexOf('.');
  return dot > 0 ? file.slice(0, dot) : file;
};

type UseOpenDatabaseFileReturn = {
  /** Opens a SQLite file as a connection, reusing the one saved for that path. */
  openDatabaseFile: (path: string) => Promise<void>;
  /** Asks for a file with the native dialog (desktop only), then opens it. */
  pickDatabaseFile: () => Promise<void>;
};

export const useOpenDatabaseFile = (): UseOpenDatabaseFileReturn => {
  const queryClient = useQueryClient();
  const { switchConnection } = useSwitchConnection();

  const openDatabaseFile = useCallback(
    async (path: string): Promise<void> => {
      try {
        const isSaved = (c: ConnectionType): boolean =>
          c.type === 'sqlite' && 'path' in c.options && c.options.path === path;
        let connection = useConnectionStore.getState().connections?.find(isSaved);
        if (!connection) {
          await api.connection.createConnection({ name: baseName(path), type: 'sqlite', options: { path } });
          connection = (await api.connection.getConnectionList()).find(isSaved);
          await queryClient.invalidateQueries({ queryKey: ['connections'] });
          toast.success(locales.connection_create_success);
        }
        if (!connection) {
          throw new Error('connection missing after create');
        }
        await switchConnection(connection);
      } catch {
        toast.error(locales.open_database_failed);
      }
    },
    [queryClient, switchConnection]
  );

  const pickDatabaseFile = useCallback(async (): Promise<void> => {
    const selected = await open({ multiple: false, directory: false });
    if (typeof selected === 'string') {
      await openDatabaseFile(selected);
    }
  }, [openDatabaseFile]);

  return { openDatabaseFile, pickDatabaseFile };
};
