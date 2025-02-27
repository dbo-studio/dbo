import TreeView from '@/components/common/TreeView/TreeView.tsx';

const initialData = {
  id: 'root',
  name: 'PostgreSQL Server',
  type: 'server',
  children: [
    {
      id: 'postgres',
      name: 'postgres',
      type: 'database',
      children: [],
      actions: ['create_schema', 'create_table', 'create_view', 'drop_database']
    }
  ]
};
export default function ObjectTreeView() {
  return <TreeView initialData={initialData} />;
}
