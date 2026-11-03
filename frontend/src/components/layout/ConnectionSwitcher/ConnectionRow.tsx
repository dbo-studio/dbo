import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { IconTypes } from '@/components/base/CustomIcon/types';
import ConnectionItemContextMenu from '@/components/common/Connections/ConnectionItem/ConnectionItemContextMenu/ConnectionItemContextMenu';
import { getConnectionAlias } from '@/core/db/connectionAliases';
import { useContextMenu } from '@/hooks';
import type { ConnectionType } from '@/types';
import { CircularProgress, Typography } from '@mui/material';
import type { JSX } from 'react';
import { SwitcherRowStyled, SwitcherTextStyled } from './ConnectionSwitcher.styled';

export const engineIconOf = (connection: ConnectionType): keyof typeof IconTypes =>
  (getConnectionAlias(connection.type)?.logo ?? connection.icon ?? connection.type) as keyof typeof IconTypes;

type Props = {
  connection: ConnectionType;
  selected: boolean;
  loading: boolean;
  /** Drag preview: no handlers, no menu. */
  overlay?: boolean;
  /** The connection is waiting for its password. */
  locked?: boolean;
  onPick: () => void;
  onMenuClosed: () => void;
};

/** One connection in the switcher. Right-click opens the same menu the old rail had. */
export default function ConnectionRow({
  connection,
  selected,
  loading,
  overlay = false,
  locked = false,
  onPick,
  onMenuClosed
}: Props): JSX.Element {
  const { contextMenuPosition, handleContextMenu, handleCloseContextMenu } = useContextMenu();

  return (
    <>
      <SwitcherRowStyled
        role='option'
        aria-selected={selected}
        tabIndex={0}
        selected={selected}
        data-testid={`connection-item-${connection.name}`}
        onContextMenu={overlay ? undefined : handleContextMenu}
        onClick={() => !overlay && !contextMenuPosition && onPick()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onPick();
        }}
      >
        <CustomIcon type={engineIconOf(connection)} size='m' />
        <SwitcherTextStyled>
          <Typography variant='body2' color='textTitle' noWrap>
            {connection.name}
          </Typography>
          <Typography variant='caption' color='textSecondary' noWrap>
            {connection.type}
          </Typography>
        </SwitcherTextStyled>
        {loading ? (
          <CircularProgress size={14} />
        ) : locked ? (
          <CustomIcon type='lock' size='s' />
        ) : (
          selected && <CustomIcon type='check' size='s' />
        )}
      </SwitcherRowStyled>
      <ConnectionItemContextMenu
        connection={connection}
        contextMenu={contextMenuPosition}
        onClose={() => {
          handleCloseContextMenu();
          // One gesture: once an action is chosen or dismissed, the switcher has done its job.
          onMenuClosed();
        }}
      />
    </>
  );
}
