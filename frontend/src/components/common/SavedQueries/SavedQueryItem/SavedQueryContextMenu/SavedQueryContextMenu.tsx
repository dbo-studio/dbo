import api from '@/api';
import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import type { MenuType } from '@/components/base/ContextMenu/types';
import { TabMode } from '@/core/enums';
import { useCopyToClipboard } from '@/hooks';
import useAPI from '@/hooks/useApi.hook';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { toast } from 'sonner';
import type { SavedQueryContextMenuProps } from '../../types';

export default function SavedQueryContextMenu({
  query,
  contextMenu,
  onClose,
  onDelete,
  onChange
}: SavedQueryContextMenuProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, copy] = useCopyToClipboard();
  const { addTab } = useTabStore();

  const showModal = useConfirmModalStore((state) => state.danger);

  const { request: deleteSavedQuery, pending: pendingDelete } = useAPI({
    apiMethod: api.savedQueries.deleteSavedQuery
  });

  const handleDelete = async () => {
    if (pendingDelete) {
      return;
    }
    showModal(locales.delete_action, locales.query_saved_delete_confirm, async () => {
      try {
        await deleteSavedQuery(query.id);
        toast.success(locales.query_saved_successfully);
        onDelete();
      } catch (err) {
        console.log('🚀 ~ handleSaveChange ~ err:', err);
      }
    });
  };

  const handleCopy = async () => {
    try {
      await copy(query.query);
      toast.success(locales.copied);
    } catch (error) {
      console.log('🚀 ~ handleCopy ~ error:', error);
    }
  };

  const handleRun = () => {
    const name = query.name.slice(0, 10);
    addTab(name, TabMode.Query, query.query);
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
    },
    {
      name: locales.rename,
      icon: 'pen',
      action: onChange
    },
    {
      name: locales.delete,
      icon: 'delete',
      action: handleDelete,
      closeBeforeAction: true
    }
  ];

  return <ContextMenu menu={menu} contextMenu={contextMenu} onClose={onClose} />;
}
