import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { Typography } from '@mui/material';
import type { JSX } from 'react';
import type { MenuPanelItemProps } from '../../types';
import { MenuPanelItemStyled } from './MenuPanelItem.styled';

export default function MenuPanelItem({ name, icon, selected, onClick }: MenuPanelItemProps): JSX.Element {
  return (
    <MenuPanelItemStyled
      selected={selected}
      onClick={(): void => onClick()}
      role='button'
      tabIndex={0}
      aria-current={selected ? 'page' : undefined}
      onKeyDown={(e): void => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <CustomIcon type={icon} size='s' />
      <Typography variant='subtitle2'>{name}</Typography>
    </MenuPanelItemStyled>
  );
}
