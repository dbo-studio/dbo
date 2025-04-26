import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import type { MenuType } from '@/components/base/ContextMenu/types';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type { ContextMenuType } from '@/types';
import type { JSX } from 'react';

export default function GridContextMenu({
  contextMenu,
  onClose
}: {
  contextMenu: ContextMenuType;
  onClose: () => void;
}): JSX.Element {
  const { toggleShowQuickLookEditor } = useSettingStore();

  const menu: MenuType[] = [
    {
      name: locales.quick_look_editor,
      action: (): void => {
        toggleShowQuickLookEditor(true);
        onClose();
      }
    }
  ];

  return <ContextMenu menu={menu} contextMenu={contextMenu} onClose={onClose} />;
}
