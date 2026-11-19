import { PASSWORD_MANAGER_OFF } from '@/components/base/FieldInput/FieldInput';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { SelectInputStyles } from '@/components/base/SelectInput/SelectInput.styled';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import { formatContextWindow, getModelCapabilities } from '@/core/ai/modelCapabilities';
import locales from '@/locales';
import type { AiProviderType } from '@/types';
import { Box, Typography, useTheme } from '@mui/material';
import type { JSX } from 'react';
import { components, type InputProps } from 'react-select';
import CreatableSelect from 'react-select/creatable';

type ModelPickerProps = {
  providerType: AiProviderType['type'];
  value: string;
  options: string[];
  /** Models the user saved; these show a remove button in the list. */
  removable?: string[];
  onRemove?: (model: string) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
  placeholder?: string;
  clearable?: boolean;
  inputTestId?: string;
  onChange: (model: string) => void;
};

const ModelSearchInput = (testId: string) =>
  function ModelSearchInputInner(props: InputProps<SelectInputOption, false>): JSX.Element {
    return <components.Input {...props} autoComplete='off' data-testid={testId} {...PASSWORD_MANAGER_OFF} />;
  };

function capabilityLabel(providerType: AiProviderType['type'], model: string): string | null {
  const caps = getModelCapabilities(providerType, model);
  if (!caps.tools) return null;
  return caps.contextWindow
    ? `${locales.ai_tools_supported} · ${formatContextWindow(caps.contextWindow)}`
    : locales.ai_tools_supported;
}

/** Searchable model list, same control as the rest of the app, that also accepts an unlisted model id. */
export default function ModelPicker({
  providerType,
  value,
  options,
  removable = [],
  onRemove,
  disabled,
  error,
  label = locales.model,
  placeholder = locales.ai_model_search,
  clearable = false,
  inputTestId = 'ai-model-input',
  onChange
}: ModelPickerProps): JSX.Element {
  const theme = useTheme();
  const selectOptions: SelectInputOption[] = options.map((model) => ({ value: model, label: model }));
  const selected = value ? (selectOptions.find((option) => option.value === value) ?? { value, label: value }) : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Typography color='textText' variant='caption' sx={{ mb: '4px' }}>
        {label}
      </Typography>
      <CreatableSelect
        placeholder={placeholder}
        isDisabled={disabled}
        isClearable={clearable}
        components={{ IndicatorSeparator: null, Input: ModelSearchInput(inputTestId) }}
        value={selected}
        options={selectOptions}
        menuPlacement='auto'
        menuPortalTarget={document.body}
        styles={SelectInputStyles(theme, !!error)}
        formatCreateLabel={(input) => locales.ai_model_use_custom.replace('{{model}}', input)}
        formatOptionLabel={(option, { context }) => {
          if (context !== 'menu' || option.__isNew__) return option.label;
          const model = typeof option.value === 'string' ? option.value : '';
          const meta = capabilityLabel(providerType, model);
          const canRemove = removable.includes(model) && onRemove;
          return (
            <Box data-testid='ai-model-option' sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              <Box component='span' sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {option.label}
              </Box>
              {canRemove ? (
                <Box
                  component='button'
                  type='button'
                  aria-label={locales.ai_model_remove}
                  data-testid='ai-model-remove'
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onRemove(model);
                  }}
                  sx={{
                    display: 'inline-flex',
                    p: 0,
                    border: 0,
                    bgcolor: 'transparent',
                    color: 'text.secondary',
                    cursor: 'pointer'
                  }}
                >
                  <CustomIcon type='close' size='xs' />
                </Box>
              ) : null}
              {meta ? (
                <Typography variant='caption' color='textSecondary' sx={{ flexShrink: 0 }}>
                  {meta}
                </Typography>
              ) : null}
            </Box>
          );
        }}
        onChange={(next) => {
          const picked = (next as SelectInputOption | null)?.value;
          onChange(typeof picked === 'string' ? picked.trim() : '');
        }}
        onCreateOption={(input) => onChange(input.trim())}
      />
      {error ? (
        <Typography color='error' variant='caption'>
          {error}
        </Typography>
      ) : null}
    </Box>
  );
}
