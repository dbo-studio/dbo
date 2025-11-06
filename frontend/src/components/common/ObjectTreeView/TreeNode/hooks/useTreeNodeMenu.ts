import { TabMode } from '@/core/enums';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { TreeNodeType } from '@/api/tree/types';
import type { MenuType } from '@/components/base/ContextMenu/types';

export function useTreeNodeMenu(
  node: TreeNodeType,
  actionDetection: (event: any, node: TreeNodeType) => void
): {
  menu: MenuType[];
} {
  const addSchemaDiagramTab = useTabStore((state) => state.addSchemaDiagramTab);

  const menu: MenuType[] =
    node?.contextMenu?.map((action) => ({
      name: action.title,
      action: (): void =>
        actionDetection({ stopPropagation: () => {} } as any, {
          ...node,
          action
        }),
      closeAfterAction: true
    })) || [];

  // Add "Open Schema Diagram" menu item for schema nodes
  // For schema nodes, node.id format is "database.schema" or "schema"
  if (node.type === 'schema') {
    const schemaName = node.name;
    menu.push({
      name: 'Open Schema Diagram',
      action: (): void => {
        addSchemaDiagramTab(schemaName);
      },
      closeAfterAction: true
    });
  }

  // For database nodes, add menu item with default schema (public)
  if (node.type === 'database') {
    menu.push({
      name: 'Open Schema Diagram (public)',
      action: (): void => {
        addSchemaDiagramTab('public');
      },
      closeAfterAction: true
    });
  }

  return { menu };
}
