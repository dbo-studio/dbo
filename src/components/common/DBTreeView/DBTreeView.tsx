import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { useEffect, useState } from 'react';
import Search from '../../base/Search/Search';
import Schemes from './Schemes';
import TablesTreeView from './TablesTreeView';

export default function DBTreeView() {
  const { getCurrentSchema, currentConnection } = useConnectionStore();
  const [tables, setTables] = useState<string[]>([]);

  useEffect(() => {
    if (!getCurrentSchema()) {
      return;
    }
    setTables(currentConnection?.tables ?? []);
  }, [getCurrentSchema()]);

  const handleSearch = (name: string) => {
    if (!currentConnection?.tables) {
      return;
    }
    if (!getCurrentSchema()) {
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
      {getCurrentSchema() && (
        <>
          <Search onChange={handleSearch} />
          <TablesTreeView tables={tables} />
          <Schemes schemes={currentConnection?.schemas ?? []} />
        </>
      )}
    </>
  );
}
