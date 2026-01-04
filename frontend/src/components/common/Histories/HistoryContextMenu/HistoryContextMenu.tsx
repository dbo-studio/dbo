import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import type { MenuType } from '@/components/base/ContextMenu/types';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { JSX } from 'react';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';
import type { HistoryContextMenuProps } from '../types';

export default function HistoryContextMenu({ history, contextMenu, onClose }: HistoryContextMenuProps): JSX.Element {
  const [, copy] = useCopyToClipboard();

  const addEditorTab = useTabStore((state) => state.addEditorTab);
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);

  const handleCopy = async (): Promise<void> => {
    try {
      await copy(history.query);
      toast.success(locales.copied);
    } catch (error) {
      console.debug('🚀 ~ handleCopy ~ error:', error);
    }
  };

  const handleRun = (): void => {
    const tab = addEditorTab(history.query);
    updateSelectedTab(tab);
  };

  const menu: MenuType[] = [
    {
      name: locales.run,
      icon: 'play',
      action: handleRun,
      closeAfterAction: true
    },
    {
      name: locales.copy,
      icon: 'copy',
      action: handleCopy,
      closeAfterAction: true
    }
  ];

  return <ContextMenu menu={menu} contextMenu={contextMenu} onClose={onClose} />;
}
