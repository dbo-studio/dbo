import locales from '@/locales';
import type { EventFor } from '@/types';
import { Box, InputAdornment, InputBase } from '@mui/material';
import { type JSX, type KeyboardEvent, type Ref, useState } from 'react';
import CustomIcon from '../CustomIcon/CustomIcon';

type SearchProps = {
  onChange: (value: string) => void;
  placeholder?: string;
  /** Controlled value; omit to let the field keep its own state. */
  value?: string;
  inputRef?: Ref<HTMLInputElement>;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
};

export default function Search({ onChange, placeholder, value, inputRef, onKeyDown }: SearchProps): JSX.Element {
  const [innerValue, setInnerValue] = useState('');
  const current = value ?? innerValue;

  const onChangeHandler = (e: EventFor<'input', 'onChange'>): void => {
    setInnerValue(e.target.value);
    onChange(e.target.value);
  };

  const handleClear = (): void => {
    setInnerValue('');
    onChange('');
  };

  return (
    <Box>
      <InputBase
        size='small'
        value={current}
        onChange={onChangeHandler}
        inputRef={inputRef}
        onKeyDown={onKeyDown}
        fullWidth={true}
        placeholder={placeholder ?? locales.search}
        startAdornment={
          <InputAdornment position='start'>
            <CustomIcon type='search' size='xs' />
          </InputAdornment>
        }
        endAdornment={
          current.length > 0 && (
            <InputAdornment position='end' onClick={handleClear} sx={{ cursor: 'pointer' }}>
              <CustomIcon type='close' size='xs' />
            </InputAdornment>
          )
        }
      />
    </Box>
  );
}
