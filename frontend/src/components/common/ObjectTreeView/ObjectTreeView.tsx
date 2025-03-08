import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import TreeNode from '@/components/common/TreeNode/TreeNode.tsx';
import useAPI from '@/hooks/useApi.hook.ts';
import api from '@/api';
import { useConnectionStore } from '@/store/connectionStore/connection.store.ts';
import type { TreeNodeType } from '@/api/object/types';

export default function ObjectTreeView() {
  const [tree, setTree] = useState<TreeNodeType | undefined>(undefined);
  const { currentConnection } = useConnectionStore();

  const parentRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const { request: getTree } = useAPI({
    apiMethod: api.object.getTree
  });

  const handleGetTree = async (parentId: string | null): Promise<TreeNodeType | undefined> => {
    try {
      return await getTree({
        parentId: parentId,
        connectionId: currentConnection?.id
      });
    } catch (error) {
      console.log('🚀 ~ handleGetTree ~ error:', error);
    }
  };

  useEffect(() => {
    handleGetTree(null).then((res) => {
      setTree(res);
    });
  }, []);

  const fetchChildren = async (parentId: string): Promise<TreeNodeType[]> => {
    const nodes = await handleGetTree(parentId);
    return nodes?.children ?? [];
  };

  return (
    <Box sx={{ padding: 2 }} role='tree'>
      {tree && <TreeNode node={tree} fetchChildren={fetchChildren} parentRefs={parentRefs} nodeIndex={0} level={0} />}
    </Box>
  );
}
