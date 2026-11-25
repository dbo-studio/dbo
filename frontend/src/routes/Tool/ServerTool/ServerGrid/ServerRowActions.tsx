import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import { useState } from 'react';

export type ServerRowAction = { label: string; run: () => void; danger?: boolean };

export default function ServerRowActions({ actions }: { actions: ServerRowAction[] }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  if (!actions.length) return null;

  return (
    <>
      <Tooltip title={locales.nosql_more_actions}>
        <IconButton
          aria-label={locales.nosql_more_actions}
          aria-haspopup='menu'
          aria-expanded={!!anchor}
          onClick={(event) => setAnchor(event.currentTarget)}
        >
          <CustomIcon type='ellipsisVertical' size='s' />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {actions.map(({ label, run, danger }) => (
          <MenuItem
            key={label}
            sx={danger ? { color: 'error.main' } : undefined}
            onClick={() => {
              setAnchor(null);
              run();
            }}
          >
            {label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
