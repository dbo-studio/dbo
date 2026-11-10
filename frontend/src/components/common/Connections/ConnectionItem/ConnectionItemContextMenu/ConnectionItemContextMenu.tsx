import ContextMenu from '@/components/base/ContextMenu/ContextMenu';
import type { JSX } from 'react';
import type { ConnectionContextMenuProps } from '../../types';
import { useConnectionMenu } from './useConnectionMenu';

export default function ConnectionItemContextMenu({
  connection,
  contextMenu,
  onClose
}: ConnectionContextMenuProps): JSX.Element {
  const menu = useConnectionMenu(connection);

  return <ContextMenu menu={menu} contextMenu={contextMenu} onClose={onClose} />;
}
