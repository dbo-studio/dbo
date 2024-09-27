import { Typography } from '@mui/material';
import { DesignTabItemStyled } from './DesignTab.styled';
import type { DesignTabItemProps } from './types';

export default function DesignTabItem({ tab, selected, onClick }: DesignTabItemProps) {
  return (
    <DesignTabItemStyled selected={selected}>
      <Typography variant='body2' onClick={() => onClick(tab)}>
        {tab.name}
      </Typography>
    </DesignTabItemStyled>
  );
}
