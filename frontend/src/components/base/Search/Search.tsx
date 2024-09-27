import locales from '@/locales';
import type { EventFor } from '@/types';
import { Box, InputAdornment, InputBase } from '@mui/material';
import { useState } from 'react';
import CustomIcon from '../CustomIcon/CustomIcon';

export default function Search({ onChange }: { onChange: (value: string) => void }) {
  const [value, setValue] = useState('');

  const onChangeHandler = (e: EventFor<'input', 'onChange'>) => {
    setValue(e.target.value);
    onChange(e.target.value);
  };

  const handleClear = () => {
    setValue('');
    onChange('');
  };

  return (
    <Box mt={1}>
      <InputBase
        value={value}
        onChange={onChangeHandler}
        fullWidth={true}
        placeholder={locales.search}
        startAdornment={
          <InputAdornment position='start'>
            <CustomIcon type='search' height={12} width={12} />
          </InputAdornment>
        }
        endAdornment={
          value.length > 0 && (
            <InputAdornment position='end' onClick={handleClear} sx={{ cursor: 'pointer' }}>
              <CustomIcon type='close' height={12} width={12} />
            </InputAdornment>
          )
        }
      />
    </Box>
  );
}
