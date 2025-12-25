import type { MenuType } from '@/components/base/ContextMenu/types';
import { TreeNodeType } from '@/types/Tree';

export function useTreeNodeMenu(
  node: TreeNodeType,
  actionDetection: (event: React.MouseEvent, node: TreeNodeType) => void
): {
  menu: MenuType[];
} {
  const menu: MenuType[] =
    node?.contextMenu?.map((action) => ({
      name: action.title,
      action: (): void =>
        actionDetection({ stopPropagation: () => {} } as React.MouseEvent, {
          ...node,
          action
        }),
      closeAfterAction: true
    })) || [];

  return { menu };
}
