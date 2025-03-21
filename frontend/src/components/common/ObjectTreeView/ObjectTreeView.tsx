import api from '@/api';
import { getTree } from '@/api/tree';
import type { TreeNodeType } from '@/api/tree/types';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { Box, LinearProgress } from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import TreeNode from './TreeNode/TreeNode';

export default function ObjectTreeView() {
  const { currentConnection } = useConnectionStore();
  const parentRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const { mutateAsync: getChildrenMutation } = useMutation({
    mutationFn: api.tree.getTree,
    onError: (error) => {
      console.error('🚀 ~ getChildrenMutation ~ error:', error);
    }
  });

  const { data: tree, isLoading } = useQuery({
    queryKey: ['tree', currentConnection?.id],
    queryFn: () =>
      getTree({
        parentId: null,
        connectionId: currentConnection?.id || 0
      })
  });

  const fetchChildren = async (parentId: string): Promise<TreeNodeType[]> => {
    try {
      const nodes = await getChildrenMutation({
        parentId,
        connectionId: currentConnection?.id || 0
      });
      return nodes?.children || [];
    } catch (error) {
      return [];
    }
  };

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
