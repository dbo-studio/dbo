import type { TreeNode } from '@/api/object/types';
import axios from 'axios';
import { useEffect, useState } from 'react';
import TreeView, { flattenTree } from 'react-accessible-treeview';
import './DatabaseTree.css';
import type { INode } from 'react-accessible-treeview/dist/TreeView/types';

interface DatabaseTreeProps {
  connId: string;
}

export default function ObjectTreeView({ connId }: DatabaseTreeProps) {
  const [treeData, setTreeData] = useState<INode[]>([]);

  useEffect(() => {
    fetchTree();
  }, [connId]);

  const fetchTree = async () => {
    try {
      const response = await axios.get<TreeNode>(`/api/objects?conn_id=${connId}`);
      const flatTree = flattenTree(response.data.data);
      setTreeData(flatTree);
    } catch (error) {
      console.error('Failed to fetch tree:', error);
    }
  };

  return (
    <div className='database-tree'>
      {treeData.length > 0 && (
        <TreeView
          data={treeData}
          className='basic'
          aria-label='basic example tree'
          nodeRenderer={({ element, getNodeProps, isBranch, isExpanded, isSelected }) => (
            <div
              {...getNodeProps()}
              className={`tree-node ${isBranch ? (isExpanded ? 'branch-open' : 'branch-closed') : ''} ${isSelected ? 'selected' : ''}`}
            >
              {element.name}
            </div>
          )}
        />
      )}
    </div>
  );
}
