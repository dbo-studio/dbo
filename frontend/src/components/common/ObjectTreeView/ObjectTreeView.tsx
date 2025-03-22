import api from '@/api';
import type { TreeNodeType } from '@/api/tree/types';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTreeStore } from '@/store/treeStore/tree.store';
import { Box, LinearProgress } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { TreeViewContainerStyled, TreeViewContentStyled } from './ObjectTreeView.styled';
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
    // Initial load of the tree when component mounts
    if (!tree && !isLoading && currentConnection?.id) {
      reloadTree();
    }
  }, [currentConnection?.id, reloadTree, tree, isLoading]);

  // Reset tree when connection changes
  useEffect(() => {
    setTree(null);
  }, [currentConnection?.id, setTree]);

  const fetchChildren = async (parentId: string): Promise<TreeNodeType[]> => {
    try {
      // اضافه کردن parentId به لیست
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
    <TreeViewContainerStyled>
      {isLoading && (
        <Box px={1} py={0.5}>
          <LinearProgress sx={{ height: 2 }} /> {/* Thinner progress bar */}
        </Box>
      )}

      <TreeViewContentStyled>
        {tree && <TreeNode node={tree} fetchChildren={fetchChildren} parentRefs={parentRefs} nodeIndex={0} level={0} />}
      </TreeViewContentStyled>
    </TreeViewContainerStyled>
  );
}
