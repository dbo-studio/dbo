import { useRef } from 'react';
import { Box } from '@mui/material';
import TreeNode from './TreeNode';
import type { TreeNodeData, TreeViewProps } from './types';

export default function TreeView({ initialData }: TreeViewProps) {
  const parentRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const fetchChildren = async (parentId: string): Promise<TreeNodeData[]> => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const mockData: Record<string, TreeNodeData[]> = {
      root: [
        { id: 'db1', name: 'postgres', type: 'dat abase', children: [] },
        { id: 'db2', name: 'admin', type: 'database', children: [] }
      ],
      postgres: [
        { id: 'schema1', name: 'public', type: 'schema', children: [] },
        { id: 'schema2', name: 'audit', type: 'schema', children: [] }
      ],
      admin: [{ id: 'schema3', name: 'public', type: 'schema', children: [] }],
      schema1: [
        {
          id: 'table1',
          name: 'users',
          type: 'table',
          children: [
            { id: 'col1', name: 'id', type: 'column' },
            { id: 'col2', name: 'username', type: 'column' }
          ]
        },
        {
          id: 'table2',
          name: 'orders',
          type: 'table',
          children: [
            { id: 'col3', name: 'order_id', type: 'column' },
            { id: 'col4', name: 'user_id', type: 'column' }
          ]
        }
      ],
      schema2: [
        {
          id: 'table3',
          name: 'audit_logs',
          type: 'table',
          children: [
            { id: 'col5', name: 'log_id', type: 'column' },
            { id: 'col6', name: 'timestamp', type: 'column' }
          ]
        }
      ],
      schema3: [
        {
          id: 'table4',
          name: 'admin_users',
          type: 'table',
          children: [
            { id: 'col7', name: 'admin_id', type: 'column' },
            { id: 'col8', name: 'role', type: 'column' }
          ]
        }
      ]
    };
    return mockData[parentId] || [];
  };

  return (
    <Box sx={{ padding: 2 }} role='tree'>
      <TreeNode node={initialData} fetchChildren={fetchChildren} parentRefs={parentRefs} nodeIndex={0} level={0} />
    </Box>
  );
}
