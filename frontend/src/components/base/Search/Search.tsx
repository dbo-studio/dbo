import locales from '@/locales';
import type { EventFor } from '@/types';
import { Box, InputAdornment, InputBase } from '@mui/material';
import { type JSX, useState } from 'react';
import CustomIcon from '../CustomIcon/CustomIcon';

type SearchProps = {
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function Search({ onChange, placeholder }: SearchProps): JSX.Element {
  const [value, setValue] = useState('');

  const onChangeHandler = (e: EventFor<'input', 'onChange'>): void => {
    setValue(e.target.value);
    onChange(e.target.value);
  };

  const handleClear = (): void => {
    setValue('');
    onChange('');
  };

  return (
    <Box>
      <InputBase
        size='small'
        value={value}
        onChange={onChangeHandler}
        fullWidth={true}
        placeholder={placeholder ?? locales.search}
        startAdornment={
          <InputAdornment position='start'>
            <CustomIcon type='search' size='xs' />
          </InputAdornment>
        }
        endAdornment={
          value.length > 0 && (
            <InputAdornment position='end' onClick={handleClear} sx={{ cursor: 'pointer' }}>
              <CustomIcon type='close' size='xs' />
            </InputAdornment>
          )
        }
      />
    </Box>
  );
}
