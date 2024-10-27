import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import type { MenuType } from '@/components/base/ContextMenu/types';
import { TabMode } from '@/core/enums';
import { useCopyToClipboard } from '@/hooks';
import useNavigate from '@/hooks/useNavigate.hook';
import locales from '@/locales';
import { useTabStore } from '@/store/tabStore/tab.store';
import { toast } from 'sonner';
import type { HistoryContextMenuProps } from '../../types';

export default function HistoryContextMenu({ history, contextMenu, onClose }: HistoryContextMenuProps) {
  const [copy] = useCopyToClipboard();
  const { addTab } = useTabStore();
  const navigate = useNavigate();

  const handleCopy = async () => {
    try {
      await copy(history.query);
      toast.success(locales.copied);
    } catch (error) {
      console.log('🚀 ~ handleCopy ~ error:', error);
    }
  };

  const handleRun = () => {
    const name = history.query.slice(0, 10);
    const tab = addTab(name, TabMode.Query, history.query);
    navigate({
      route: tab.mode,
      tabId: tab.id
    });
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
