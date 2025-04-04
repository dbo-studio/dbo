import locales from '@/locales';
import type { EventFor } from '@/types';
import { Box, InputAdornment, InputBase } from '@mui/material';
import { type JSX, useState } from 'react';
import CustomIcon from '../CustomIcon/CustomIcon';

export default function Search({ onChange }: { onChange: (value: string) => void }): JSX.Element {
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
    <Box mt={1}>
      <InputBase
        size='small'
        value={value}
        onChange={onChangeHandler}
        fullWidth={true}
        placeholder={locales.search}
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
