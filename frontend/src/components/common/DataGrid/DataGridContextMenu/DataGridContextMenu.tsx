import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import type { ContextMenuType } from '@/types';
import type { JSX } from 'react';
import type { DataGridContextTarget } from './types';
import { useDataGridContextMenu } from './useDataGridContextMenu';

type Props = {
  contextMenu: ContextMenuType;
  onClose: () => void;
  target: DataGridContextTarget | null;
};

export default function DataGridContextMenu({ contextMenu, onClose, target }: Props): JSX.Element {
  const menu = useDataGridContextMenu(target);

  return <ContextMenu menu={menu} contextMenu={contextMenu} onClose={onClose} />;
}
