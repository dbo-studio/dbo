import { useUUID } from '@/hooks';
import { Divider, Typography } from '@mui/material';
import type { JSX } from 'react';
import BottomSheet from '../BottomSheet/BottomSheet';
import type { MenuType } from '../ContextMenu/types';
import CustomIcon from '../CustomIcon/CustomIcon';
import { ActionSheetItemStyled } from './ActionSheet.styled';
import type { ActionSheetProps } from './types';

const flatten = (menu: MenuType[]): MenuType[] => menu.flatMap((m) => (m.children ? flatten(m.children) : [m]));

export default function ActionSheet({ open, onClose, title, menu }: ActionSheetProps): JSX.Element {
  const items = flatten(menu);
  const uuids = useUUID(items.length);

  const handleClick = (item: MenuType): void => {
    onClose();
    item.action?.();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      {items.map((item, index) =>
        item.separator ? (
          <Divider key={uuids[index]} />
        ) : (
          <ActionSheetItemStyled
            key={uuids[index]}
            className={item.destructive ? 'destructive' : undefined}
            disabled={item.disabled}
            onClick={(): void => handleClick(item)}
          >
            {item.icon && <CustomIcon type={item.icon} size='s' />}
            <Typography>{item.name}</Typography>
          </ActionSheetItemStyled>
        )
      )}
    </BottomSheet>
  );
}
