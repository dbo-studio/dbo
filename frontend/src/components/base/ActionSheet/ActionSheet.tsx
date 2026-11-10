import { useUUID } from '@/hooks';
import { Typography, useTheme } from '@mui/material';
import type { JSX } from 'react';
import BottomSheet from '../BottomSheet/BottomSheet';
import type { MenuType } from '../ContextMenu/types';
import CustomIcon from '../CustomIcon/CustomIcon';
import { ActionSheetGroupStyled, ActionSheetItemStyled } from './ActionSheet.styled';
import type { ActionSheetProps } from './types';

const flatten = (menu: MenuType[]): MenuType[] => menu.flatMap((m) => (m.children ? flatten(m.children) : [m]));

/** Splits at separators so each group renders as its own card. */
const toGroups = (items: MenuType[]): MenuType[][] =>
  items.reduce<MenuType[][]>(
    (groups, item) => {
      if (item.separator) {
        return groups[groups.length - 1].length > 0 ? [...groups, []] : groups;
      }
      groups[groups.length - 1].push(item);
      return groups;
    },
    [[]]
  );

export default function ActionSheet({ open, onClose, title, menu }: ActionSheetProps): JSX.Element {
  const theme = useTheme();
  const groups = toGroups(flatten(menu)).filter((group) => group.length > 0);
  const uuids = useUUID(groups.reduce((count, group) => count + group.length + 1, 0));

  const handleClick = (item: MenuType): void => {
    onClose();
    item.action?.();
  };

  let key = 0;
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      {groups.map((group) => (
        <ActionSheetGroupStyled key={uuids[key++]}>
          {group.map((item) => (
            <ActionSheetItemStyled
              key={uuids[key++]}
              className={item.destructive ? 'destructive' : undefined}
              disabled={item.disabled}
              onClick={(): void => handleClick(item)}
            >
              {item.icon && (
                <CustomIcon type={item.icon} size='m' color={item.destructive ? theme.palette.error.main : undefined} />
              )}
              <Typography variant='body2'>{item.name}</Typography>
            </ActionSheetItemStyled>
          ))}
        </ActionSheetGroupStyled>
      ))}
    </BottomSheet>
  );
}
