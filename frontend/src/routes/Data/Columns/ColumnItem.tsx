import { Checkbox, Typography, useTheme } from '@mui/material';
import { ColumnItemStyled } from './ColumnItem.styled';
import type { ColumnItemProps } from './types';

export default function ColumnItem({ column, onClick }: ColumnItemProps) {
  const theme = useTheme();

  return (
    <ColumnItemStyled onClick={() => onClick(column)}>
      <Checkbox checked={column.isActive} style={{ padding: 0, marginRight: theme.spacing(1) }} size='small' />
      <Typography color={'textText'} variant='body2'>
        {column.name}
      </Typography>
    </ColumnItemStyled>
  );
}
