import { FieldInputInputStyled } from '@/components/base/FieldInput/FieldInput.styled';
import { formatContextWindow, getModelCapabilities } from '@/core/ai/modelCapabilities';
import locales from '@/locales';
import type { AiProviderType } from '@/types';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { Autocomplete, Box, Chip, IconButton, Typography, createFilterOptions } from '@mui/material';
import type { JSX } from 'react';

type ModelPickerProps = {
  providerType: AiProviderType['type'];
  value: string;
  options: string[];
  /** Models the user saved; these show a remove button in the list. */
  removable?: string[];
  onRemove?: (model: string) => void;
  disabled?: boolean;
  error?: string;
  onChange: (model: string) => void;
};

const filter = createFilterOptions<string>();

/** Searchable model list that also accepts a model id the provider did not list. */
export default function ModelPicker({
  providerType,
  value,
  options,
  removable = [],
  onRemove,
  disabled,
  error,
  onChange
}: ModelPickerProps): JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Typography color='textText' variant='caption' sx={{ mb: '4px' }}>
        {locales.model}
      </Typography>
      <Autocomplete
        freeSolo
        selectOnFocus
        clearOnBlur
        handleHomeEndKeys
        disabled={disabled}
        value={value}
        options={options}
        filterOptions={(all, state) => {
          const filtered = filter(all, state);
          const typed = state.inputValue.trim();
          if (typed && !all.includes(typed)) {
            filtered.push(typed);
          }
          return filtered;
        }}
        getOptionLabel={(option) => option}
        onChange={(_, next) => onChange((next ?? '').trim())}
        renderOption={({ key, ...props }, option) => {
          const caps = getModelCapabilities(providerType, option);
          const custom = !options.includes(option);
          return (
            <li key={key} {...props} data-testid='ai-model-option'>
              <Typography variant='body2' noWrap sx={{ flex: 1 }}>
                {custom ? locales.ai_model_use_custom.replace('{{model}}', option) : option}
              </Typography>
              {!custom && removable.includes(option) && onRemove ? (
                <IconButton
                  aria-label={locales.ai_model_remove}
                  data-testid='ai-model-remove'
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(option);
                  }}
                >
                  <CustomIcon type='close' size='xs' />
                </IconButton>
              ) : null}
              {!custom && caps.tools ? (
                <Chip
                  variant='outlined'
                  label={
                    caps.contextWindow
                      ? `${locales.ai_tools_supported} · ${formatContextWindow(caps.contextWindow)}`
                      : locales.ai_tools_supported
                  }
                />
              ) : null}
            </li>
          );
        }}
        renderInput={(params) => (
          <FieldInputInputStyled
            ref={params.slotProps.input.ref}
            inputProps={{ ...params.slotProps.htmlInput, 'data-testid': 'ai-model-input' }}
            placeholder={locales.ai_model_search}
            error={!!error}
            fullWidth
          />
        )}
      />
      {error ? (
        <Typography color='error' variant='caption'>
          {error}
        </Typography>
      ) : null}
    </Box>
  );
}
