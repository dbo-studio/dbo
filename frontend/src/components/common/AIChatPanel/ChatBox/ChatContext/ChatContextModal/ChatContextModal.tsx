import { ClickAwayListener, Grow, Paper, Popper } from '@mui/material';
import { useEffect, useRef } from 'react';
import type { ChatContextModalProps } from '../../../types';

export default function ChatContextModal({ open, onClose, anchorRef, children }: ChatContextModalProps) {
  const handleClose = (event: Event | React.SyntheticEvent) => {
    if (anchorRef?.current?.contains(event.target as HTMLElement)) return;
    onClose();
  };

  const prevOpen = useRef(open);
  useEffect(() => {
    if (prevOpen.current === true && open === false) {
      anchorRef?.current?.focus();
    }

    prevOpen.current = open;
  }, [open]);

  return (
    <Popper open={open} anchorEl={anchorRef?.current} role='menu' placement='top-start' transition disablePortal>
      {({ TransitionProps }) => (
        <Grow
          {...TransitionProps}
          style={{
            transformOrigin: 'left top',
            boxShadow: 'none'
          }}
        >
          <Paper>
            <ClickAwayListener onClickAway={handleClose}>{children}</ClickAwayListener>
          </Paper>
        </Grow>
      )}
    </Popper>
  );
}
