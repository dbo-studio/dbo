import type { MenuType } from '@/components/base/ContextMenu/types';
import { useAiBridge } from '@/hooks/useAiBridge';
import locales from '@/locales';
import { TreeNodeType } from '@/types/Tree';

function tableAiMenu(tableName: string, prefillChat: ReturnType<typeof useAiBridge>['prefillChat']): MenuType {
  const run = (message: string): void => {
    prefillChat(message, true, {
      tables: [tableName],
      input: message
    });
  };

  return {
    name: locales.ai_menu,
    children: [
      {
        name: locales.ai_generate_select,
        action: () => run(`Generate a SELECT query for ${tableName}.`),
        closeAfterAction: true
      },
      {
        name: locales.ai_generate_update,
        action: () => run(`Generate an UPDATE query for ${tableName}.`),
        closeAfterAction: true
      },
      {
        name: locales.ai_generate_delete,
        action: () => run(`Generate a DELETE query for ${tableName}.`),
        closeAfterAction: true
      },
      {
        name: locales.ai_generate_insert,
        action: () => run(`Generate an INSERT query for ${tableName}.`),
        closeAfterAction: true
      },
      {
        name: locales.ai_ask,
        action: () => run(`Tell me about the ${tableName} table.`),
        closeAfterAction: true
      }
    ]
  };
}

export function useTreeNodeMenu(
  node: TreeNodeType,
  actionDetection: (event: React.MouseEvent, node: TreeNodeType) => Promise<void>
): {
  menu: MenuType[];
} {
  const { prefillChat } = useAiBridge();

  const menu: MenuType[] =
    node?.contextMenu?.map((action) => ({
      name: action.title,
      action: (): Promise<void> =>
        actionDetection({ stopPropagation: () => {} } as React.MouseEvent, {
          ...node,
          action
        }),
      closeAfterAction: true
    })) || [];

  if (node.type === 'table') {
    menu.push(tableAiMenu(node.name, prefillChat));
  }

  return { menu };
}
