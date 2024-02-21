import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { useEffect, useState } from 'react';
import Search from '../../base/Search/Search';
import Schemes from './Schemes';
import TablesTreeView from './TablesTreeView';

export default function DBTreeView() {
  const { currentConnection } = useConnectionStore();
  const [tables, setTables] = useState<string[]>([]);

  useEffect(() => {
    if (!currentConnection?.current_schema) {
      return;
    }
    setTables(currentConnection?.tables ?? []);
  }, [currentConnection]);

  const handleSearch = (name: string) => {
    if (!currentConnection?.tables || !currentConnection.current_schema) {
      return;
    }

    setTables(
      currentConnection.tables.filter((c: string) => {
        return c.includes(name);
      })
    );
  };

  return (
    <>
      {currentConnection?.current_schema && (
        <>
          <Search onChange={handleSearch} />
          <TablesTreeView tables={tables} />
          <Schemes schemes={currentConnection?.schemas ?? []} />
        </>
      )}
    </>
  );
}
