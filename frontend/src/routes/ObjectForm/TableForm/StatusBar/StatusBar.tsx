import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { Box, IconButton } from '@mui/material';
import type { JSX } from 'react';
import type { StatusBarProps } from '../../types';
import { StatusBarStyled } from './StatusBar.styled';

export default function StatusBar({ onSave, onCancel, onAdd, disabled }: StatusBarProps): JSX.Element {
  return (
    <StatusBarStyled>
      {onAdd && (
        <IconButton sx={{ marginRight: 2 }} disabled={disabled} onClick={onAdd}>
          <CustomIcon type='plus' size='s' />
        </IconButton>
      )}
      <Box>
        <IconButton disabled={disabled} onClick={onSave}>
          <CustomIcon type='check' size='s' />
        </IconButton>

        <IconButton disabled={disabled} onClick={onCancel}>
          <CustomIcon type='close' size='s' />
        </IconButton>
      </Box>
    </StatusBarStyled>
  );
}
