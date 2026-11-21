import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import type { TreeNodeType } from '@/types/Tree';
import { IconButton } from '@mui/material';
import { type JSX, useState } from 'react';
import { NodeRenameInput } from '../ObjectTreeView.styled';

const FOCUS_HANDOFF_MS = 600;
const RENAME_BUTTON_SX = { p: 0, width: 18, height: 18, flexShrink: 0 };

type RenameFieldProps = {
  node: TreeNodeType;
  onCommit: (node: TreeNodeType, name: string) => void;
  onCancel: () => void;
};

export default function RenameField({ node, onCommit, onCancel }: RenameFieldProps): JSX.Element {
  const [value, setValue] = useState(node.name);
  const [mountedAt] = useState(() => Date.now());
  // Enter/Escape unmount the field, which fires blur; the flag keeps that from committing twice.
  const [done, setDone] = useState(false);
  const finish = (commit: boolean): void => {
    if (done) return;
    setDone(true);
    if (commit) onCommit(node, value.trim());
    else onCancel();
  };

  // Buttons keep the input focused on press, so the blur-to-cancel below never eats their click.
  const keepFocus = (event: React.MouseEvent): void => event.preventDefault();
  const unchanged = !value.trim() || value.trim() === node.name;

  return (
    <>
      <NodeRenameInput
        autoFocus
        aria-label={node.name}
        data-testid='tree-rename-input'
        value={value}
        onFocus={(event): void => event.currentTarget.select()}
        onChange={(event): void => setValue(event.target.value)}
        onClick={(event): void => event.stopPropagation()}
        onDoubleClick={(event): void => event.stopPropagation()}
        onBlur={(event): void => {
          // The context menu hands focus back to the row as it closes; take it back instead of cancelling.
          if (Date.now() - mountedAt < FOCUS_HANDOFF_MS) {
            const input = event.currentTarget;
            requestAnimationFrame(() => input.focus());
            return;
          }
          finish(false);
        }}
        onKeyDown={(event): void => {
          // Keep typed characters away from the tree's type-ahead and shortcuts.
          event.stopPropagation();
          if (event.key === 'Enter') finish(true);
          else if (event.key === 'Escape') finish(false);
        }}
      />
      <IconButton
        aria-label={locales.cancel}
        sx={RENAME_BUTTON_SX}
        onMouseDown={keepFocus}
        onClick={(event): void => {
          event.stopPropagation();
          finish(false);
        }}
      >
        <CustomIcon type='close' size='xs' />
      </IconButton>
      <IconButton
        aria-label={locales.save}
        disabled={unchanged}
        sx={RENAME_BUTTON_SX}
        onMouseDown={keepFocus}
        onClick={(event): void => {
          event.stopPropagation();
          finish(true);
        }}
      >
        <CustomIcon type='check' size='xs' />
      </IconButton>
    </>
  );
}
