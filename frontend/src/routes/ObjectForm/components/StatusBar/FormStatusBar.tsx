import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { Box, IconButton, Tooltip } from '@mui/material';
import type { JSX } from 'react';
import type { FormStatusBarProps } from '../../types';
import { FormStatusBarStyled } from './FormStatusBar.styled';

export default function FormStatusBar({
  onSave,
  onCancel,
  onAddRow,
  onAiSuggest,
  isArrayForm,
  disabled
}: FormStatusBarProps): JSX.Element {
  return (
    <FormStatusBarStyled>
      {isArrayForm && onAddRow && (
        <Tooltip title={locales.add_row}>
          <IconButton
            sx={{ marginRight: 2 }}
            aria-label={locales.add_row}
            disabled={disabled}
            onClick={onAddRow}
            data-testid='object-form-add-row'
          >
            <CustomIcon type='plus' size='s' />
          </IconButton>
        </Tooltip>
      )}
      <Box>
        <Tooltip title={locales.save}>
          <IconButton aria-label={locales.save} disabled={disabled} onClick={onSave} data-testid='object-form-save'>
            <CustomIcon type='check' size='s' />
          </IconButton>
        </Tooltip>
        <Tooltip title={locales.cancel}>
          <IconButton
            aria-label={locales.cancel}
            disabled={disabled}
            onClick={onCancel}
            data-testid='object-form-cancel'
          >
            <CustomIcon type='close' size='s' />
          </IconButton>
        </Tooltip>

        {onAiSuggest && (
          <Tooltip title={locales.ai_suggest_definition}>
            <IconButton
              aria-label={locales.ai_suggest_definition}
              disabled={disabled}
              onClick={onAiSuggest}
              data-testid='object-form-ai-suggest'
            >
              <CustomIcon type='sparkles' size='s' />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </FormStatusBarStyled>
  );
}
