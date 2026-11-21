import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { IconProps } from '@/components/base/CustomIcon/types';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { type JSX, type MouseEvent, useState } from 'react';
import { BoardsItemStyled, BoardsSectionHeaderStyled } from '../Boards.styled';

type Item = { id: number; name: string };
type Kind = 'dashboard' | 'report';

type SectionAction = { label: string; icon: IconProps['type']; testId: string; onClick: () => void };

type BoardsSectionProps = {
  kind: Kind;
  title: string;
  icon: IconProps['type'];
  items: Item[];
  actions: SectionAction[];
  onOpen: (item: Item) => void;
  onMenu: (event: MouseEvent, item: Item) => void;
};

export default function BoardsSection({
  kind,
  title,
  icon,
  items,
  actions,
  onOpen,
  onMenu
}: BoardsSectionProps): JSX.Element {
  const [open, setOpen] = useState(true);

  return (
    <Box data-testid='boards-section' data-kind={kind}>
      <BoardsSectionHeaderStyled role='button' aria-expanded={open} onClick={() => setOpen(!open)}>
        <CustomIcon type={open ? 'chevronDown' : 'chevronRight'} size='xs' />
        <Typography variant='caption' sx={{ flex: 1, fontWeight: 600 }}>
          {title} · {items.length}
        </Typography>
        {actions.map((action) => (
          <Tooltip key={action.testId} title={action.label}>
            <IconButton
              aria-label={action.label}
              data-testid={action.testId}
              onClick={(event) => {
                event.stopPropagation();
                action.onClick();
              }}
            >
              <CustomIcon type={action.icon} size='xs' />
            </IconButton>
          </Tooltip>
        ))}
      </BoardsSectionHeaderStyled>
      {open &&
        items.map((item) => (
          <BoardsItemStyled
            key={item.id}
            tabIndex={0}
            data-testid='boards-item'
            data-kind={kind}
            data-name={item.name}
            onClick={() => onOpen(item)}
            onKeyDown={(event) => event.key === 'Enter' && onOpen(item)}
            onContextMenu={(event) => onMenu(event, item)}
          >
            <CustomIcon type={icon} size='xs' />
            <Typography variant='body2' noWrap sx={{ flex: 1, minWidth: 0 }}>
              {item.name}
            </Typography>
          </BoardsItemStyled>
        ))}
    </Box>
  );
}