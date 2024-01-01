import { useConnectionStore } from '@/src/store/tabStore/connection.store';
import { TableType } from '@/src/types/Connection';
import { useState } from 'react';
import Search from '../../base/Search/Search';
import TablesTreeView from './TablesTreeView';

export default function DBTreeView() {
  const { currentSchema } = useConnectionStore();
  const [tables, setTables] = useState(currentSchema.tables);

  const handleSearch = (name: string) => {
    setTables(
      currentSchema.tables.filter((c: TableType) => {
        return c.name.includes(name);
      })
    );
  };

  return (
    <>
      <Search onChange={handleSearch} />
      <TablesTreeView tables={tables} />
    </>
  );
}
