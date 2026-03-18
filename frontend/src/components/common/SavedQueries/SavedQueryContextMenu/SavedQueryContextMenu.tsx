import api from '@/api';
import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import type { MenuType } from '@/components/base/ContextMenu/types';
import locales from '@/locales';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useMutation } from '@tanstack/react-query';
import type { JSX } from 'react';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';
import type { SavedQueryContextMenuProps } from '../types';

export default function SavedQueryContextMenu({
  query,
  contextMenu,
  onClose,
  onChange,
  onEditMode
}: SavedQueryContextMenuProps): JSX.Element {
  const [, copy] = useCopyToClipboard();
  const addEditorTab = useTabStore.getState().addEditorTab;
  const updateSelectedTab = useTabStore.getState().updateSelectedTab;
  const showModal = useConfirmModalStore((state) => state.danger);

  const { mutateAsync: deleteSavedQueryMutation } = useMutation({
    mutationFn: api.savedQueries.deleteSavedQuery
  });

  const handleDelete = (): void => {
    showModal(locales.delete_action, locales.query_saved_delete_confirm, () => {
      void (async () => {
        try {
          await deleteSavedQueryMutation(query.id);
          toast.success(locales.query_saved_successfully);
          await onChange();
        } catch (e) {
          console.debug('🚀 ~ handleDelete ~ error:', e);
        }
      })();
    });
  };

  const handleCopy = (): void => {
    copy(query.query).catch((e) => console.debug('🚀 ~ handleCopy ~ error:', e));
    toast.success(locales.copied);
  };

  const handleRun = (): void => {
    const tab = addEditorTab(query.query);
    updateSelectedTab(tab);
  };

  const handleEditMode = (): void => {
    onEditMode(true);
    onClose();
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
      action: handleEditMode
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
