import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { IconButton, Typography } from '@mui/material';
import type { DatabaseItemProps } from '../types';
import { DatabaseItemStyled } from './SelectedDatabase.styled';

export default function DatabaseItem({ name, selected, onClick, onDelete }: DatabaseItemProps) {
  return (
    <DatabaseItemStyled selected={selected} onClick={() => onClick()}>
      <Typography variant='subtitle2'>{name}</Typography>
      <IconButton onClick={() => onDelete()}>
        <CustomIcon type='delete' />
      </IconButton>
    </DatabaseItemStyled>
  );
}
