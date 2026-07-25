import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { Typography } from '@mui/material';
import type { JSX } from 'react';
import type { MenuPanelItemProps } from '../../types';
import { MenuPanelItemStyled } from './MenuPanelItem.styled';

export default function MenuPanelItem({ name, icon, selected, onClick }: MenuPanelItemProps): JSX.Element {
  return (
    <MenuPanelItemStyled selected={selected} onClick={(): void => onClick()}>
      <CustomIcon type={icon} />
      <Typography
        variant='subtitle2'
        sx={{
          margin: '0 0 0 16px'
        }}
      >
        {name}
      </Typography>
    </MenuPanelItemStyled>
  );
}
