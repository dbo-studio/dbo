import { Typography } from '@mui/material';
import { DatabaseItemProps } from '../types';
import { DatabaseItemStyled } from './SelectedDatabase.styled';

export default function DatabaseItem({ name, selected, onClick }: DatabaseItemProps) {
  return (
    <DatabaseItemStyled selected={selected} onClick={() => onClick()}>
      <Typography variant='subtitle2'>{name}</Typography>
    </DatabaseItemStyled>
  );
}
