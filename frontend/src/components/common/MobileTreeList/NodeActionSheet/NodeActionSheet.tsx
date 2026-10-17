import ActionSheet from '@/components/base/ActionSheet/ActionSheet';
import type { JSX } from 'react';
import { useTreeNodeMenu } from '../../ObjectTreeView/TreeNode/hooks/useTreeNodeMenu';
import type { NodeActionSheetProps } from '../types';

export default function NodeActionSheet({ node, actionDetection, onClose }: NodeActionSheetProps): JSX.Element {
  const { menu } = useTreeNodeMenu(node, actionDetection);

  return <ActionSheet open onClose={onClose} title={node.name} menu={menu} />;
}
