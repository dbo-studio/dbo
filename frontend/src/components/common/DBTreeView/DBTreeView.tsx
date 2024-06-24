import Schemas from '@/components/common/DBTreeView/Schemas/Schemas';
import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { useEffect, useState } from 'react';
import Search from '../../base/Search/Search';
import TablesTreeView from './TableTreeView/TablesTreeView';

export default function DBTreeView() {
  const { currentConnection } = useConnectionStore();
  const [tables, setTables] = useState<string[]>([]);

  useEffect(() => {
    setTables(currentConnection?.tables ?? []);
  }, [currentConnection]);

  const handleSearch = (name: string) => {
    if (!currentConnection?.tables || !currentConnection.currentSchema) {
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
      <Search onChange={handleSearch} />
      <TablesTreeView tables={tables} />
      <Schemas />
    </>
  );
}
