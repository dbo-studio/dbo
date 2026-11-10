import ActionSheet from '@/components/base/ActionSheet/ActionSheet';
import type { JSX } from 'react';
import { useConnectionMenu } from '../../ConnectionItem/ConnectionItemContextMenu/useConnectionMenu';
import type { ConnectionActionSheetProps } from '../../types';

export default function ConnectionActionSheet({ connection, onClose }: ConnectionActionSheetProps): JSX.Element {
  const menu = useConnectionMenu(connection);

  return <ActionSheet open onClose={onClose} title={connection.name} menu={menu} />;
}
