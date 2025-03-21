import { getTree } from '@/api/tree';
import type { TreeNodeType } from '@/api/tree/types';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { Box, LinearProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import TreeNode from './TreeNode/TreeNode';

export default function ObjectTreeView() {
  const { currentConnection } = useConnectionStore();
  const parentRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const { data: tree, isLoading } = useQuery({
    queryKey: ['tree', currentConnection?.id],
    queryFn: async () => {
      try {
        const data = await getTree({
          parentId: null,
          connectionId: currentConnection?.id || ''
        });
        // Ensure children exists
        return {
          ...data,
          children: data?.children || []
        };
      } catch (error) {
        console.log('🚀 ~ handleGetTree ~ error:', error);
        return undefined;
      }
    }
  });

  const fetchChildren = async (parentId: string): Promise<TreeNodeType[]> => {
    try {
      const nodes = await getTree({
        parentId,
        connectionId: currentConnection?.id || ''
      });
      return nodes?.children || [];
    } catch (error) {
      console.log('🚀 ~ fetchChildren ~ error:', error);
      return [];
    }
  };

  useEffect(() => {
    console.log('🚀 ~ useEffect ~ tree:', tree);
  }, [tree]);

  if (isLoading) {
    return (
      <Box p={2}>
        <LinearProgress style={{ marginTop: '8px' }} />
      </Box>
    );
  }

  return (
    <Box p={2} overflow={'auto'} height={'100%'}>
      {tree && <TreeNode node={tree} fetchChildren={fetchChildren} parentRefs={parentRefs} nodeIndex={0} level={0} />}
    </Box>
  );
}
