import api from '@/api';
import type { TreeNodeType } from '@/api/tree/types';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { Box, LinearProgress } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import TreeNode from './TreeNode/TreeNode';

export default function ObjectTreeView() {
  const { currentConnection } = useConnectionStore();
  const { tree, isLoading, reloadTree, setTree, addLoadedParentId } = useTreeStore();
  const parentRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const { mutateAsync: getChildrenMutation } = useMutation({
    mutationFn: api.tree.getTree,
    onError: (error) => {
      console.error('🚀 ~ getChildrenMutation ~ error:', error);
    }
  });

  useEffect(() => {
    if (!tree && !isLoading && currentConnection?.id) {
      reloadTree();
    }
  }, [currentConnection?.id, reloadTree, tree, isLoading]);

  useEffect(() => {
    setTree(null);
  }, [currentConnection?.id, setTree]);

  const fetchChildren = async (parentId: string): Promise<TreeNodeType[]> => {
    try {
      addLoadedParentId(parentId);

      const nodes = await getChildrenMutation({
        parentId,
        connectionId: currentConnection?.id || 0
      });
      return nodes?.children || [];
    } catch (error) {
      return [];
    }
  };

  return (
    <Box display='flex' flexDirection='column' height='100%'>
      {isLoading && (
        <Box p={2}>
          <LinearProgress style={{ marginTop: '8px' }} />
        </Box>
      )}

      <Box p={2} overflow={'auto'} flex={1}>
        {tree && <TreeNode node={tree} fetchChildren={fetchChildren} parentRefs={parentRefs} nodeIndex={0} level={0} />}
      </Box>
    </Box>
  );
}
