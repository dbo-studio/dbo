import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { Typography } from '@mui/material';
import type { MenuPanelItemProps } from '../../types';
import { MenuPanelItemStyled } from './MenuPanelItem.styled';

export default function MenuPanelItem({ name, icon, selected, onClick }: MenuPanelItemProps) {
  return (
    <MenuPanelItemStyled selected={selected} onClick={() => onClick()}>
      <CustomIcon type={icon} />
      <Typography margin={'0 0 0 16px'} variant='body2'>
        {name}
      </Typography>
    </MenuPanelItemStyled>
  );
}
