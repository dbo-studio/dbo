import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { TableType } from '@/src/types/Connection';
import { useEffect, useState } from 'react';
import Search from '../../base/Search/Search';
import Schemes from './Schemes';
import TablesTreeView from './TablesTreeView';

export default function DBTreeView() {
  const { getCurrentSchema, currentConnection } = useConnectionStore();
  const [tables, setTables] = useState<TableType[]>([]);

  useEffect(() => {
    if (!getCurrentSchema()) {
      return;
    }
    setTables(getCurrentSchema()!.tables);
  }, [getCurrentSchema()]);

  const handleSearch = (name: string) => {
    if (!getCurrentSchema()) {
      return;
    }
    setTables(
      getCurrentSchema()!.tables.filter((c: TableType) => {
        return c.name.includes(name);
      })
    );
  };

  return (
    <>
      {getCurrentSchema() && (
        <>
          <Search onChange={handleSearch} />
          <TablesTreeView tables={tables} />
          <Schemes schemes={currentConnection?.database.schemes ?? []} />
        </>
      )}
    </>
  );
}
