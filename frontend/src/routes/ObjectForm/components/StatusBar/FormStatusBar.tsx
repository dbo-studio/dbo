import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { Box, IconButton } from '@mui/material';
import type { JSX } from 'react';
import type { FormStatusBarProps } from '../../types';
import { FormStatusBarStyled } from './FormStatusBar.styled';

export default function FormStatusBar({
  onSave,
  onCancel,
  onAddRow,
  isArrayForm,
  disabled
}: FormStatusBarProps): JSX.Element {
  return (
    <FormStatusBarStyled>
      {isArrayForm && onAddRow && (
        <IconButton sx={{ marginRight: 2 }} disabled={disabled} onClick={onAddRow} data-testid='object-form-add-row'>
          <CustomIcon type='plus' size='s' />
        </IconButton>
      )}
      <Box>
        <IconButton disabled={disabled} onClick={onSave} data-testid='object-form-save'>
          <CustomIcon type='check' size='s' />
        </IconButton>
        <IconButton disabled={disabled} onClick={onCancel} data-testid='object-form-cancel'>
          <CustomIcon type='close' size='s' />
        </IconButton>
      </Box>
    </FormStatusBarStyled>
  );
}
